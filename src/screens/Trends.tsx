import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { ZERO, type Macros } from '../types'
import { add, scale, sumItems } from '../lib/nutrition'
import { addDays, fmt, today } from '../lib/dates'
import { BackButton, Icon, MacroBar } from '../components/ui'

export default function Trends() {
  const t = useT()
  const { logs, targets, weights } = useStore()
  const [range, setRange] = useState<7 | 30>(7)
  const days = useMemo(() => Array.from({ length: range }, (_, i) => addDays(today(), i - range + 1)), [range])

  const perDay = useMemo(() => days.map((d) => logs.filter((l) => l.date === d).reduce((acc, l) => add(acc, sumItems(l.items)), { ...ZERO })), [days, logs])
  if (!targets) return null
  const logged = perDay.filter((m) => m.kcal > 0)
  const avg: Macros = logged.length ? scale(logged.reduce((a, b) => add(a, b), { ...ZERO }), 1 / logged.length) : { ...ZERO }
  const onTarget = logged.filter((m) => Math.abs(m.kcal - targets.kcal) <= targets.kcal * 0.1).length

  const maxK = Math.max(targets.kcal * 1.25, ...perDay.map((m) => m.kcal))
  const W = 320, H = 150, gap = range === 7 ? 10 : 3
  const bw = (W - gap * (range - 1)) / range
  const ty = H - (targets.kcal / maxK) * H

  const wIn = weights.filter((w) => w.date >= addDays(today(), -Math.max(range, 30) + 1))
  const wMin = Math.min(...wIn.map((w) => w.kg)) - 0.5
  const wMax = Math.max(...wIn.map((w) => w.kg)) + 0.5
  const span = Math.max(range, 30)
  const wPts = wIn.map((w) => {
    const i = span - 1 - Math.round((new Date(today()).getTime() - new Date(w.date).getTime()) / 86400000)
    return [(i / (span - 1)) * W, H - ((w.kg - wMin) / (wMax - wMin || 1)) * H] as const
  })

  const summary = logged.length === 0 ? t('weekSummaryEmpty') : onTarget >= Math.ceil(logged.length * 0.6) ? t('weekSummaryGood') : t('weekSummaryOk')

  return (
    <main className="screen">
      <div className="row"><BackButton to="/" /></div>
      <h1 className="display">{t('trends')}</h1>
      <div className="chips" role="group">
        <button className="chip" aria-pressed={range === 7} onClick={() => setRange(7)}>{t('week')}</button>
        <button className="chip" aria-pressed={range === 30} onClick={() => setRange(30)}>{t('month')}</button>
      </div>

      <section className="card green stack" style={{ gap: 8 }}>
        <span className="label" style={{ color: 'var(--green-soft)' }}>{t('yourWeek')}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{summary}</span>
        <span className="small" style={{ color: 'var(--green-soft)' }}>{t('onTarget', { n: onTarget, t: range })}</span>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="between">
          <span className="label">{t('calories')}</span>
          <span className="small muted">{t('avgDay')}: <b style={{ color: 'var(--green)' }}>{Math.round(avg.kcal)}</b> / {targets.kcal}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" role="img" aria-label={`${t('calories')}, ${t('avgDay')} ${Math.round(avg.kcal)}`}>
          {perDay.map((m, i) => {
            const h = (m.kcal / maxK) * H
            const over = m.kcal > targets.kcal * 1.1
            return <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={Math.max(h, m.kcal ? 2 : 0)} rx={Math.min(bw / 2, 8)} fill={over ? 'var(--butter)' : 'var(--green)'} />
          })}
          {perDay.map((m, i) => m.kcal === 0 && <rect key={`e${i}`} x={i * (bw + gap)} y={H - 4} width={bw} height={4} rx={2} fill="var(--track)" />)}
          <line x1={0} x2={W} y1={ty} y2={ty} stroke="var(--cherry)" strokeWidth={1.5} strokeDasharray="4 4" />
          {range === 7 && days.map((d, i) => <text key={d} x={i * (bw + gap) + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="var(--ink-muted)" fontFamily="Inter">{fmt(d, t.lang, { weekday: 'narrow' })}</text>)}
        </svg>
        <span className="caption"><span style={{ display: 'inline-block', width: 14, borderTop: '2px dashed var(--cherry)', verticalAlign: 'middle', marginRight: 6 }} />{t('target')}</span>
      </section>

      <section className="card stack" style={{ gap: 16 }}>
        <span className="label">{t('avgDay')}</span>
        <MacroBar label={t('protein')} value={avg.protein} target={targets.protein} color="var(--cherry)" />
        <MacroBar label={t('carbs')} value={avg.carbs} target={targets.carbs} color="var(--butter)" />
        <MacroBar label={t('fat')} value={avg.fat} target={targets.fat} color="var(--olive)" />
        <MacroBar label={t('fibre')} value={avg.fibre} target={targets.fibre} color="var(--lime)" />
        <MacroBar label={t('sugar')} value={avg.sugar} target={targets.sugar} color="" isLimit limitLabel={t('limit')} />
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="between">
          <span className="label">{t('weightTrend')}</span>
          {wIn.length > 0 && <span className="small muted">{wIn[wIn.length - 1].kg} kg</span>}
        </div>
        {wIn.length < 2 ? (
          <div className="row muted small" style={{ gap: 8 }}><Icon name="trend" size={20} />{t('noWeight')}</div>
        ) : (
          <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} width="100%" role="img" aria-label={t('weightTrend')}>
            <polyline points={wPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--green)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {wPts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill="var(--surface-raised)" stroke="var(--green)" strokeWidth={2} />)}
          </svg>
        )}
      </section>
    </main>
  )
}
