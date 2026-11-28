import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { fileToDataUrl, toNum } from '../lib/util'
import { usePhoto } from '../lib/sync'
import { NavLink, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { foodArt } from '../lib/art'
import { useStore } from '../store'
import { useLocation } from 'react-router-dom'
import { useUI } from '../ui-state'

const PATHS = {
  back: 'M15 18l-6-6 6-6',
  'arrow-left': 'M19 12H5|M11 6l-6 6 6 6',
  forward: 'M9 18l6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z|M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  bowl: 'M3 11h18a9 9 0 0 1-18 0z|M7 11c1-3 3-4 5-4s4 1 5 4',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z|M12 7v5l3 2',
  book: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z|M8 7h6',
  calendar: 'M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z|M3 10h18M8 3v4M16 3v4',
  bag: 'M5 8h14l-1.5 12h-11z|M9 8a3 3 0 0 1 6 0',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z|M12 9.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14z|M20 20l-4-4',
  barcode: 'M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  play: 'M7 5v14l12-7z',
  compass: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z|M15.5 8.5l-2 5-5 2 2-5z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1|M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  pause: 'M8 5v14M16 5v14',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12|M11 11.5v-7a1.5 1.5 0 0 1 3 0V12|M14 6.5a1.5 1.5 0 0 1 3 0V13|M8 13l-1.6-1.6a1.6 1.6 0 0 0-2.3 2.3L8 18c1.2 1.6 2.6 3 5 3h1a5 5 0 0 0 5-5v-6a1.5 1.5 0 0 0-3 0',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z|M5 11a7 7 0 0 0 14 0M12 18v3',
  trend: 'M3 17l6-6 4 4 8-8|M15 7h6v6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  share: 'M12 3v12|M8 7l4-4 4 4|M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
}
export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22, sw = 2, fill = false, className }: { name: IconName; size?: number; sw?: number; fill?: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].split('|').map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

/** A small speech bubble that points at what it explains. Put it inside a position: relative wrapper around the target. */
export function CoachTip({ id, when = true, place = 'below', align = 'end', children }: { id: string; when?: boolean; place?: 'above' | 'below'; align?: 'start' | 'center' | 'end'; children: ReactNode }) {
  const t = useT()
  const seen = useStore((s) => !s.profile || (s.profile.tips ?? []).includes(id))
  const seeTip = useStore((s) => s.seeTip)
  if (seen || !when) return null
  return (
    <button type="button" className={`coach ${place} ${align}`} onClick={() => seeTip(id)} role="status">
      <span>{children}</span>
      <span className="coach-ok">{t('gotIt')}</span>
    </button>
  )
}

export const AVATARS: { id: string; bg: string }[] = [
  { id: 'strawberry', bg: 'var(--cherry-soft)' },
  { id: 'avocado', bg: '#ECF1C8' },
  { id: 'lemon', bg: 'var(--butter-soft)' },
  { id: 'peach', bg: 'var(--peach-soft)' },
]

