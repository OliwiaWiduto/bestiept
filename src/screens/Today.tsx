import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import { MEALS, ZERO, type Goal, type Macros } from '../types'
import { add, sumItems } from '../lib/nutrition'
import { addDays, fmt, today } from '../lib/dates'
import { Avatar, Icon, Sheet, Thumb, toast } from '../components/ui'
import { WeightField } from '../components/BodyFields'
import { useFamily } from '../lib/family'
import { formatDiff, formatWeight } from '../lib/units'

export default function Today() {
  const t = useT()
  const nav = useNavigate()
  const { profile, targets, logs, weights, logWeight, units } = useStore()
  const { viewDate, setViewDate, openLog } = useUI()
  const [weightOpen, setWeightOpen] = useState(false)
  const isToday = viewDate === today()

  const dayLogs = useMemo(() => logs.filter((l) => l.date === viewDate).sort((a, b) => a.createdAt - b.createdAt), [logs, viewDate])
  const totals: Macros = useMemo(() => dayLogs.reduce((acc, l) => add(acc, sumItems(l.items)), { ...ZERO }), [dayLogs])
  if (!profile || !targets) return null

  const links = useFamily((f) => f.links)
  const requests = links.filter((l) => l.status === 'pending' && l.incoming)
  const hour = new Date().getHours()
  const greeting = t(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening', { name: profile.name })


  const latest = weights[weights.length - 1]
  const weekAgo = [...weights].reverse().find((w) => w.date <= addDays(today(), -7))
  const diff = latest && weekAgo ? Math.round((latest.kg - weekAgo.kg) * 10) / 10 : null

  return (
    <main className="screen">
      <div className="between" style={{ paddingTop: 8 }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">{greeting}</span>
          <h1 className="display">{isToday ? t('today') : fmt(viewDate, t.lang, { weekday: 'long' })}</h1>
        </div>
        <button aria-label={t('settings')} onClick={() => nav('/settings')} style={{ border: 'none', background: 'none', padding: 0, borderRadius: 999 }}>
          <Avatar name={profile.name} avatar={profile.avatar} size={52} />
        </button>
      </div>

      {requests.length > 0 && (
        <button className="shop-card" style={{ background: 'var(--cherry-soft)', color: 'var(--ink)' }} onClick={() => nav('/family')}>
          <span className="icon-btn" style={{ background: 'var(--cherry)', color: '#fff', flex: 'none' }}><Icon name="heart" size={20} fill /></span>
          <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{requests.length === 1 ? t('linkRequestFrom', { name: requests[0].person.name }) : t('linkRequestsN', { n: requests.length })}</span>
            <span className="small muted">{t('linkRequestSee')}</span>
          </span>
          <Icon name="forward" size={20} />
        </button>
      )}
      <div className="between" style={{ background: 'var(--surface-raised)', borderRadius: 999, padding: 4 }}>
        <button className="icon-btn" style={{ background: 'transparent' }} aria-label={t('prevDay')} onClick={() => setViewDate(addDays(viewDate, -1))}><Icon name="back" /></button>
        <button onClick={() => setViewDate(today())} aria-label={isToday ? undefined : t('backToToday')} style={{ border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600 }}>
          {fmt(viewDate, t.lang, { weekday: 'long', day: 'numeric', month: 'short' })}
        </button>
        <button className="icon-btn" style={{ background: 'transparent' }} aria-label={t('nextDay')} disabled={isToday} onClick={() => setViewDate(addDays(viewDate, 1))}><Icon name="forward" /></button>
      </div>

      <SummaryCard totals={totals} targets={targets} goal={profile.goal} />


      <h2 className="heading" style={{ paddingTop: 8 }}>{t('yourMeals')}</h2>
      <div className="stack">
        {MEALS.map((meal) => {
          const entries = dayLogs.filter((l) => l.meal === meal)
          if (entries.length === 0)
            return (
              <button key={meal} className="dashed" style={{ justifyContent: 'flex-start', padding: 14 }} onClick={() => openLog(meal)}>
                <span className="thumb" style={{ background: 'var(--surface)', border: '2px solid var(--line)' }}><Icon name="plus" /></span>
                <span className="stack" style={{ gap: 2, textAlign: 'left' }}>
                  <span className="caption">{t(meal)}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{meal === 'dinner' ? t('dinnerEmpty') : t('addMeal')}</span>
                </span>
              </button>
            )
          return entries.map((e) => {
            const m = sumItems(e.items)
            return (
              <button key={e.id} className="meal-row" onClick={() => nav(`/meal/${e.id}`)}>
                <Thumb photo={e.photo} cat={e.meal} name={e.name} />
                <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                  {/* The meal's own numbers, written the same way as each ingredient's */}
                  <span className="caption">{[t(meal), `${Math.round(m.kcal)} ${t('kcal')}`, `P ${Math.round(m.protein)}`, `C ${Math.round(m.carbs)}`, `F ${Math.round(m.fat)}`].join(' · ')}</span>
                  <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{e.name}</span>
                </span>
              </button>
            )
          })
        })}
      </div>

      <section className="card between" style={{ marginTop: 4 }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="caption">{t('weight')}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: '32px', fontWeight: 700, color: 'var(--green)' }}>{latest ? formatWeight(latest.kg, units) : '—'}</span>
          <span className="small" style={{ color: 'var(--green)', fontWeight: 500 }}>
            {diff === null ? (latest ? '' : t('weightNone')) : diff < 0 ? t('weightDown', { n: formatDiff(diff, units) }) : diff > 0 ? t('weightUp', { n: formatDiff(diff, units) }) : t('weightSame')}
          </span>
        </div>
        <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}>
          <button className="btn secondary small" onClick={() => setWeightOpen(true)}>{t('logToday')}</button>
          <Link to="/trends" className="small" style={{ fontWeight: 600 }}>{t('seeTrends')}</Link>
        </div>
      </section>

      <WeightSheet key={String(weightOpen)} open={weightOpen} onClose={() => setWeightOpen(false)} last={latest?.kg ?? profile.weightKg}
        onSave={(kg) => {
          const before = useStore.getState().targets
          logWeight(kg)
          const changedTargets = useStore.getState().targets !== before
          setWeightOpen(false)
          toast(changedTargets ? t('targetsUpdated') : latest && kg > latest.kg ? t('weightUpMsg') : t('weightSaved'))
        }} />
    </main>
  )
}

