import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import { MEALS, ZERO, type Macros } from '../types'
import { add, sumItems } from '../lib/nutrition'
import SummaryCard from '../components/SummaryCard'
import { RemindersCard } from '../components/Reminders'
import { addDays, fmt, today } from '../lib/dates'
import { Avatar, Icon, Sheet, Thumb, toast } from '../components/ui'
import { WeightField } from '../components/BodyFields'
import { useFamily } from '../lib/family'
import { formatDiff, formatWeight } from '../lib/units'
import { MealTipCard, WeekBar, WinLine } from '../components/Nudges'
import { mealTip, mealWin, nudgesOf } from '../lib/nudges'

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
  const greeting = t(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening')
  // Her name is the big title. Longer names get a bit smaller so they still fit next to her picture.
  const name = profile.name.trim()
  const nameSize = name.length > 18 ? 28 : name.length > 11 ? 34 : undefined


  // Healthy choices: one tip a day under the meal that caused it, or a little win to celebrate.
  const tip = isToday ? mealTip(logs, viewDate, targets, nudgesOf(profile)) : null
  const win = isToday && !tip ? mealWin(logs, viewDate, targets) : null

  const latest = weights[weights.length - 1]
  const weekAgo = [...weights].reverse().find((w) => w.date <= addDays(today(), -7))
  const diff = latest && weekAgo ? Math.round((latest.kg - weekAgo.kg) * 10) / 10 : null

  return (
    <main className="screen">
      <div className="between" style={{ paddingTop: 8 }}>
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="eyebrow">{greeting}</span>
          <h1 className="display" style={nameSize ? { fontSize: nameSize, lineHeight: `${nameSize + 2}px`, overflowWrap: 'break-word' } : { overflowWrap: 'break-word' }}>{name || t('today')}</h1>
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
      {isToday && <WeekBar />}
      <div className="between" style={{ background: 'var(--surface-raised)', borderRadius: 999, padding: 4 }}>
        <button className="icon-btn" style={{ background: 'transparent' }} aria-label={t('prevDay')} onClick={() => setViewDate(addDays(viewDate, -1))}><Icon name="back" /></button>
        <button onClick={() => setViewDate(today())} aria-label={isToday ? undefined : t('backToToday')} style={{ border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600 }}>
          {fmt(viewDate, t.lang, { weekday: 'long', day: 'numeric', month: 'short' })}
        </button>
        <button className="icon-btn" style={{ background: 'transparent' }} aria-label={t('nextDay')} disabled={isToday} onClick={() => setViewDate(addDays(viewDate, 1))}><Icon name="forward" /></button>
      </div>

      <SummaryCard date={viewDate} totals={totals} targets={targets} goal={profile.goal} pace={profile.pace} />


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
            // The tip belongs to one logged item (the croissant, not the coffee): that row and the tip share one pink-outlined card.
            const hasTip = tip?.targetId === e.id
            const row = (
              <button className="meal-row" onClick={() => nav(`/meal/${e.id}`)} style={hasTip ? { borderRadius: 0, background: 'transparent' } : undefined}>
                <Thumb photo={e.photo} cat={e.meal} name={e.name} />
                <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                  {/* The meal's own numbers, written the same way as each ingredient's */}
                  <span className="caption">{[t(meal), `${Math.round(m.kcal)} ${t('kcal')}`, `P ${Math.round(m.protein)}`, `C ${Math.round(m.carbs)}`, `F ${Math.round(m.fat)}`].join(' · ')}</span>
                  <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{e.name}</span>
                </span>
              </button>
            )
            if (hasTip && tip) return <div key={e.id} className="tip-group">{row}<MealTipCard tip={tip} /></div>
            return (
              <div key={e.id} className="stack" style={{ gap: 8 }}>
                {row}
                {win?.afterId === e.id && <WinLine meal={win.meal} protein={win.protein} />}
              </div>
            )
          })
        })}
      </div>

      {isToday && <RemindersCard />}

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
          <Link to="/trends" className="small" style={{ fontWeight: 600 }}>{t('seeInsights')}</Link>
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
