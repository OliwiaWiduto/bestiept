// Which reminders are due for one person right now. Pure (no database), so it can be tested on its own.
// Times are her local time; the sender runs at :00 and :30.

export type Kind = 'plan' | 'dinnerTonight' | 'shop' | 'lunch' | 'dinnerLog' | 'comeback'
export type Person = {
  lang: 'en' | 'pl'
  logDates: string[]                         // YYYY-MM-DD of every logged meal in the last 14 days (repeats fine)
  loggedToday: string[]                      // meals logged today: breakfast | lunch | dinner | snack
  plan: { date: string; meal: string; title: string; recipeId: string; leftover: boolean }[] // own + household, around this week
  tickedThisWeek: boolean                    // anything ticked on the shopping list this week
  planSlot: Slot                             // when she usually plans (learned), or the default
  shopSlot: Slot                             // when she usually shops (learned), or the default
  sentToday: Kind[]
  sentThisWeek: Kind[]                       // last 7 days
}
export type Slot = { dow: number; hhmm: string; learned: boolean }
export type Message = { kind: Kind; title: string; body: string; url: string; tag: string }

const COPY = {
  en: {
    plan: ['Ready to plan your week?', 'Pick a few favourites and your shopping list builds itself.'],
    dinnerTonight: ['Tonight: {title}', 'Tap to see the recipe.'],
    shop: ['Have you done your shopping yet?', '{n} {meals} waiting on your list.'],
    lunch: ['What did you have for lunch?', 'Log it now while you remember.'],
    dinnerLog: ['Log your dinner', 'Finish your day and see how it adds up.'],
    comeback: ['We’ve missed you', 'Log one meal today to get back into the swing of it. No pressure.'],
  },
  pl: {
    plan: ['Zaplanujesz swój tydzień?', 'Wybierz kilka ulubionych dań, a lista zakupów zrobi się sama.'],
    dinnerTonight: ['Dziś na kolację: {title}', 'Dotknij, żeby zobaczyć przepis.'],
    shop: ['Zrobiłaś już zakupy?', 'Lista na zaplanowane posiłki ({n}) czeka.'],
    lunch: ['Co zjadłaś na lunch?', 'Zapisz teraz, póki pamiętasz.'],
    dinnerLog: ['Zapisz kolację', 'Domknij dzień i zobacz, jak wyszło.'],
    comeback: ['Brakowało nam Ciebie', 'Zapisz dziś jeden posiłek i wracamy do rytmu. Bez presji.'],
  },
} as const

/**
 * When she usually does something, from the times she did it (ms): group times less than 2 hours apart into one
 * session, take her most common weekday, and the typical half hour on that day (kept between 9:00 and 20:30).
 * Needs 2 sessions on that weekday to count as learned; until then, the fallback.
 */
export function usualSlot(times: number[], tz: string, fallback: { dow: number; hhmm: string }): Slot {
  const sorted = [...times].filter(Number.isFinite).sort((a, b) => a - b)
  const starts = sorted.filter((t, i) => i === 0 || t - sorted[i - 1] > 2 * 3600_000).slice(-10)
  const local = starts.map((t) => {
    let parts: Record<string, string>
    try { parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)).map((p) => [p.type, p.value])) }
    catch { parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)).map((p) => [p.type, p.value])) }
    return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), mins: Number(parts.hour) * 60 + Number(parts.minute) }
  })
  const count = new Map<number, number>()
  for (const l of local) count.set(l.dow, (count.get(l.dow) ?? 0) + 1)
  const best = [...count.entries()].sort((a, b) => b[1] - a[1] || local.findLastIndex((l) => l.dow === b[0]) - local.findLastIndex((l) => l.dow === a[0]))[0]
  if (!best || best[1] < 2) return { ...fallback, learned: false }
  const mins = local.filter((l) => l.dow === best[0]).map((l) => l.mins).sort((a, b) => a - b)
  const mid = Math.min(20 * 60 + 30, Math.max(9 * 60, Math.floor(mins[Math.floor(mins.length / 2)] / 30) * 30))
  return { dow: best[0], hhmm: `${String(Math.floor(mid / 60)).padStart(2, '0')}:${mid % 60 ? '30' : '00'}`, learned: true }
}

