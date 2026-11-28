import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useT, type TKey } from '../i18n'
import type { Goal, Macros, Pace } from '../types'
import { calorieZone } from '../lib/nutrition'
import { buzz, playSound, takeLogged, type SoundKind } from '../lib/celebrate'
import { toast } from './ui'

type Key = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fibre'
type Bar = { key: Key; label: string; color: string; goal: number; zMin: number; zMax: number; max: number; flagOver: boolean; celebrate: boolean }
type Status = 'under' | 'zone' | 'over'

const KEYS: Key[] = ['kcal', 'protein', 'carbs', 'fat', 'fibre']
const pick = (m: Macros): Record<Key, number> => ({ kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, fibre: m.fibre })
const same = (a: Record<Key, number>, b: Record<Key, number>) => KEYS.every((k) => Math.round(a[k]) === Math.round(b[k]))

// What each day's card last showed, so coming back to Today after logging fills the bars from where they were.
const seen = new Map<string, Record<Key, number>>()

const CONFETTI = ['#D8F37A', '#FF7A9C', '#D50042', '#FFBA2F', '#C1D011', '#F9D9E2']
const BITS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.2
  const d = 48 + ((i * 37) % 34)
  const round = i % 3 === 0
  return {
    width: round ? 6 : 8, height: round ? 6 : 4, borderRadius: round ? 999 : 2, background: CONFETTI[i % CONFETTI.length],
    '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d)}px`, '--r': `${(i * 67) % 360}deg`, animationDelay: `${(i % 4) * 25}ms`,
  } as CSSProperties
})

function status(b: Bar, v: number): Status {
  if (b.flagOver && Math.round(v) > b.zMax) return 'over'
  if (b.goal > 0 && v >= b.zMin) return 'zone'
  return 'under'
}

/**
 * Calories against a zone and the four macros, on one dark green card. Every bar runs past its goal and shows its zone
 * in the same place as the calorie zone, so the zones line up. Logging food fills the bars with a spring, counts the
 * numbers up and plays a chime; reaching a goal plays a rising run of notes and pops in a "Goal hit" badge for a moment.
 * Going over is quiet: one soft pop, and the number and zone label turn pink.
 */