/** Her profile picture: the fruit she picked, or her initial. */
export function Avatar({ name, avatar, size = 48 }: { name: string; avatar?: string; size?: number }) {
  const a = AVATARS.find((x) => x.id === avatar)
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center', overflow: 'hidden', background: a?.bg ?? 'var(--cherry-soft)', color: 'var(--cherry)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.42 }}>
      {a ? <img src={`/avatars/${a.id}.png`} alt="" style={{ width: '82%', height: '82%', objectFit: 'contain', marginTop: '6%' }} /> : name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function BottomNav({ onLog }: { onLog: () => void }) {
  const t = useT()
  const path = useLocation().pathname
  const onToday = path === '/'
  // In shopping mode the middle button becomes the basket, so it isn't competing with logging food.
  const basketMode = useStore((s) => path === '/shopping' && !!s.shopping.shoppingMode)
  const basketCount = useUI((s) => s.basketCount)
  const setBasketOpen = useUI((s) => s.setBasketOpen)
  const noLogsYet = useStore((s) => s.logs.length === 0)
  const seeTip = useStore((s) => s.seeTip)
  const tab = (to: string, icon: IconName, label: string) => (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="nav-icon"><Icon name={icon} size={22} /></span>
      {label}
    </NavLink>
  )
  return (
    <nav className="nav" aria-label="Main">
      {tab('/', 'clock', t('navToday'))}
      {tab('/recipes', 'book', t('navRecipes'))}
      <span style={{ position: 'relative', marginTop: -30, display: 'flex' }}>
        {basketMode ? (
          <button id="basket-btn" className="fab" style={{ marginTop: 0, position: 'relative' }} aria-label={t('basketTitle')} onClick={() => setBasketOpen(true)}>
            <Icon name="bag" size={28} sw={2.25} />
            {basketCount > 0 && <span className="basket-count">{basketCount}</span>}
          </button>
        ) : (
          <button className="fab" style={{ marginTop: 0 }} aria-label={t('logFood')} onClick={() => { seeTip('log'); onLog() }}><Icon name="plus" size={28} sw={2.5} /></button>
        )}
        <CoachTip id="log" when={onToday && noLogsYet} place="above" align="center">{t('tipLog')}</CoachTip>
      </span>
      {tab('/plan', 'calendar', t('navPlan'))}
      {tab('/shopping', 'bag', t('navShopping'))}
    </nav>
  )
}

export function Sheet({ open, onClose, title, children, tall, onBack }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean; onBack?: () => void }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    // Freeze the page behind (iPhone ignores overflow: hidden on its own, so pin the body in place).
    const y = window.scrollY
    const b = document.body.style
    const prev = { position: b.position, top: b.top, width: b.width, overflow: b.overflow }
    Object.assign(b, { position: 'fixed', top: `-${y}px`, width: '100%', overflow: 'hidden' })
    return () => {
      window.removeEventListener('keydown', k)
      Object.assign(b, prev)
      window.scrollTo(0, y)
    }
  }, [open, onClose])
  // The phone keyboard covers the bottom of the screen without moving fixed things, so lift the
  // drawer above it (a single search result would otherwise sit behind the keyboard).
  const [kb, setKb] = useState({ lift: 0, room: 0 })
  useEffect(() => {
    const vv = window.visualViewport
    if (!open || !vv) return
    const fit = () => {
      const lift = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      setKb(lift > 80 ? { lift, room: vv.height } : { lift: 0, room: 0 })
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit) }
  }, [open])
  if (!open) return null
  const lifted = kb.lift > 0
  return (
    <div className="sheet-backdrop" onClick={onClose} style={lifted ? { paddingBottom: kb.lift } : undefined}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={{ ...(tall ? { height: '88dvh' } : {}), ...(lifted ? { maxHeight: kb.room - 12, ...(tall ? { height: kb.room - 12 } : {}), paddingBottom: 16 } : {}) }}>
        <div className="sheet-handle" />
        {title && <div className="between"><div className="row" style={{ gap: 2, minWidth: 0 }}>{onBack && <button className="icon-btn" style={{ marginLeft: -12, background: 'transparent' }} aria-label="Back" onClick={onBack}><Icon name="back" /></button>}<h2 className="heading">{title}</h2></div><button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" size={20} /></button></div>}
        {children}
      </div>
    </div>
  )
}

export function MacroBar({ label, value, target, color, isLimit, limitLabel }: { label: string; value: number; target: number; color: string; isLimit?: boolean; limitLabel?: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  let c = color
  if (isLimit) c = value > target ? 'var(--cherry)' : value > target * 0.85 ? 'var(--butter)' : 'var(--ink-muted)'
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="between label">
        <span>{label}{isLimit && <span className="muted" style={{ fontWeight: 500 }}> · {limitLabel}</span>}</span>
        <span className="muted" style={{ fontWeight: 400 }}><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{Math.round(value)}</b> / {Math.round(target)}g</span>
      </div>
      <div className="track"><span style={{ width: `${pct}%`, background: c }} /></div>
    </div>
  )
}