const addDays = (k: string, n: number) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
/** Monday of the week (the plan's weeks run Monday to Sunday). */
export const monday = (k: string) => { const d = new Date(k + 'T12:00:00Z'); return addDays(k, -((d.getUTCDay() + 6) % 7)) }

/** today: her local date. hhmm: her local time as "14:30" (the half hour we're on). dow: 0 = Sunday. */
export function due(p: Person, today: string, hhmm: string, dow: number): Message[] {
  if (p.sentToday.length >= 2) return []
  const days = new Set(p.logDates)
  const logger = [...Array(7)].filter((_, i) => days.has(addDays(today, -i))).length >= 2
  const recentPlan = p.plan.some((x) => x.date >= addDays(today, -21))
  const planner = recentPlan
  const active = logger || planner || [...days].length > 0
  const week = monday(today)
  const out: Message[] = []
  const say = (kind: Kind, url: string, vars: Record<string, string | number> = {}) => {
    if (p.sentToday.includes(kind)) return
    const [t, b] = COPY[p.lang][kind]
    const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
    out.push({ kind, title: fill(t), body: fill(b), url, tag: kind })
  }

  // Planning: at the time she usually plans (learned; until then Sunday 6pm), if the week she's planning for has fewer
  // than 3 meals. Planners, and anyone not using the app lately (not loggers who don't plan).
  if (dow === p.planSlot.dow && hhmm === p.planSlot.hhmm && (planner || !active)) {
    // Planning on a Monday is for this week; any other day, for the week starting next Monday.
    const target = dow === 1 ? week : monday(addDays(today, 7))
    const planned = p.plan.filter((x) => x.date >= target && x.date <= addDays(target, 6)).length
    if (planned < 3) say('plan', '/plan')
  }
  // Tonight's dinner (planners): what's planned, a tap away.
  if (hhmm === '16:30') {
    const dinner = p.plan.find((x) => x.date === today && x.meal === 'dinner')
    if (dinner) say('dinnerTonight', `/recipes/${encodeURIComponent(dinner.recipeId)}`, { title: dinner.title })
  }
  // Shopping: at the time she usually shops (learned; until then Monday 5pm), if the week has meals planned and nothing
  // is ticked yet; once more the next day at the same time if it's still untouched.
  const usualShop = dow === p.shopSlot.dow, dayAfter = dow === (p.shopSlot.dow + 1) % 7 && p.sentThisWeek.includes('shop')
  if (hhmm === p.shopSlot.hhmm && (usualShop || dayAfter) && !p.tickedThisWeek) {
    const meals = p.plan.filter((x) => !x.leftover && x.date >= today && x.date <= addDays(week, 6)).length
    if (meals > 0) say('shop', '/shopping', { n: meals, meals: meals === 1 ? 'meal' : 'meals' })
  }
  const lapsed = !days.has(today) && !days.has(addDays(today, -1))
  if (logger) {
    // Lunch: only while she's in the habit (logged yesterday); after a gap she gets the gentler "missed you" instead.
    if (hhmm === '14:30' && p.loggedToday.length === 0 && days.has(addDays(today, -1))) say('lunch', '/')
    if (hhmm === '20:30' && p.loggedToday.length > 0 && !p.loggedToday.includes('dinner')) say('dinnerLog', '/')
  }
  // Coming back: she logged on 2+ days in the last fortnight but not yesterday or today. Once a week at most.
  if (hhmm === '19:00' && lapsed && [...days].filter((d) => d >= addDays(today, -14)).length >= 2 && !p.sentThisWeek.includes('comeback')) say('comeback', '/')

  return out.slice(0, 2 - p.sentToday.length)
}
