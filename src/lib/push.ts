/**
 * Reminders (web push). The phone gives us an address to send to; we keep it in push_subscriptions with her time zone,
 * and the send-reminders function (Supabase, every hour) decides what to send. See supabase/push.sql.
 * On iPhone this only works in the app opened from the home screen (iOS 16.4+).
 */
import { supabase } from './supabase'
import { isInstalled, isIos } from './install'

// Public half of the sending key (safe to ship). The private half is a Supabase secret.
const VAPID_PUBLIC = 'BBJqm-NjzSiMICMhgWQ0JhLDQZBkyRkdqfJac94BAP0uEbvfa6HwhaoBrPEzrRDWijzeLQ6zl8vSM_clyySVMkE'

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
/** iPhone in Safari (not the home-screen app): reminders need the app on the home screen first. */
export const needsInstallForPush = () => isIos() && !isInstalled()
export const pushPermission = (): NotificationPermission | 'unsupported' => (pushSupported() ? Notification.permission : 'unsupported')

const keyBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function current(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Is this phone signed up for reminders? */
export async function remindersOn(): Promise<boolean> {
  return pushPermission() === 'granted' && !!(await current())
}

/** Must be called straight from a tap (phones only show the permission question then). */
export async function turnOnReminders(lang: string): Promise<'on' | 'denied' | 'unsupported' | 'failed'> {
  if (!pushSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) }))
    await save(sub, lang)
    return 'on'
  } catch (e) {
    console.error(e)
    return 'failed'
  }
}

async function save(sub: PushSubscription, lang: string) {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const j = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint, user_id: data.user.id, keys: j.keys, lang,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London', updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

/** Keep her time zone and language up to date (e.g. after travelling), once the app opens. */
export async function refreshReminders(lang: string) {
  try { const sub = pushPermission() === 'granted' ? await current() : null; if (sub) await save(sub, lang) } catch { /* not set up yet */ }
}

export async function turnOffReminders() {
  const sub = await current()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
