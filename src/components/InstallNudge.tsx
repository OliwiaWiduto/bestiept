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
const isInApp = () => /instagram|fban|fbav|fb_iab|tiktok|bytedance|musical_ly|snapchat|line\/|pinterest|twitter|linkedinapp|gsa\//i.test(navigator.userAgent)
const isIosOtherBrowser = () => /crios|fxios|edgios|opios/i.test(navigator.userAgent)

/** Where she's opened the app, which decides what we tell her. */
type Where = 'ios-safari' | 'ios-other' | 'in-app' | 'installable' | 'none'

/** Small prompt to add the app to the home screen. Disappears once it's installed. */
export default function InstallNudge({ onAuth = false }: { onAuth?: boolean }) {
  const t = useT()
  const { pathname } = useLocation()
  const { pwaDismissedAt, dismissPwa } = useStore()
  const logTipShowing = useStore((s) => !!s.profile && s.logs.length === 0 && !(s.profile.tips ?? []).includes('log'))
  const [copied, setCopied] = useState(false)
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
  // On the sign-in screen it always shows (that's her first look); in the app, on Today, once the first-meal tip is out of the way.
  if (installed || snoozed) return null
  if (!onAuth && (pathname !== '/' || logTipShowing)) return null
  const where: Where = isInApp() ? 'in-app' : isIos() ? (isIosOtherBrowser() ? 'ios-other' : 'ios-safari') : deferred ? 'installable' : 'none'
  if (where === 'none') return null

  const copy = async () => {
    try { await navigator.clipboard.writeText(location.origin); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* clipboard blocked */ }
  }
  const [before, after] = t('pwaIos').split('{share}')
  const text = where === 'ios-safari' ? <>{before}<Icon name="share" size={15} className="inline-icon" />{after}</>
    : where === 'ios-other' ? t('pwaOpenSafari')
    : where === 'in-app' ? t(isIos() ? 'pwaInAppIos' : 'pwaInApp')
    : t('pwaOther')
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: onAuth ? 'calc(16px + env(safe-area-inset-bottom))' : 'calc(var(--nav-h) + 16px + env(safe-area-inset-bottom))', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 30,
      background: 'var(--green)', color: 'var(--on-green)', borderRadius: 18, padding: '10px 8px 10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 20px rgba(0,0,0,.15)', fontSize: 13, lineHeight: '18px', fontWeight: 500 }}>
      <img src="/icons/cat-fruitveg.png" alt="" width={28} height={28} style={{ width: 28, height: 28, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {text}
      </span>
      {(where === 'ios-other' || where === 'in-app') && (
        <button className="btn small" style={{ background: 'var(--lime)', color: 'var(--green)', height: 36, padding: '0 14px', flexShrink: 0 }} onClick={copy}>{copied ? t('copied') : t('copyLink')}</button>
      )}
      {where === 'installable' && deferred && (
        <button className="btn small" style={{ background: 'var(--lime)', color: 'var(--green)', height: 36, padding: '0 14px' }}
          onClick={async () => { await deferred.prompt(); setDeferred(null) }}>{t('install')}</button>
      )}
      <button aria-label={t('dismiss')} onClick={() => (onAuth ? setInstalled(true) : dismissPwa())} style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--on-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
