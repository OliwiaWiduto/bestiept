import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Ingredient } from '../types'
import { ingredientText, uid } from '../lib/util'
import { today } from '../lib/dates'
import { defaultMeal } from '../ui-state'
import { Icon, Stepper, toast } from '../components/ui'

type Timer = { id: string; label: string; total: number; endsAt: number | null; left: number }

/** Main word of an ingredient, used to find it in a step ("2 garlic cloves, crushed" → "garlic"). */
function keyWords(name: string): string[] {
  return name.toLowerCase().split(',')[0].split(/\s+/).map((w) => w.replace(/[^a-ząęółśżźćń]/g, '')).filter((w) => w.length > 3 && !['fresh', 'large', 'small', 'finely', 'chopped', 'grated', 'sliced', 'świeży', 'duża', 'mała'].includes(w))
}
function stepIngredients(step: string, ings: Ingredient[]): Ingredient[] {
  const s = step.toLowerCase()
  return ings.filter((i) => keyWords(i.name).some((w) => s.includes(w.slice(0, Math.max(4, w.length - 2)))))
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
  const { recipes, saveLog } = useStore()
  const r = recipes.find((x) => x.id === id)
  const servings = Number(params.get('s')) || r?.servings || 1
  const factor = r ? servings / (r.servings || 1) : 1

  const [stage, setStage] = useState<'gather' | 'cook' | 'done'>('gather')
  const [step, setStep] = useState(0)
  const [gathered, setGathered] = useState<Record<string, boolean>>({})
  const [timers, setTimers] = useState<Timer[]>([])
  const [ate, setAte] = useState(1)
  const [voiceOn, setVoiceOn] = useState(false)
  const [waveOn, setWaveOn] = useState(false)
  const total = r?.steps.length ?? 0

  const next = useCallback(() => setStep((s) => { if (s >= total - 1) { setStage('done'); return s } return s + 1 }), [total])
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])
  const stepRef = useRef({ next, back, step, stage })
  stepRef.current = { next, back, step, stage }

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
        if (left <= 0 && tm.left > 0) { beep(); toast(`${t('timerDone')}: ${tm.label}`) }
        return { ...tm, left: Math.max(0, left) }
      }))
    }, 500)
    return () => window.clearInterval(h)
  }, [t])

  const startTimer = useCallback((minutes: number, label: string) => {
    setTimers((ts) => [...ts, { id: uid(), label, total: minutes * 60, endsAt: Date.now() + minutes * 60000, left: minutes * 60 }])
  }, [])

  // Voice commands ("next", "back", "repeat", "timer" / "dalej", "wstecz", "powtórz", "minutnik").
  useEffect(() => {
    if (!voiceOn || stage !== 'cook') return
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
    if (!SR) { toast(t('voiceNo')); setVoiceOn(false); return }
    const rec = new SR()
    let alive = true
    rec.lang = t.lang === 'pl' ? 'pl-PL' : 'en-GB'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      const said = e.results[e.results.length - 1][0].transcript.toLowerCase()
      const { next, back, step } = stepRef.current
      if (/\b(next|dalej|następny)\b/.test(said)) next()
      else if (/\b(back|previous|wstecz|cofnij|poprzedni)\b/.test(said)) back()
      else if (/\b(repeat|again|powtórz)\b/.test(said)) speak(r?.steps[step] ?? '', t.lang)
      else if (/\b(timer|minutnik)\b/.test(said)) { const m = stepMinutes(r?.steps[step] ?? ''); if (m) startTimer(m, t('stepOf', { n: step + 1, t: total })) }
    }
    rec.onend = () => { if (alive) { try { rec.start() } catch { /* already started */ } } }
    rec.onerror = () => {}
    try { rec.start() } catch { /* ignore */ }
    return () => { alive = false; try { rec.stop() } catch { /* ignore */ } }
  }, [voiceOn, stage, t, r, startTimer, total])

  // Hand wave: watch the front camera for a hand passing over the screen.
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!waveOn || stage !== 'cook') return
    let stream: MediaStream | null = null
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
      if (now - last < 80 || !videoRef.current || videoRef.current.readyState < 2) return
      last = now
      ctx.drawImage(videoRef.current, 0, 0, 32, 24)
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
          // Raw front-camera image isn't mirrored: a hand moving to your left moves right in the image.
          const dx = xs[xs.length - 1] - xs[0]
          if (dx < -6) stepRef.current.back()
          else stepRef.current.next()
          cooldownUntil = now + 1300
          xs = []
        } else if (frac <= 0.12) xs = []
      }
      prev = px
    }
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: 160, height: 120 }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((tr) => tr.stop()); return }
        stream = s
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}) }
        raf = requestAnimationFrame(loop)
      })
      .catch(() => { toast(t('cameraNo')); setWaveOn(false) })
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((tr) => tr.stop()) }
  }, [waveOn, stage, t])

  const allIngs = useMemo(() => r?.ingredients ?? [], [r])
  if (!r) return <main className="cooking"><button className="icon-btn" onClick={() => nav('/recipes')}><Icon name="close" /></button></main>

  const current = r.steps[step] ?? ''
  const needs = stepIngredients(current, allIngs)
  const mins = stepMinutes(current)
  const header = (
    <div className="between">
      <button className="icon-btn" aria-label={t('leave')} onClick={() => nav(-1)}><Icon name="close" size={20} /></button>
      <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }} className="grow">{r.title}</span>
      <span style={{ width: 44 }} />
    </div>
  )

  if (stage === 'gather')
    return (
      <main className="cooking">
        {header}
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="step-text" style={{ fontSize: 32 }}>{t('gather')}</h1>
          <span className="soft">{t('gatherHint')}</span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="label soft">{t('food')}</span>
          {allIngs.map((i) => {
            const on = !!gathered[i.id]
            return (
              <button key={i.id} onClick={() => setGathered({ ...gathered, [i.id]: !on })} aria-pressed={on}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', color: 'var(--on-green)', textAlign: 'left', padding: '6px 0', fontSize: 16 }}>
                <span className="check" style={{ background: on ? 'var(--lime)' : 'transparent', borderColor: on ? 'var(--lime)' : 'var(--green-edge)', color: 'var(--green)' }}>{on && <Icon name="check" size={16} sw={2.5} />}</span>
                <span style={{ fontWeight: 600, minWidth: 64 }}>{ingredientText(i, factor)}</span>
                <span style={{ opacity: on ? 0.6 : 1, textDecoration: on ? 'line-through' : 'none' }}>{i.name}</span>
              </button>
            )
          })}
          {r.equipment.length > 0 && <span className="label soft" style={{ marginTop: 12 }}>{t('equipment')}</span>}
          {r.equipment.length > 0 && <div className="chips">{r.equipment.map((e) => <span key={e} className="pill-chip">{e}</span>)}</div>}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn primary block" onClick={() => setStage('cook')}>{t('letsCook')}</button>
      </main>
    )

  if (stage === 'done')
    return (
      <main className="cooking" style={{ justifyContent: 'center' }}>
        <div className="stack" style={{ gap: 20, alignItems: 'center', textAlign: 'center' }}>
          <img src="/icons/cat-fruitveg.png" alt="" style={{ width: 96, height: 96 }} />
          <h1 className="step-text">{t('cookedTitle')}</h1>
          <span className="soft">{t('howManyAte')}</span>
          <div style={{ background: 'var(--on-green)', borderRadius: 999, padding: '6px 10px' }}><Stepper value={ate} onChange={setAte} label={t('servings')} /></div>
        </div>
        <div className="stack" style={{ marginTop: 32 }}>
          <button className="btn primary block" onClick={() => {
            saveLog({ id: uid(), date: today(), meal: new Date().getHours() < 11 ? 'breakfast' : defaultMeal(), name: r.title, photo: r.photo, recipeId: r.id, createdAt: Date.now(), items: [{ id: uid(), name: r.title, amount: ate, unit: 'serving', per: r.nutrition }] })
            nav('/')
          }}>{t('logIt')}</button>
          <button className="btn block" style={{ background: 'transparent', color: 'var(--on-green)', border: '2px solid var(--green-edge)' }} onClick={() => nav(`/recipes/${r.id}`)}>{t('notNow')}</button>
        </div>
      </main>
    )

  return (
    <main className="cooking">
      <div className="between">
        <button className="icon-btn" aria-label={t('leave')} onClick={() => nav(-1)}><Icon name="close" size={20} /></button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</span>
        <button onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999, border: 'none', background: 'var(--green-deep)', color: 'var(--on-green)', fontSize: 12, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: voiceOn ? 'var(--butter)' : 'var(--green-edge)' }} />
          <Icon name="mic" size={14} />{voiceOn ? t('listening') : t('voice')}
        </button>
      </div>

      <div className="stack">
        <span className="label soft">{t('stepOf', { n: step + 1, t: total })}</span>
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`, gap: 6 }}>
          {r.steps.map((_, i) => <span key={i} style={{ height: 6, borderRadius: 999, background: i < step ? 'var(--on-green)' : i === step ? 'var(--lime)' : 'var(--green-edge)' }} />)}
        </div>
      </div>

      <p className="step-text" aria-live="polite">{current}</p>

      {needs.length > 0 && (
        <div className="stack">
          <span className="small soft" style={{ fontWeight: 600 }}>{t('youllNeed')}</span>
          <div className="chips">{needs.map((i) => <span key={i.id} className="pill-chip">{[ingredientText(i, factor), i.name.split(',')[0]].filter(Boolean).join(' ')}</span>)}</div>
        </div>
      )}

      {mins && (
        <div className="between" style={{ borderRadius: 28, padding: '16px 16px 16px 20px', background: 'var(--green-deep)' }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="small soft" style={{ fontWeight: 600 }}>{t('timer')}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: '42px', fontWeight: 800 }}>{mmss(mins * 60)}</span>
          </div>
          <button className="btn" style={{ background: 'var(--on-green)', color: 'var(--green)', height: 52 }} onClick={() => startTimer(mins, t('stepOf', { n: step + 1, t: total }))}>
            <Icon name="play" size={18} fill />{t('startTimer')}
          </button>
        </div>
      )}

      {timers.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          {timers.map((tm) => (
            <div key={tm.id} className="between" style={{ background: tm.left === 0 ? 'var(--cherry)' : 'var(--green-deep)', borderRadius: 18, padding: '8px 8px 8px 16px' }}>
              <span className="small" style={{ fontWeight: 600 }}>{tm.left === 0 ? t('timerDone') : tm.label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{mmss(tm.left)}</span>
              <div className="row" style={{ gap: 4 }}>
                {tm.left > 0 && <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={tm.endsAt ? t('pause') : t('resume')}
                  onClick={() => setTimers(timers.map((x) => x.id === tm.id ? { ...x, endsAt: x.endsAt ? null : Date.now() + x.left * 1000 } : x))}><Icon name={tm.endsAt ? 'pause' : 'play'} size={16} fill={!tm.endsAt} /></button>}
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={t('remove')} onClick={() => setTimers(timers.filter((x) => x.id !== tm.id))}><Icon name="close" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />
      <video ref={videoRef} playsInline muted style={{ width: 1, height: 1, opacity: 0, position: 'absolute', pointerEvents: 'none' }} />

      <div className="stack" style={{ gap: 14, alignItems: 'center' }}>
        <button onClick={() => setWaveOn(!waveOn)} aria-pressed={waveOn} className="row soft"
          style={{ background: 'transparent', border: 'none', gap: 10, fontSize: 14, fontWeight: 500 }}>
          <Icon name="hand" size={22} sw={1.75} />
          {waveOn ? t('waveHint') : t('waveTurnOn')}
        </button>
        <div className="row" style={{ width: '100%' }}>
          <button className="btn" style={{ flex: 1, background: 'transparent', color: 'var(--on-green)', border: '2px solid var(--green-edge)' }} disabled={step === 0} onClick={back}>{t('back')}</button>
          <button className="btn primary" style={{ flex: 2 }} onClick={next}>{step === total - 1 ? t('finish') : t('nextStep')}</button>
        </div>
      </div>
    </main>
  )
}

type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void; onerror: () => void; start: () => void; stop: () => void
}

function speak(text: string, lang: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'pl' ? 'pl-PL' : 'en-GB'
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch { /* not supported */ }
}
