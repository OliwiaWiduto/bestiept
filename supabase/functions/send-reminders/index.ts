// Sends whatever reminders are due. Called every half hour by the schedule in supabase/push.sql (not by the app).
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { due, monday, usualSlot, type Kind, type Person } from './rules.ts'

const env = (k: string) => Deno.env.get(k) ?? ''
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
webpush.setVapidDetails('mailto:hello@bestiept.app', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))

type Sub = { endpoint: string; user_id: string; keys: { p256dh: string; auth: string }; tz: string; lang: string }

/** Her local date, half hour ("14:30") and weekday (0 = Sunday). */
function localNow(tz: string, now = new Date()) {
  let parts: Record<string, string>
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value]))
  } catch { return localNow('Europe/London', now) }
  const half = Number(parts.minute) < 30 ? '00' : '30'
  return { today: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}:${half}`, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday) }
}
const addDays = (k: string, n: number) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

Deno.serve(async (req) => {
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return new Response('no', { status: 401 })
  const { data: subs, error } = await db.from('push_subscriptions').select('endpoint, user_id, keys, tz, lang')
  if (error) return new Response(error.message, { status: 500 })
  const people = [...new Set((subs as Sub[]).map((s) => s.user_id))]
  if (!people.length) return Response.json({ sent: 0 })

  // Everything needed, for everyone at once (dates are wide enough for every time zone).
  const utcToday = new Date().toISOString().slice(0, 10)
  const from = addDays(utcToday, -22), to = addDays(utcToday, 9)
  const [links, profiles, logs, sent] = await Promise.all([
    db.from('links').select('id, requester, addressee').eq('status', 'accepted').eq('household', true).or(`requester.in.(${people.join(',')}),addressee.in.(${people.join(',')})`),
    db.from('profiles').select('id, data').in('id', people),
    db.from('log_entries').select('user_id, date, data').in('user_id', people).gte('date', addDays(utcToday, -15)),
    db.from('push_log').select('user_id, day, kind').in('user_id', people).gte('day', addDays(utcToday, -8)),
  ])
  const partnersOf = (u: string) => (links.data ?? []).flatMap((l) => (l.requester === u ? [l.addressee] : l.addressee === u ? [l.requester] : []))
  const planOwners = [...new Set([...people, ...people.flatMap(partnersOf)])]
  const [plans, lists] = await Promise.all([
    db.from('plan_items').select('user_id, date, data, updated_at').in('user_id', planOwners).gte('date', addDays(utcToday, -60)).lte('date', to),
    db.from('household_lists').select('link_id, data').in('link_id', (links.data ?? []).map((l) => l.id)),
  ])
  const recipeIds = [...new Set((plans.data ?? []).map((p) => p.data?.recipeId).filter(Boolean))]
  const recipes = recipeIds.length ? await db.from('recipes').select('id, data').in('id', recipeIds) : { data: [] }
  const titleOf = (id: string, lang: string) => {
    const r = (recipes.data ?? []).find((x) => x.id === id)?.data
    return r?.tr?.[lang]?.title || r?.title || ''
  }

  let sentCount = 0
  for (const user of people) {
    const mySubs = (subs as Sub[]).filter((s) => s.user_id === user)
    const tz = mySubs[0].tz
    const { today, hhmm, dow } = localNow(tz)
    const profile = (profiles.data ?? []).find((p) => p.id === user)?.data ?? {}
    const lang = (mySubs[0].lang === 'pl' || profile.lang === 'pl' ? 'pl' : 'en') as 'en' | 'pl'
    const myLogs = (logs.data ?? []).filter((l) => l.user_id === user)
    const household = (links.data ?? []).find((l) => l.requester === user || l.addressee === user)
    const shopping = (household && (lists.data ?? []).find((x) => x.link_id === household.id)?.data) || profile.shopping || {}
    const week = monday(today)
    const mine = [user, ...partnersOf(user)]
    const person: Person = {
      lang,
      logDates: myLogs.filter((l) => l.date <= today).map((l) => l.date),
      loggedToday: myLogs.filter((l) => l.date === today).map((l) => l.data?.meal),
      plan: (plans.data ?? []).filter((p) => mine.includes(p.user_id) && p.date >= from).map((p) => ({
        date: p.date, meal: p.data?.meal, recipeId: p.data?.recipeId, leftover: !!p.data?.leftoverOf, title: titleOf(p.data?.recipeId, lang),
      })),
      // Learned from when she added meals to her plan (older items: when they were last saved) and her shopping trips.
      planSlot: usualSlot((plans.data ?? []).filter((p) => p.user_id === user && !p.data?.leftoverOf).map((p) => p.data?.createdAt ?? Date.parse(p.updated_at)), tz, { dow: 0, hhmm: '18:00' }),
      shopSlot: usualSlot(profile.profile?.shopTimes ?? [], tz, { dow: 1, hhmm: '17:00' }),
      tickedThisWeek: Object.entries(shopping.ticked ?? {}).some(([k, v]) => v && k.startsWith(week + ':')),
      sentToday: (sent.data ?? []).filter((s) => s.user_id === user && s.day === today).map((s) => s.kind as Kind),
      sentThisWeek: (sent.data ?? []).filter((s) => s.user_id === user && s.day > addDays(today, -7)).map((s) => s.kind as Kind),
    }
    for (const m of due(person, today, hhmm, dow)) {
      // Claim it first so a retry can never send it twice.
      const { error: dup } = await db.from('push_log').insert({ user_id: user, day: today, kind: m.kind })
      if (dup) continue
      for (const s of mySubs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag }), { TTL: 3 * 3600 })
          sentCount++
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint) // phone unsubscribed
          else console.error('push failed', code, (e as Error).message)
        }
      }
    }
  }
  return Response.json({ sent: sentCount })
})
