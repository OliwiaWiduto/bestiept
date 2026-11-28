import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useT } from '../i18n'
import type { Ingredient } from '../types'
import { ingredientText, shortName, splitName, uid } from '../lib/util'
import { equipmentIcon } from '../lib/equipment'
import { recipeItems } from '../lib/matchFood'
import { today } from '../lib/dates'
import { defaultMeal } from '../ui-state'
import { Icon, PortionPicker, toast } from '../components/ui'

type Timer = { id: string; step: number; total: number; endsAt: number | null; left: number }

// Which ingredients a step uses. Matching whole words (allowing plurals and Polish endings) so
// "chicken" doesn't pull in chickpeas or chicken stock, and "add the butter" doesn't pull in peanut butter.
const FILL = new Set(['fresh', 'large', 'small', 'medium', 'finely', 'roughly', 'thinly', 'chopped', 'grated', 'sliced', 'diced', 'crushed', 'minced', 'peeled', 'ripe', 'whole', 'extra', 'virgin', 'boneless', 'skinless', 'tinned', 'canned', 'dried', 'frozen', 'good', 'quality', 'plus', 'more', 'for', 'and', 'the', 'świeży', 'świeża', 'świeże', 'duża', 'duży', 'mała', 'mały', 'drobno', 'posiekany', 'posiekana', 'starty', 'starta'])
// Words that only mean something with the word in front ("soy sauce", "chicken stock", "peanut butter")
const GENERIC = new Set(['sauce', 'oil', 'milk', 'butter', 'juice', 'stock', 'paste', 'powder', 'flakes', 'seeds', 'leaves', 'water', 'cream', 'sugar', 'vinegar', 'zest', 'sos', 'olej', 'mleko', 'masło', 'sok', 'bulion', 'pasta', 'cukier', 'ocet'])
const wordsOf = (txt: string) => txt.toLowerCase().split(/[^a-ząęółśżźćń]+/).filter(Boolean)
const same = (a: string, b: string) => {
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  return s.length >= 4 && l.startsWith(s.slice(0, Math.max(4, s.length - 1))) && l.length - s.length <= 3
}
const phraseOf = (name: string) => wordsOf(name.split(',')[0].split('(')[0]).filter((w) => w.length > 2 && !FILL.has(w))
const hasPhrase = (step: string[], phrase: string[]) => step.some((_, i) => phrase.every((w, j) => step[i + j] && same(step[i + j], w)))

