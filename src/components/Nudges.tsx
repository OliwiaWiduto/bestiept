import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Meal } from '../types'
import { addDays, fmt, today } from '../lib/dates'
import { foodArt } from '../lib/art'
import { ownCopy, type LibRecipe } from '../lib/library'
import { nudgesOf, weekRecap, type Habit, type MealTip } from '../lib/nudges'
import { Icon, toast } from './ui'

/** Put a Bestie pick in the plan (her own copy, so shopping and logging work as usual). */
export function planPick(libId: string, date: string, meal: Meal) {
  const s = useStore.getState()
  const copy = ownCopy(libId, s.recipes, s.lang, s.saveRecipe)
  if (!copy) return
  s.addPlan({ date, meal, recipeId: copy.id, servings: s.profile?.household ?? 1 })
}

const sparkle = (bg: string, color: string) => (
  <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 999, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="sparkle" size={16} /></span>
)

/** Shows on Sunday for the week just gone, and stays until she taps it. */
export function WeekBar() {
  const t = useT()
  const nav = useNavigate()
  const { profile, targets, logs, setNudges } = useStore()
  if (!profile || !targets) return null
  const r = weekRecap(logs, today(), targets, profile.goal, profile.pace, nudgesOf(profile))
  if (!r) return null
  return (
    <button className="card" onClick={() => { setNudges({ weekSeen: r.start }); nav('/trends') }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--line)', textAlign: 'left', width: '100%' }}>
      {sparkle('var(--peach-soft)', 'var(--green)')}
      <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{t('yourWeek')}</span>
        <span className="caption">{t('hcWeekZone', { n: r.inZone, t: r.logged })} · {r.habits === 0 ? t('hcWeekSee') : r.habits === 1 ? t('hcWeekHabits1') : t('hcWeekHabitsN', { n: r.habits })}</span>
      </span>
      <Icon name="forward" size={18} />
    </button>
  )
}

