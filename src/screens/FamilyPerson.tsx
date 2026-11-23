import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRecipes } from '../lib/recipeLang'
import { useT } from '../i18n'
import { Avatar, BackButton, Icon, MacroBar, toast } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { fetchTheirDay, fetchTheirPlan, removeLink, setHousehold, setShare, shareOf, useFamily, type Share } from '../lib/family'
import { syncNow } from '../lib/sync'
import { add } from '../lib/nutrition'
import { sumItems } from '../lib/nutrition'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { MEALS, type LogEntry, type Macros, type PlanItem } from '../types'


function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="switch-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="grow">{label}</span>
      <span className="switch" aria-hidden><span /></span>
    </button>
  )
}

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 }

export default function FamilyPerson() {
  const t = useT()
  const { id = '' } = useParams()
  const recipes = useRecipes()
  const link = useFamily((s) => s.links.find((l) => l.person.id === id && l.status === 'accepted'))
  const theirs = useFamily((s) => shareOf(s.theirs, id))
  const mine = useFamily((s) => shareOf(s.mine, id))
  const nav = useNavigate()
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
  const recipesOnly = mine.recipes && !mine.plan && !mine.list && !mine.macros
  const theyShare = [theirs.recipes && t('recipesWord'), theirs.plan && t('mealPlan'), theirs.list && t('shoppingList'), theirs.macros && t('macros')].filter(Boolean) as string[]
  const togetherSwitch = async (v: boolean) => {
    if (!(await setHousehold(link.id, v))) { toast(t('planTogetherSetup')); return }
    const uid = useFamily.getState().uid
    if (uid) await syncNow(uid).catch(console.error)
    toast(t(v ? 'planTogetherDone' : 'planTogetherOff', { name }))
  }
  const sharing = async (key: keyof Share, v: boolean) => { if (!(await setShare(id, { [key]: v })) && key === 'recipes') toast(t('recipeShareSetup')) }

  return (
    <main className="screen">
      <div className="row"><BackButton to="/family" /></div>
      <div className="row" style={{ gap: 14 }}>
        <Avatar name={name} avatar={link.person.avatar} size={64} />
        <div className="stack" style={{ gap: 0 }}>
          <h1 className="display" style={{ margin: 0 }}>{name}</h1>
          {link.person.username && <span className="caption">@{link.person.username}</span>}
        </div>
      </div>

      <section className="card stack" style={{ gap: 8 }}>
        <Switch label={t('planTogether')} on={!!link.household} onChange={togetherSwitch} />
        <span className="caption">{t(link.household ? 'planTogetherOn' : 'planTogetherHint', { name })}</span>
      </section>

      <section className="card stack" style={{ gap: 10 }}>
        <div className="between">
          <h2 className="heading">{t('youShare', { name })}</h2>
          {!recipesOnly && <button className="btn ghost small" style={{ border: 'none', padding: '0 4px' }}
            onClick={() => setShare(id, { recipes: true, plan: false, list: false, macros: false })}>{t('recipesOnly')}</button>}
        </div>
        <Switch label={t('shareMyRecipes')} on={mine.recipes} onChange={(v) => sharing('recipes', v)} />
        {!link.household && <Switch label={t('shareMyPlan')} on={mine.plan} onChange={(v) => sharing('plan', v)} />}
        {!link.household && <Switch label={t('shareMyList')} on={mine.list} onChange={(v) => sharing('list', v)} />}
        <Switch label={t('shareMyMacros')} on={mine.macros} onChange={(v) => sharing('macros', v)} />
        <span className="caption">{t('weightNeverShared')}</span>
      </section>
      <p className="small muted" style={{ margin: 0 }}>{theyShare.length ? t('theyShare', { name, what: theyShare.join(', ') }) : t('theyShareNothing', { name })}</p>

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

      {theirs.plan && !link.household && (
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

      <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={async () => { if (confirm(t('unlinkConfirm', { name }))) { await removeLink(link.id); nav('/family') } }}>{t('unlink')}</button>
    </main>
  )
}
