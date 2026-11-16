import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useT, type TKey } from '../i18n'
import { MEALS, ZERO, type Macros } from '../types'
import { add, sumItems } from '../lib/nutrition'
import { addDays, fmt, today } from '../lib/dates'
import { Icon, MacroBar, Sheet, Thumb, toast } from '../components/ui'
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

  const left = targets.kcal - totals.kcal
  const links = useFamily((f) => f.links)
  const requests = links.filter((l) => l.status === 'pending' && l.incoming)
  const over = Math.round(left) < 0
  const hour = new Date().getHours()
  const greeting = t(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening', { name: profile.name })

  // One nudge, most useful first. Never judgy.
  let nudge: TKey | null = null
  const proteinLeft = Math.round(targets.protein - totals.protein)
  if (dayLogs.length === 0) nudge = null // no empty-state nagging; the + button tip handles first use
  else if (totals.kcal > targets.kcal * 1.05) nudge = 'nKcalOver'
  else if (proteinLeft <= 0) nudge = 'nProteinDone'
  else if (proteinLeft <= 30) nudge = 'nProteinToGo'
  else if (hour >= 18 && totals.fibre < targets.fibre * 0.5) nudge = 'nFibre'
  else if (totals.kcal > targets.kcal * 0.4) nudge = 'nOnTrack'

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
        <button aria-label={t('settings')} onClick={() => nav('/settings')}
          style={{ width: 48, height: 48, borderRadius: 999, border: 'none', background: 'var(--cherry-soft)', color: 'var(--cherry)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
          {profile.name.slice(0, 1).toUpperCase()}
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

      <section className={`card stack${over ? '' : ' green'}`} style={{ gap: 14, padding: 24, ...(over ? { background: 'var(--cherry-soft)', color: 'var(--ink)' } : {}) }}>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="number-hero" style={{ color: over ? 'var(--cherry)' : 'var(--lime)' }}>{over ? '+' : ''}{Math.abs(Math.round(left))}</span>
            <span className="label" style={{ fontWeight: over ? 600 : 500 }}>{over ? t('kcalOver') : t('kcalLeft')}</span>
          </div>
          <span className="label" style={{ fontWeight: 400 }}><b>{Math.round(totals.kcal).toLocaleString()}</b> / {targets.kcal.toLocaleString()}</span>
        </div>
        <div role="img" aria-label={`${Math.round(totals.kcal)} / ${targets.kcal} ${t('kcal')}`} style={{ height: 20, borderRadius: 999, background: over ? 'rgba(213, 0, 66, .14)' : 'var(--green-deep)', overflow: 'hidden', display: 'flex', gap: over ? 3 : 0 }}>
          <div style={{ width: `${over ? (targets.kcal / totals.kcal) * 100 : Math.min(100, (totals.kcal / targets.kcal) * 100)}%`, height: '100%', borderRadius: 999, background: over ? '#fff' : 'var(--on-green)', transition: 'width .3s' }} />
          {over && <div style={{ flex: 1, minWidth: 10, height: '100%', borderRadius: 999, background: 'var(--cherry)' }} />}
        </div>
      </section>

      <section className="card stack" style={{ gap: 16 }} aria-label="Macros">
        <MacroBar label={t('protein')} value={totals.protein} target={targets.protein} color="var(--cherry)" />
        <MacroBar label={t('carbs')} value={totals.carbs} target={targets.carbs} color="var(--butter)" />
        <MacroBar label={t('fat')} value={totals.fat} target={targets.fat} color="var(--olive)" />
        <MacroBar label={t('fibre')} value={totals.fibre} target={targets.fibre} color="var(--lime)" />
      </section>

      {nudge && <div className="tip"><Icon name="heart" size={24} /><span>{t(nudge, { n: proteinLeft })}</span></div>}

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
          return entries.map((e) => (
            <button key={e.id} className="meal-row" onClick={() => nav(`/meal/${e.id}`)}>
              <Thumb photo={e.photo} />
              <span className="grow stack" style={{ gap: 2 }}>
                <span className="caption">{t(meal)}</span>
                <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{e.name}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{Math.round(sumItems(e.items).kcal)}</span>
            </button>
          ))
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