/** The one meal tip of the day, sitting under the meal that caused it. */
export function MealTipCard({ tip }: { tip: MealTip }) {
  const t = useT()
  const nav = useNavigate()
  const { setNudges, lang } = useStore()
  const title = tip.swap[lang].title
  const tomorrow = addDays(today(), 1)
  return (
    <div style={{ borderTop: '1px solid var(--cherry-soft)', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        {sparkle('var(--cherry-soft)', 'var(--cherry)')}
        <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>
          {t('hcTipStart', { n: tip.protein })}
          <Link to={`/recipes/${tip.swap.id}?swapP=${tip.protein}&swapK=${tip.kcal}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{title.toLowerCase()}</Link>
          {t('hcTipEnd', { p: tip.swap.nutrition.protein })}
        </p>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn secondary small" onClick={() => {
          planPick(tip.swap.id, tomorrow, tip.meal)
          setNudges({ hiddenOn: today() })
          toast(t('hcPlannedTomorrow', { meal: t(tip.meal).toLowerCase() }), { label: t('navPlan'), run: () => nav('/plan') })
        }}>{t('hcTryTomorrow')}</button>
        <button className="btn ghost small" style={{ border: 'none', color: 'var(--ink-muted)' }}
          onClick={() => { const d = nudgesOf(useStore.getState().profile).dismissed ?? {}; setNudges({ hiddenOn: today(), dismissed: { ...d, [tip.swap.id]: today() } }) }}>{t('hcNotNow')}</button>
      </div>
    </div>
  )
}

export function WinLine({ meal, protein }: { meal: Meal; protein: number }) {
  const t = useT()
  return (
    <div className="row small" style={{ gap: 8, padding: '0 6px', marginTop: -2, color: 'var(--green)', fontWeight: 600 }}>
      <Icon name="sparkle" size={16} />{t('hcWin', { n: protein, meal: t.lang === 'pl' ? t(meal) : t(meal).toLowerCase() })}
    </div>
  )
}

/** A small Bestie pick card: picture, name, protein. */
export function PickCard({ l, width }: { l: LibRecipe; width?: number }) {
  const t = useT()
  const nav = useNavigate()
  const lang = useStore((s) => s.lang)
  return (
    <button onClick={() => nav(`/recipes/${l.id}`)} style={{ width, flex: width ? 'none' : undefined, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
      <span className="thumb" style={{ width: '100%', height: width ? width * 0.8 : 84, borderRadius: 18 }}><img src={foodArt(l.en.title, l.category)} alt="" style={{ width: '82%', maxWidth: 120, height: 'auto' }} /></span>
      <span style={{ fontSize: 13, lineHeight: '17px', fontWeight: 600 }}>{l[lang].title}</span>
      <span className="caption">{t('proteinShort', { n: l.nutrition.protein })} · {t('minutes', { n: l.handsOn })}</span>
    </button>
  )
}

/** A small bar chart: one bar per day, a dashed line for what to aim for. Days with nothing logged get a stub. */
function HabitBars({ h }: { h: Habit }) {
  const t = useT()
  const n = h.values.length
  const W = 300, H = 84, gap = n > 10 ? 2 : 8
  const bw = (W - gap * (n - 1)) / n
  const max = Math.max(h.line * 1.3, ...h.values.map((v) => v ?? 0)) || 1
  const ly = H - (h.line / max) * H
  const unit = h.kind === 'over' || h.kind === 'snack' ? t('kcal') : 'g'
  return (
    <div className="stack" style={{ gap: 6 }}>
      <svg viewBox={`0 0 ${W} ${H + (n <= 10 ? 18 : 2)}`} width="100%" role="img" aria-label={h.values.map((v, i) => `${fmt(h.days[i], t.lang, { weekday: 'short' })} ${v ?? '–'}`).join(', ')}>
        {h.values.map((v, i) => v === null
          ? <rect key={i} x={i * (bw + gap)} y={H - 4} width={bw} height={4} rx={2} fill="var(--track)" />
          : <rect key={i} x={i * (bw + gap)} y={H - Math.max((v / max) * H, 3)} width={bw} height={Math.max((v / max) * H, 3)} rx={Math.min(bw / 2, 6)} fill="var(--green)" />)}
        <line x1={0} x2={W} y1={ly} y2={ly} stroke="var(--green)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
        {n <= 10 && h.days.map((d, i) => <text key={d} x={i * (bw + gap) + bw / 2} y={H + 14} textAnchor="middle" fontSize="11" fill="var(--ink-muted)" fontFamily="Inter">{fmt(d, t.lang, { weekday: 'narrow' })}</text>)}
      </svg>
      <span className="caption"><span style={{ display: 'inline-block', width: 14, borderTop: '2px dashed var(--green)', verticalAlign: 'middle', marginRight: 6, opacity: 0.6 }} />{h.kind === 'snack' ? t('hcHeavySnackLine', { n: h.line }) : h.kind === 'over' ? t('hcZoneTop', { n: h.line }) : t('hcAimFor', { n: h.line, u: unit })}</span>
    </div>
  )
}

/** One repeated miss, with a small bar chart and swaps to plan. */
export function HabitCard({ h }: { h: Habit }) {
  const t = useT()
  const targets = useStore((s) => s.targets)
  const n = h.low.filter(Boolean).length
  const of = h.low.length
  const title = h.kind === 'protein' ? t('hcHabitProteinShort', { meal: t(h.meal) }) : h.kind === 'snack' ? t('hcHabitSnack', { name: h.name, kcal: h.kcal, n, of }) : h.kind === 'fibre' ? t('hcHabitFibre', { g: targets?.fibre ?? 25, n, of }) : t('hcHabitOver', { n, of })
  const swaps = h.kind === 'protein' || h.kind === 'snack' ? h.swaps : []
  const heading = { margin: 0, fontSize: 15, lineHeight: '20px', fontWeight: 600 } as const
  return (
    <section className="card stack" style={{ gap: 14 }}>
      <h3 style={heading}>{title}</h3>
      <HabitBars h={h} />
      {h.kind === 'fibre' && <span className="small muted">{t('hcHabitFibreTip')}</span>}
      {h.kind === 'over' && <span className="small muted">{t('hcHabitOverTip')}</span>}
      {h.kind === 'snack' && <span className="small muted">{t('hcHabitSnackTip')}</span>}
      {swaps.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '2px 0', width: '100%' }} />
          <h3 style={heading}>{h.kind === 'snack' ? t('hcHabitSnackSwaps') : t('hcHabitSwaps')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>{swaps.map((l) => <PickCard key={l.id} l={l} />)}</div>
          <button className="btn primary block" onClick={() => {
            const meal = h.kind === 'protein' || h.kind === 'snack' ? h.meal : 'snack'
            // The next few days that don't have this meal planned yet.
            const plan = useStore.getState().plan
            const days: string[] = []
            for (let i = 1; days.length < swaps.length && i <= 14; i++) {
              const d = addDays(today(), i)
              if (!plan.some((p) => p.date === d && p.meal === meal)) days.push(d)
            }
            days.forEach((d, i) => planPick(swaps[i].id, d, meal))
            toast(t('hcPlannedDays', { days: days.map((d) => fmt(d, t.lang, { weekday: 'short' })).join(', ') }))
          }}>{t('hcPlanThese')}</button>
        </>
      )}
    </section>
  )
}

