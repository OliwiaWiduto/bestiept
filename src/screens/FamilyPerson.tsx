import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRecipes } from '../lib/recipeLang'
import { useT } from '../i18n'
import { BackButton, Icon, MacroBar } from '../components/ui'
import { fetchTheirDay, fetchTheirPlan, shareOf, useFamily } from '../lib/family'
import { add } from '../lib/nutrition'
import { sumItems } from '../lib/nutrition'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { MEALS, type LogEntry, type Macros, type PlanItem } from '../types'

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 }

export default function FamilyPerson() {
  const t = useT()
  const { id = '' } = useParams()
  const recipes = useRecipes()
  const link = useFamily((s) => s.links.find((l) => l.person.id === id && l.status === 'accepted'))
  const theirs = useFamily((s) => shareOf(s.theirs, id))
  const [date, setDate] = useState(today())
  const [day, setDay] = useState<{ logs: LogEntry[]; targets: Macros | null } | null>(null)
  const [plan, setPlan] = useState<PlanItem[] | null>(null)
  const week = weekDays(weekStart(today()))

  useEffect(() => { if (theirs.macros) { setDay(null); fetchTheirDay(id, date).then(setDay) } }, [id, date, theirs.macros])
  useEffect(() => { if (theirs.plan) fetchTheirPlan(id, week[0], week[6]).then(setPlan) }, [id, theirs.plan, week[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!link) return <main className="screen"><div className="row"><BackButton to="/family" /></div><p className="muted">{t('notLinked')}</p></main>
  const name = link.person.name
  const totals = (day?.logs ?? []).reduce((acc, l) => add(acc, sumItems(l.items)), { ...ZERO })
  const tg = day?.targets

  return (
    <main className="screen">
      <div className="row"><BackButton to="/family" /></div>
      <h1 className="display">{name}</h1>

      {theirs.macros && (
        <>
          <div className="row card tight" style={{ justifyContent: 'space-between', padding: '6px 8px' }}>
            <button className="icon-btn" style={{ background: 'transparent' }} aria-label={t('prevDay')} onClick={() => setDate(addDays(date, -1))}><Icon name="back" /></button>
            <span style={{ fontWeight: 600 }}>{fmt(date, t.lang, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <button className="icon-btn" style={{ background: 'transparent' }} aria-label={t('nextDay')} disabled={date >= today()} onClick={() => setDate(addDays(date, 1))}><Icon name="forward" /></button>
          </div>
          <section className="card stack" style={{ gap: 16 }} aria-label={t('macros')}>
            {!day ? <span className="muted">{t('loading')}</span> : <>
              <div className="between"><span className="label">{t('kcal')}</span><span><b>{Math.round(totals.kcal)}</b>{tg ? ` / ${tg.kcal}` : ''}</span></div>
              <MacroBar label={t('protein')} value={totals.protein} target={tg?.protein ?? 0} color="var(--cherry)" />
              <MacroBar label={t('carbs')} value={totals.carbs} target={tg?.carbs ?? 0} color="var(--butter)" />
              <MacroBar label={t('fat')} value={totals.fat} target={tg?.fat ?? 0} color="var(--olive)" />
              <MacroBar label={t('fibre')} value={totals.fibre} target={tg?.fibre ?? 0} color="var(--lime)" />
            </>}
          </section>
          {day && day.logs.length > 0 && (
            <section className="card stack" style={{ gap: 6 }}>
              {MEALS.flatMap((m) => day.logs.filter((l) => l.meal === m)).map((l) => (
                <div key={l.id} className="between small"><span><span className="muted">{t(l.meal)} · </span>{l.name}</span><span className="muted">{Math.round(sumItems(l.items).kcal)} {t('kcal')}</span></div>
              ))}
            </section>
          )}
        </>
      )}

      {theirs.plan && (
        <section className="card stack" style={{ gap: 10 }}>
          <h2 className="heading">{t('theirWeek', { name })}</h2>
          {!plan ? <span className="muted">{t('loading')}</span> : week.map((d) => {
            const items = plan.filter((p) => p.date === d)
            if (!items.length) return null
            return (
              <div key={d} className="stack" style={{ gap: 2 }}>
                <span className="caption">{fmt(d, t.lang, { weekday: 'long', day: 'numeric' })}</span>
                {items.map((p) => <span key={p.id} className="small"><span className="muted">{t(p.meal)} · </span>{recipes.find((r) => r.id === p.recipeId)?.title ?? '…'}{p.leftoverOf ? ` (${t('leftovers')})` : ''}</span>)}
              </div>
            )
          })}
          {plan && plan.length === 0 && <span className="muted small">{t('nothingPlanned')}</span>}
        </section>
      )}

      {!theirs.macros && !theirs.plan && <p className="muted">{t('theyShareNothing', { name })}</p>}
    </main>
  )
}
