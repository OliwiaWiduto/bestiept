import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Icon } from './ui'

type InstallEvent = Event & { prompt: () => Promise<void> }
const SHOW_AGAIN_AFTER = 3 * 24 * 60 * 60 * 1000

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Small prompt to add the app to the home screen. Disappears once it's installed. */
export default function InstallNudge() {
  const t = useT()
  const { pathname } = useLocation()
  const { pwaDismissedAt, dismissPwa } = useStore()
  const [installed, setInstalled] = useState(isInstalled)
  const [deferred, setDeferred] = useState<InstallEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setInstalled(isInstalled())
    mq.addEventListener?.('change', onChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener?.('change', onChange)
    }
  }, [])

  const snoozed = pwaDismissedAt !== null && Date.now() - pwaDismissedAt < SHOW_AGAIN_AFTER
  if (installed || snoozed || pathname !== '/') return null
  if (!isIos() && !deferred) return null

  const [before, after] = t('pwaIos').split('{share}')
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(var(--nav-h) + 16px + env(safe-area-inset-bottom))', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 30,
      background: 'var(--green)', color: 'var(--on-green)', borderRadius: 18, padding: '10px 8px 10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 20px rgba(0,0,0,.15)', fontSize: 13, lineHeight: '18px', fontWeight: 500 }}>
      <img src="/icons/cat-fruitveg.png" alt="" width={28} height={28} style={{ width: 28, height: 28, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {isIos() ? <>{before}<Icon name="share" size={15} className="inline-icon" />{after}</> : t('pwaOther')}
      </span>
      {!isIos() && deferred && (
        <button className="btn small" style={{ background: 'var(--lime)', color: 'var(--green)', height: 36, padding: '0 14px' }}
          onClick={async () => { await deferred.prompt(); setDeferred(null) }}>{t('install')}</button>
      )}
      <button aria-label={t('dismiss')} onClick={dismissPwa} style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--on-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