export default function SummaryCard({ date, totals, targets, goal, pace }: { date: string; totals: Macros; targets: Macros; goal: Goal; pace?: Pace }) {
  const t = useT()
  const now = pick(totals)
  const [min, max] = calorieZone(targets.kcal, goal, pace)
  const full = Math.ceil((max * 1.16) / 100) * 100
  // Where the calorie zone sits on its bar; every macro zone sits in the same place.
  const pMin = min / full, pMax = max / full
  // Limits (carbs, fat): the goal is the zone's right edge. Targets (protein, fibre): the goal is its left edge.
  const limit = (goalG: number) => ({ goal: goalG, zMax: goalG, max: goalG / pMax, zMin: (goalG / pMax) * pMin })
  const aim = (goalG: number) => ({ goal: goalG, zMin: goalG, max: goalG / pMin, zMax: (goalG / pMin) * pMax })
  const bars: Bar[] = [
    { key: 'kcal', label: t('calories'), color: 'var(--lime-bright)', goal: max, zMin: min, zMax: max, max: full, flagOver: true, celebrate: true },
    { key: 'protein', label: t('protein'), color: 'var(--cherry)', ...aim(targets.protein), flagOver: false, celebrate: true },
    { key: 'carbs', label: t('carbs'), color: 'var(--butter)', ...limit(targets.carbs), flagOver: true, celebrate: false },
    { key: 'fat', label: t('fat'), color: 'var(--olive)', ...limit(targets.fat), flagOver: true, celebrate: false },
    { key: 'fibre', label: t('fibre'), color: 'var(--lime)', ...aim(targets.fibre), flagOver: false, celebrate: true },
  ]

  // shown: what the bars are drawn at (moved to the new totals a frame later so they animate). nums: the counting-up numbers.
  const [shown, setShown] = useState(() => seen.get(date) ?? now)
  const [nums, setNums] = useState(shown)
  const [party, setParty] = useState(0) // bumps the shine, number bounce and confetti
  const [confetti, setConfetti] = useState(false)
  const [badges, setBadges] = useState<{ keys: Key[]; out: boolean }>({ keys: [], out: false })
  const lastDate = useRef(date)
  const timers = useRef<number[]>([])
  const raf = useRef(0)

  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(raf.current) }, [])

  useEffect(() => {
    const prev = lastDate.current === date ? shown : now
    lastDate.current = date
    seen.set(date, now)
    if (same(prev, now)) { if (!same(shown, now)) { setShown(now); setNums(now) } return }
    const logged = takeLogged()
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

    // Count the numbers up while the bars spring to their new widths.
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const step = (time: number) => {
      const k = Math.min(1, (time - t0) / 1000), e = 1 - Math.pow(1 - k, 3)
      setNums(Object.fromEntries(KEYS.map((key) => [key, prev[key] + (now[key] - prev[key]) * e])) as Record<Key, number>)
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    requestAnimationFrame(() => setShown(now))

    // Only her own logging celebrates (not a sync from another phone, a deletion or switching days).
    const grew = KEYS.some((k) => now[k] > prev[k])
    if (!logged || !grew) return

    const reached = bars.filter((b) => status(b, prev[b.key]) === 'under' && status(b, now[b.key]) === 'zone')
    const wentOver = bars.filter((b) => status(b, prev[b.key]) !== 'over' && status(b, now[b.key]) === 'over')
    const kind: SoundKind = wentOver.length ? 'quiet' : reached.length ? 'goal' : 'add'
    playSound(kind)
    buzz(kind)

    const list = (bs: Bar[]) => {
      const n = bs.map((b) => b.label.toLowerCase())
      return n.length > 1 ? `${n.slice(0, -1).join(', ')} ${t('and')} ${n[n.length - 1]}` : n[0]
    }
    const cap = (s: string) => (t.lang === 'pl' ? s : s.charAt(0).toUpperCase() + s.slice(1))
    const hits = reached.filter((b) => b.celebrate && b.key !== 'kcal')
    if (wentOver.length) toast(t('overGoalToday', { list: list(wentOver) }))
    else if (hits.length) toast(t(hits.length > 1 ? 'goalsHit' : 'goalHit', { list: cap(list(hits)) }) + (reached.some((b) => b.key === 'kcal') ? ` ${t('inZoneToo')}` : ''))
    else if (reached.some((b) => b.key === 'kcal')) toast(t('inYourZone'))
    else if (reached.length) toast(t(reached.length > 1 ? 'goalsHit' : 'goalHit', { list: cap(list(reached)) }))

    if (kind !== 'quiet') { setParty((p) => p + 1); setConfetti(true); later(() => setConfetti(false), 1100) }
    const badgeKeys = reached.filter((b) => b.key !== 'kcal').map((b) => b.key)
    if (badgeKeys.length) {
      later(() => setBadges({ keys: badgeKeys, out: false }), 900)
      later(() => setBadges({ keys: badgeKeys, out: true }), 3200)
      later(() => setBadges({ keys: [], out: false }), 3550)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, now.kcal, now.protein, now.carbs, now.fat, now.fibre])

  const fmt = (n: number) => Math.round(n).toLocaleString(t.lang === 'pl' ? 'pl-PL' : 'en-GB')
  const draw = (b: Bar, thick: boolean) => {
    const v = shown[b.key], st = status(b, now[b.key])
    const pct = (n: number) => (b.max > 0 ? Math.max(0, Math.min(100, (n / b.max) * 100)) : 0)
    const over = b.flagOver && Math.round(v) > b.zMax
    const edge: CSSProperties = { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, background: 'var(--green)' }
    const spring = 'width 1s cubic-bezier(.34,1.45,.64,1)'
    const delay = `${KEYS.indexOf(b.key) * 70}ms`
    return {
      st,
      bar: (
        <div role="img" aria-label={`${fmt(now[b.key])} / ${fmt(b.goal)} ${b.key === 'kcal' ? t('kcal') : 'g'}`} style={{ position: 'relative', height: thick ? 14 : 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255, 252, 246, .16)' }}>
          {b.goal > 0 && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(b.zMin)}%`, width: `${pct(b.zMax) - pct(b.zMin)}%`, background: 'rgba(216, 243, 122, .38)' }} />}
          <div className="sc-fill" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${over ? pct(b.zMax) : pct(v)}%`, borderRadius: over ? '999px 0 0 999px' : 999, background: b.color, overflow: 'hidden', transition: spring, transitionDelay: delay }}>
            {party > 0 && <span key={party} className="sc-shine" />}
          </div>
          <div className="sc-fill" style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(b.zMax)}%`, width: `${over ? pct(v) - pct(b.zMax) : 0}%`, borderRadius: '0 999px 999px 0', background: b.color, transition: 'width .7s ease-out', transitionDelay: over ? '.8s' : '0s' }} />
          {b.goal > 0 && <><div style={{ ...edge, left: `${pct(b.zMin)}%` }} /><div style={{ ...edge, left: `${pct(b.zMax)}%` }} /></>}
        </div>
      ),
      number: <b key={party} className={party > 0 ? 'sc-bump' : undefined} style={{ color: st === 'over' ? '#FF7A9C' : '#fff', fontWeight: 600 }}>{fmt(nums[b.key])}</b>,
      zoneMid: (pct(b.zMin) + pct(b.zMax)) / 2,
      fillEnd: pct(Math.min(now[b.key], b.max)),
    }
  }

  const [cal, ...macros] = bars
  const c = draw(cal, true)
  const zoneName = t((goal === 'lose' ? 'zoneLose' : goal === 'gain' ? 'zoneGain' : goal === 'build' ? 'zoneBuild' : 'zoneMaintain') as TKey)
  return (
    <section className="card stack summary-card" style={{ gap: 16, position: 'relative' }}>
      <div className="stack" style={{ gap: 8, position: 'relative' }}>
        <div className="between label"><span>{t('calories')}</span><span style={{ fontWeight: 400, color: 'var(--on-green-muted)' }}>{c.number} / {fmt(max)}</span></div>
        {c.bar}
        <div style={{ position: 'relative', height: 14, marginTop: -4, fontSize: 11, lineHeight: '14px' }}>
          <span key={c.st} className={c.st === 'zone' && party > 0 ? 'sc-zone-pop' : undefined} style={{ position: 'absolute', left: `${c.zoneMid}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontWeight: 600, color: c.st === 'over' ? '#FF7A9C' : 'var(--lime-bright)' }}>
            {c.st === 'over' ? t('overYourZone') : c.st === 'zone' ? t('inYourZoneShort') : zoneName}
          </span>
        </div>
        {confetti && (
          <span aria-hidden="true" style={{ position: 'absolute', left: `${c.fillEnd}%`, top: 34, width: 0, height: 0 }}>
            {BITS.map((s, i) => <span key={`${party}-${i}`} className="sc-bit" style={s} />)}
          </span>
        )}
      </div>
      <div aria-hidden="true" style={{ borderTop: '1px solid rgba(255, 252, 246, .16)' }} />
      {macros.map((b) => {
        const d = draw(b, false)
        return (
          <div key={b.key} className="stack" style={{ gap: 8 }}>
            <div className="between label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{b.label}
                {badges.keys.includes(b.key) && (
                  <span className={badges.out ? 'sc-badge sc-badge-out' : 'sc-badge'}>
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                    {t('goalHitBadge')}
                  </span>
                )}
              </span>
              <span style={{ fontWeight: 400, color: 'var(--on-green-muted)' }}>{d.number} / {Math.round(b.goal)}g</span>
            </div>
            {d.bar}
          </div>
        )
      })}
    </section>
  )
}