function WeightSheet({ open, onClose, last, onSave }: { open: boolean; onClose: () => void; last: number; onSave: (kg: number) => void }) {
  const t = useT()
  const [kg, setKg] = useState(last)
  return (
    <Sheet open={open} onClose={onClose} title={t('logWeight')}>
      <WeightField kg={kg} onChange={setKg} big />
      <button className="btn primary block" disabled={!(kg >= 30 && kg <= 300)} onClick={() => onSave(Math.round(kg * 10) / 10)}>{t('save')}</button>
    </Sheet>
  )
}

/** Calories against a zone (the bar runs past it, so eating over still fits) and the macros, on one dark green card. */
function SummaryCard({ totals, targets, goal }: { totals: Macros; targets: Macros; goal: Goal }) {
  const t = useT()
  // Weight loss: up to 250 kcal under the target is the zone; maintain: 100 either side; gain: up to 250 over.
  const [min, max] = goal === 'lose' ? [targets.kcal - 250, targets.kcal] : goal === 'gain' ? [targets.kcal, targets.kcal + 250] : [targets.kcal - 100, targets.kcal + 100]
  const full = Math.ceil((max * 1.16) / 100) * 100
  const pct = (n: number) => Math.max(0, Math.min(100, (n / full) * 100))
  const eaten = Math.round(totals.kcal)
  const over = eaten > max
  const edge: CSSProperties = { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, background: 'var(--green)' }
  return (
    <section className="card stack summary-card" style={{ gap: 16 }}>
      <div className="stack" style={{ gap: 8 }}>
        <div className="between label"><span>{t('calories')}</span><span style={{ fontWeight: 400, color: 'var(--on-green-muted)' }}><b style={{ color: '#fff', fontWeight: 600 }}>{eaten}</b> / {max}</span></div>
        <div role="img" aria-label={`${eaten} / ${max} ${t('kcal')}`} style={{ position: 'relative', height: 14, borderRadius: 999, overflow: 'hidden', background: 'rgba(255, 252, 246, .16)' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(min)}%`, width: `${pct(max) - pct(min)}%`, background: 'rgba(216, 243, 122, .38)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${over ? pct(max) : pct(eaten)}%`, borderRadius: 999, background: 'var(--lime-bright)', transition: 'width .3s' }} />
          {over && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(max)}%`, width: `${pct(eaten) - pct(max)}%`, borderRadius: '0 999px 999px 0', background: '#FF7A9C' }} />}
          <div style={{ ...edge, left: `${pct(min)}%` }} />
          <div style={{ ...edge, left: `${pct(max)}%` }} />
        </div>
        <div style={{ position: 'relative', height: 14, marginTop: -4, fontSize: 11, lineHeight: '14px' }}>
          <span style={{ position: 'absolute', left: `${(pct(min) + pct(max)) / 2}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--lime-bright)' }}>{t(goal === 'lose' ? 'zoneLose' : goal === 'gain' ? 'zoneGain' : 'zoneMaintain')}</span>
        </div>
      </div>
      <div aria-hidden="true" style={{ borderTop: '1px solid rgba(255, 252, 246, .16)' }} />
      <SummaryMacro label={t('protein')} value={totals.protein} target={targets.protein} color="var(--cherry)" />
      <SummaryMacro label={t('carbs')} value={totals.carbs} target={targets.carbs} color="var(--butter)" />
      <SummaryMacro label={t('fat')} value={totals.fat} target={targets.fat} color="var(--olive)" />
      <SummaryMacro label={t('fibre')} value={totals.fibre} target={targets.fibre} color="var(--lime)" />
    </section>
  )
}

function SummaryMacro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="between label"><span>{label}</span><span style={{ fontWeight: 400, color: 'var(--on-green-muted)' }}><b style={{ color: '#fff', fontWeight: 600 }}>{Math.round(value)}</b> / {Math.round(target)}g</span></div>
      <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255, 252, 246, .16)' }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color, transition: 'width .3s' }} /></div>
    </div>
  )
}
