import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Icon, toast } from './ui'
import { needsInstallForPush, pushPermission, pushSupported, remindersOn, turnOffReminders, turnOnReminders } from '../lib/push'

/** On Today, once: offer reminders (plan, shop, log). "Not now" hides it for good; Settings can still turn them on. */
export function RemindersCard() {
  const t = useT()
  const { profile, updateProfile } = useStore()
  const [busy, setBusy] = useState(false)
  if (!profile || profile.remindersAsked || !pushSupported() || needsInstallForPush() || pushPermission() !== 'default') return null
  const done = () => updateProfile({ ...profile, remindersAsked: true }, false)
  return (
    <section className="card stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <span className="icon-btn" style={{ background: 'var(--cherry-soft)', color: 'var(--cherry)', flex: 'none' }}><Icon name="sparkle" size={20} /></span>
        <span className="stack" style={{ gap: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{t('remindTitle')}</span>
          <span className="small muted">{t('remindBody')}</span>
        </span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary small" disabled={busy} onClick={async () => {
          setBusy(true)
          const r = await turnOnReminders(t.lang)
          setBusy(false); done()
          toast(r === 'on' ? t('remindOn') : r === 'denied' ? t('remindDenied') : t('remindFailed'))
        }}>{t('remindTurnOn')}</button>
        <button className="btn ghost small" onClick={done}>{t('notNow')}</button>
      </div>
    </section>
  )
}

/** Settings: reminders on or off for this phone. */
export function RemindersSetting() {
  const t = useT()
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => { remindersOn().then(setOn) }, [])
  const hint = !pushSupported() ? t('remindUnsupported') : needsInstallForPush() ? t('remindInstall') : pushPermission() === 'denied' ? t('remindBlocked') : t('remindHint')
  const can = pushSupported() && !needsInstallForPush() && pushPermission() !== 'denied'
  return (
    <section className="card stack" style={{ gap: 8 }}>
      <button className="switch-row" role="switch" aria-checked={!!on} disabled={!can || on === null} onClick={async () => {
        if (on) { await turnOffReminders(); setOn(false); return }
        const r = await turnOnReminders(t.lang)
        setOn(r === 'on')
        if (r !== 'on') toast(r === 'denied' ? t('remindDenied') : t('remindFailed'))
      }}>
        <span className="grow stack" style={{ gap: 0 }}><h2 className="heading">{t('reminders')}</h2><span className="small muted">{hint}</span></span>
        <span className="switch" aria-hidden><span /></span>
      </button>
    </section>
  )
}