function stepIngredients(step: string, ings: Ingredient[], before: string[] = []): Ingredient[] {
  const words = wordsOf(step)
  const low = step.toLowerCase()
  const has = (w: string) => words.some((x) => same(x, w))
  const heads = ings.map((i) => phraseOf(i.name).at(-1) ?? '')
  return ings.filter((ing, n) => {
    const phrase = phraseOf(ing.name)
    if (!phrase.length) return false
    if (hasPhrase(words, phrase)) return true
    const head = phrase[phrase.length - 1]
    if (phrase.length === 1) return has(head)
    if (GENERIC.has(head)) {
      // "Pour in the stock": only when it's the one stock in the recipe, it's named on its own ("the stock",
      // "…, stock"), and it wasn't already used by name earlier (then "the sauce" means the sauce you made).
      if (heads.filter((h) => same(h, head)).length !== 1) return false
      if (!new RegExp(`(?:\\b(?:the|your|some|and|with|i|oraz)\\s+|,\\s*|^)${head.slice(0, Math.max(4, head.length - 1))}`).test(low)) return false
      return !before.some((b) => hasPhrase(wordsOf(b), phrase))
    }
    // "Add the chicken" for "chicken thighs" (unless another chicken-something is named in this step)
    return has(head) || (phrase.length === 2 && !GENERIC.has(phrase[0]) && has(phrase[0]) && !ings.some((o, m) => m !== n && phraseOf(o.name)[0] === phrase[0] && hasPhrase(words, phraseOf(o.name))))
  })
}
function stepMinutes(step: string): number | null {
  const m = step.match(/(\d+)\s*(?:-|–|to|do)?\s*(\d+)?\s*(min|minute|minutes|mins|minut|minuty|hour|hours|godzin|godziny|godzinę)/i)
  if (!m) return null
  const n = Number(m[2] || m[1])
  return /^(hour|godzin)/i.test(m[3]) ? n * 60 : n
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s % 60))).padStart(2, '0')}`

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    ;[0, 0.35, 0.7].forEach((t0) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.25, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + 0.3)
      o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + 0.3)
    })
    navigator.vibrate?.([300, 150, 300])
  } catch { /* sound not available */ }
}

export default function Cooking() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const { saveLog, seeTip } = useStore()
  const recipes = useRecipes()
  const tips = useStore((st) => st.profile?.tips)
  const r = recipes.find((x) => x.id === id)
  const servings = Number(params.get('s')) || r?.servings || 1
  const factor = r ? servings / (r.servings || 1) : 1

  const [stage, setStage] = useState<'gather' | 'cook' | 'done'>('gather')
  const [step, setStep] = useState(0)
  const [gathered, setGathered] = useState<Record<string, boolean>>({})
  const [timers, setTimers] = useState<Timer[]>([])
  const [ate, setAte] = useState(1)
  const [cam, setCam] = useState<MediaStream | null>(null)
  const [camBusy, setCamBusy] = useState(false)
  const total = r?.steps.length ?? 0

  const next = useCallback(() => setStep((s) => { if (s >= total - 1) { setStage('done'); return s } return s + 1 }), [total])
  const forward = useCallback(() => setStep((s) => Math.min(total - 1, s + 1)), [total])
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])
  const moves = useRef({ forward, back })
  moves.current = { forward, back }

  // Keep the screen awake while cooking.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const req = async () => { try { lock = await navigator.wakeLock?.request('screen') } catch { /* not supported */ } }
    req()
    const vis = () => document.visibilityState === 'visible' && req()
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}) }
  }, [])

  // Timers tick.
  useEffect(() => {
    const h = window.setInterval(() => {
      setTimers((ts) => ts.map((tm) => {
        if (tm.endsAt === null) return tm
        const left = (tm.endsAt - Date.now()) / 1000
        if (left <= 0 && tm.left > 0) { beep(); toast(`${t('timeUp')} · ${t('stepN', { n: tm.step + 1 })}`) }
        return { ...tm, left: Math.max(0, left) }
      }))
    }, 500)
    return () => window.clearInterval(h)
  }, [t])

  const startTimer = (minutes: number) =>
    setTimers((ts) => [...ts.filter((x) => x.step !== step), { id: uid(), step, total: minutes * 60, endsAt: Date.now() + minutes * 60000, left: minutes * 60 }])

  // Hands-free: ask for the camera on the tap itself, so the phone shows its permission prompt.
  const toggleWave = async () => {
    if (cam) { cam.getTracks().forEach((tr) => tr.stop()); setCam(null); return }
    if (camBusy) return
    setCamBusy(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera')
      setCam(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 120 } }, audio: false }))
      seeTip('wave')
    } catch { toast(t('cameraNo')) }
    setCamBusy(false)
  }
  const camRef = useRef<MediaStream | null>(null)
  camRef.current = cam
  useEffect(() => () => camRef.current?.getTracks().forEach((tr) => tr.stop()), [])

  // Watch the front camera for a hand passing over the screen.
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!cam || stage !== 'cook' || !video) return
    video.srcObject = cam
    video.play().catch(() => {})
    let raf = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    canvas.width = 32; canvas.height = 24
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    let prev: Uint8ClampedArray | null = null
    let xs: number[] = []
    let cooldownUntil = 0
    let last = 0
    const loop = (now: number) => {
      if (stopped) return
      raf = requestAnimationFrame(loop)
      if (now - last < 80 || video.readyState < 2) return
      last = now
      ctx.drawImage(video, 0, 0, 32, 24)
      const px = ctx.getImageData(0, 0, 32, 24).data
      if (prev) {
        let moved = 0, sx = 0
        for (let i = 0; i < px.length; i += 4) {
          const d = Math.abs(px[i] - prev[i]) + Math.abs(px[i + 1] - prev[i + 1]) + Math.abs(px[i + 2] - prev[i + 2])
          if (d > 90) { moved++; sx += (i / 4) % 32 }
        }
        const frac = moved / (32 * 24)
        if (frac > 0.12) xs.push(sx / moved)
        else if (xs.length >= 2 && now > cooldownUntil) {
          // The raw front-camera picture isn't mirrored: a hand moving to your left moves right in it.
          const dx = xs[xs.length - 1] - xs[0]
          if (dx < -6) moves.current.back()
          else moves.current.forward()
          cooldownUntil = now + 1300
          xs = []
        } else xs = []
      }
      prev = px
    }
    raf = requestAnimationFrame(loop)
    return () => { stopped = true; cancelAnimationFrame(raf) }
  }, [cam, stage])

  const allIngs = useMemo(() => r?.ingredients ?? [], [r])
  if (!r) return <main className="cooking"><button className="icon-btn" onClick={() => nav('/recipes')}><Icon name="close" /></button><p style={{ marginTop: 24 }}>{t('notHere')}</p></main>

  const current = r.steps[step] ?? ''
  const needs = stepIngredients(current, allIngs, r.steps.slice(0, step))
  const mins = stepMinutes(current)
  const title = <span className="grow cook-title">{r.title}</span>
  const closeBtn = <button className="icon-btn" aria-label={t('leave')} onClick={() => nav(-1)}><Icon name="close" size={20} /></button>

  if (stage === 'gather')
    return (
      <main className="cooking">
        <div className="between" style={{ gap: 12 }}>{closeBtn}{title}<span style={{ width: 44, flex: 'none' }} /></div>
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="step-text" style={{ fontSize: 30, lineHeight: '34px' }}>{t('gather')}</h1>
          <span className="soft small">{t('gatherHint')}</span>
        </div>
        <div className="stack" style={{ gap: 0 }}>
          <span className="label soft" style={{ marginBottom: 4 }}>{t('food')}</span>
          {allIngs.map((i) => {
            const on = !!gathered[i.id]
            const { main, note } = splitName(i.name)
            return (
              <button key={i.id} className="gather-row" onClick={() => setGathered({ ...gathered, [i.id]: !on })} aria-pressed={on}>
                <span className="check" style={{ background: on ? 'var(--lime)' : 'transparent', borderColor: on ? 'var(--lime)' : 'var(--green-edge)', color: 'var(--green)' }}>{on && <Icon name="check" size={16} sw={2.5} />}</span>
                <span className="grow stack" style={{ gap: 0, minWidth: 0, opacity: on ? 0.55 : 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 16, textDecoration: on ? 'line-through' : 'none' }}>{main}</span>
                  {note && <span className="soft" style={{ fontSize: 13, lineHeight: '18px' }}>{note}</span>}
                </span>
                <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', flex: 'none', color: 'var(--lime)', opacity: on ? 0.55 : 1 }}>{ingredientText(i, factor)}</span>
              </button>
            )
          })}
        </div>
        {r.equipment.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="label soft">{t('equipment')}</span>
            <div className="equip-grid">
              {r.equipment.map((e) => <span key={e} className="equip"><img src={equipmentIcon(e)} alt="" /><span>{e}</span></span>)}
            </div>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div className="cook-drawer">
          <button className="btn primary block" onClick={() => { setStage('cook'); window.scrollTo(0, 0) }}>{t('letsCook')}</button>
        </div>
      </main>
    )

  if (stage === 'done')
    return (
      <main className="cooking" style={{ justifyContent: 'center', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div className="stack" style={{ gap: 20, alignItems: 'center', textAlign: 'center' }}>
          <img src="/icons/cat-fruitveg.png" alt="" style={{ width: 96, height: 96 }} />
          <h1 className="step-text">{t('cookedTitle')}</h1>
          <div style={{ width: '100%', textAlign: 'left' }}><PortionPicker dark value={ate} onChange={setAte} kcal={r.nutrition.kcal * ate} label={t('portionQ')} /></div>
        </div>
        <div className="stack" style={{ marginTop: 32 }}>
          <button className="btn primary block" onClick={async () => {
            const original = useStore.getState().recipes.find((x) => x.id === r.id) ?? r
            const items = await recipeItems(original, ate, t.lang)
            saveLog({ id: uid(), date: today(), meal: new Date().getHours() < 11 ? 'breakfast' : defaultMeal(), name: r.title, photo: r.photo, recipeId: r.id, createdAt: Date.now(), items })
            nav('/')
          }}>{t('logIt')}</button>
          <button className="btn block" style={{ background: 'transparent', color: 'var(--on-green)', border: '2px solid var(--green-edge)' }} onClick={() => nav(`/recipes/${r.id}`)}>{t('notNow')}</button>
        </div>
      </main>
    )

  // Tap the sides of the screen to move, like stories.
  const tapSide = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, .cook-drawer')) return
    if (!(tips ?? []).includes('cookTap')) seeTip('cookTap')
    if (e.clientX < window.innerWidth * 0.3) back()
    else forward()
  }
  const showHint = step === 0 && !(tips ?? []).includes('cookTap')
  const mine = timers.find((x) => x.step === step)
  const others = timers.filter((x) => x.step !== step)
  const size = current.length > 260 ? 20 : current.length > 170 ? 24 : current.length > 100 ? 28 : 32

  const timerRow = (tm: Timer, label?: string) => (
    <div key={tm.id} className={`cook-timer${tm.left === 0 ? ' up' : ''}`} role="timer" aria-label={label ?? t('timer')}>
      <Icon name="clock" size={18} />
      <span className="cook-time">{tm.left === 0 ? t('timeUp') : mmss(tm.left)}</span>
      {label && <span className="small soft grow">{label}</span>}
      {!label && <span className="grow" />}
      {tm.left > 0 && <button className="icon-btn" aria-label={tm.endsAt ? t('pause') : t('resume')}
        onClick={() => setTimers(timers.map((x) => x.id === tm.id ? { ...x, endsAt: x.endsAt ? null : Date.now() + x.left * 1000 } : x))}><Icon name={tm.endsAt ? 'pause' : 'play'} size={16} fill={!tm.endsAt} /></button>}
      <button className="icon-btn" aria-label={t('remove')} onClick={() => setTimers(timers.filter((x) => x.id !== tm.id))}><Icon name="close" size={16} /></button>
    </div>
  )

  return (
    <main className="cooking" onClick={tapSide}>
      <div className="between" style={{ gap: 12 }}>
        {closeBtn}
        {title}
        <button className="wave-pill" onClick={toggleWave} aria-pressed={!!cam} disabled={camBusy}>
          <video ref={videoRef} playsInline muted aria-hidden="true" style={cam ? undefined : { width: 1, height: 1, opacity: 0, position: 'absolute' }} />
          {!cam && <Icon name="hand" size={16} sw={1.75} />}
          {cam ? t('waveOnLabel') : t('handsFree')}
        </button>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <span className="small soft" style={{ fontWeight: 600 }}>{t('stepOf', { n: step + 1, t: total })}</span>
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`, gap: 4 }}>
          {r.steps.map((_, i) => <span key={i} style={{ height: 5, borderRadius: 999, background: i < step ? 'var(--on-green)' : i === step ? 'var(--lime)' : 'var(--green-edge)' }} />)}
        </div>
      </div>

      <p className="step-text" style={{ fontSize: size, lineHeight: `${size + 6}px` }} aria-live="polite">{current}</p>

      {needs.length > 0 && (
        <div className="needs" aria-label={t('youllNeed')}>
          {needs.map((i) => <span key={i.id} className="need"><b>{shortName(i.name)}</b>{ingredientText(i, factor) && <span>{ingredientText(i, factor)}</span>}</span>)}
        </div>
      )}

      {showHint && <p className="cook-hint">{t('cookTapHint')} {!cam && t('waveTip')}</p>}

      <div style={{ flex: 1 }} />

      <div className="cook-drawer">
        {others.map((tm) => timerRow(tm, t('stepN', { n: tm.step + 1 })))}
        {mine ? timerRow(mine) : mins ? (
          <div className="cook-timer">
            <Icon name="clock" size={18} />
            <span className="cook-time">{mmss(mins * 60)}</span>
            <span className="grow" />
            <button className="cook-start" onClick={() => startTimer(mins)}><Icon name="play" size={14} fill />{t('startTimer')}</button>
          </div>
        ) : null}
        <div className="row" style={{ width: '100%', gap: 10 }}>
          <button className="btn" style={{ flex: 1, background: 'transparent', color: 'var(--on-green)', border: '2px solid var(--green-edge)' }} disabled={step === 0} onClick={back}>{t('back')}</button>
          <button className="btn primary" style={{ flex: 2 }} onClick={() => { if (showHint) seeTip('cookTap'); next() }}>{step === total - 1 ? t('finish') : t('nextStep')}</button>
        </div>
      </div>
    </main>
  )
}