export function MacroGrid({ m, cols }: { m: { protein: number; carbs: number; fat: number; fibre: number; sugar?: number }; cols?: number }) {
  const t = useT()
  const items: [string, number, string][] = [[t('protein'), m.protein, 'var(--cherry)'], [t('carbs'), m.carbs, 'var(--butter)'], [t('fat'), m.fat, 'var(--olive)'], [t('fibre'), m.fibre, 'var(--lime)']]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols ?? items.length}, minmax(0, 1fr))`, gap: 8 }}>
      {items.map(([l, v, c]) => (
        <div key={l} className="stack" style={{ gap: 6 }}>
          <span style={{ height: 8, borderRadius: 999, background: c }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{Math.round(v)}g</span>
          <span className="caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

export function BackButton({ to }: { to?: string }) {
  const nav = useNavigate()
  const t = useT()
  return <button className="icon-btn" aria-label={t('back')} onClick={() => (to ? nav(to) : nav(-1))}><Icon name="back" /></button>
}


export function Thumb({ photo: src, size = 56, cat, name }: { photo?: string; size?: number; cat?: string; name?: string }) {
  const photo = usePhoto(src)
  return (
    <div className="thumb" aria-hidden="true" style={{ width: size, height: size, backgroundImage: photo ? `url(${photo})` : undefined }}>
      {!photo && <img src={foodArt(name, cat)} alt="" style={{ width: '78%', height: '78%', objectFit: 'contain' }} />}
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, step = 1, label }: { value: number; onChange: (n: number) => void; min?: number; step?: number; label: string }) {
  const r = (n: number) => Math.round(n * 100) / 100
  return (
    <div className="row" style={{ gap: 14 }}>
      <button className="icon-btn peach" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(r(Math.max(min, value - step)))}><Icon name="minus" size={20} /></button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--green)', minWidth: 44, textAlign: 'center' }} aria-live="polite">{r(value)}</span>
      <button className="icon-btn peach" aria-label={`${label} +`} onClick={() => onChange(r(value + step))}><Icon name="plus" size={20} /></button>
    </div>
  )
}

let toastFn: ((m: string, action?: ToastAction) => void) | null = null
export type ToastAction = { label: string; run: () => void }
export const toast = (m: string, action?: ToastAction) => toastFn?.(m, action)
export function ToastHost() {
  const [msg, setMsg] = useState<{ m: string; action?: ToastAction } | null>(null)
  useEffect(() => {
    let timer: number | undefined
    toastFn = (m, action) => { setMsg({ m, action }); window.clearTimeout(timer); timer = window.setTimeout(() => setMsg(null), action ? 6000 : 2600) }
    return () => { toastFn = null }
  }, [])
  if (!msg) return null
  return (
    <div className="toast" role="status" style={msg.action ? { display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto' } : undefined}>
      <span>{msg.m}</span>
      {msg.action && <button style={{ border: 'none', background: 'none', color: 'var(--lime)', fontWeight: 700, fontSize: 15, padding: '4px 2px' }} onClick={() => { msg.action!.run(); setMsg(null) }}>{msg.action.label}</button>}
    </div>
  )
}

/** A number box that keeps what's being typed ("62." or "62,5") instead of snapping it to a number mid-way. */
export function NumInput({ value, onChange, ...rest }: { value: number; onChange: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '')
  // Follow changes from outside (e.g. switching units), but not the echo of what's being typed.
  if ((Number.isFinite(value) ? value : NaN) !== toNum(text) && !(Number.isNaN(value) && Number.isNaN(toNum(text)))) setText(Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '')
  return <input type="text" inputMode="decimal" {...rest} value={text} onChange={(e) => { const v = e.target.value.replace(/[^\d.,]/g, ''); setText(v); onChange(toNum(v)) }} />
}

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <NumInput className="input" value={value} onChange={onChange} />
    </label>
  )
}

/** Opens the photo library / camera. Uses a real button so it works reliably on iPhone. */
export function PhotoButton({ onPhoto, className, style, children, label, max, disabled, multiple }: { onPhoto: (dataUrl: string) => void; className?: string; style?: React.CSSProperties; children: ReactNode; label: string; max?: number; disabled?: boolean; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} style={style} aria-label={label} disabled={disabled} onClick={() => ref.current?.click()}>{children}</button>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, multiple ? 12 : 1)
          e.target.value = ''
          for (const f of files) { try { onPhoto(await fileToDataUrl(f, max)) } catch { /* not a picture we can read */ } }
        }} />
    </>
  )
}
