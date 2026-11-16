import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import type { Meal, Recipe } from '../types'
import { MEALS } from '../types'
import { buildList } from '../lib/shopping'
import { rankRecipes } from '../lib/pick'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { Icon, Sheet, Thumb } from '../components/ui'
import AddToPlanSheet from '../components/AddToPlanSheet'

export default function Plan() {
  const t = useT()
  const nav = useNavigate()
  const { plan, recipes, removePlan, shopping } = useStore()
  const { planWeek, setPlanWeek } = useUI()
  const [pickFor, setPickFor] = useState<{ date: string; meal: Meal } | null>(null)
  const [planMeal, setPlanMeal] = useState<Meal | undefined>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [planDate, setPlanDate] = useState<string | undefined>()

  const thisWeek = weekStart(today())
  const days = weekDays(planWeek)
  const inWeek = plan.filter((p) => days.includes(p.date))
  const sortedDays = days.filter((d) => inWeek.some((p) => p.date === d)).length
  const list = useMemo(() => buildList(inWeek, recipes, shopping, today()), [inWeek, recipes, shopping])
  const toBuy = list.need.filter((l) => !shopping.ticked[`${planWeek}:${l.key}`]).length
  const range = `${fmt(days[0], t.lang, { day: 'numeric' })} – ${fmt(days[6], t.lang, { day: 'numeric', month: 'long' })}`

  return (
    <main className="screen">
      <div className="stack" style={{ gap: 2, paddingTop: 8 }}>
        <span className="eyebrow">{range}</span>
        <h1 className="display">{planWeek === thisWeek ? t('thisWeek') : t('nextWeek')}</h1>
      </div>
      <div className="chips" role="group">
        <button className="chip" aria-pressed={planWeek === thisWeek} onClick={() => setPlanWeek(thisWeek)}>{t('thisWeek')}</button>
        <button className="chip" aria-pressed={planWeek !== thisWeek} onClick={() => setPlanWeek(addDays(thisWeek, 7))}>{t('nextWeek')}</button>
      </div>

      {inWeek.some((p) => !p.leftoverOf) && (
        <button className="shop-card" onClick={() => nav('/shopping')}>
          <img src="/icons/cat-fruitveg.png" alt="" />
          <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{t('yourList')}</span>
            <span className="small" style={{ color: 'var(--green-soft)' }}>{toBuy ? t('toBuyN', { n: toBuy }) : t('allBought')}</span>
          </span>
          <Icon name="forward" size={20} />
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {days.map((d) => {
          const isToday = d === today()
          const has = inWeek.some((p) => p.date === d)
          return (
            <a key={d} href={`#day-${d}`} aria-label={fmt(d, t.lang, { weekday: 'long', day: 'numeric' })}
              style={{ height: 64, borderRadius: 999, background: isToday ? 'var(--green)' : 'var(--surface-raised)', color: isToday ? 'var(--on-green)' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textDecoration: 'none' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: isToday ? 'var(--on-green)' : 'var(--ink-muted)' }}>{fmt(d, t.lang, { weekday: 'narrow' })}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{fmt(d, t.lang, { day: 'numeric' })}</span>
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: has ? (isToday ? 'var(--lime)' : 'var(--olive)') : 'transparent' }} />
            </a>
          )
        })}
      </div>

      {sortedDays > 0 && <div className="tip"><Icon name="heart" size={24} /><span>{sortedDays === 7 ? t('planTipAll') : t('planTip', { n: sortedDays })}</span></div>}
      {inWeek.length === 0 && <div className="empty"><img src="/icons/cat-cupboard.png" alt="" /><p style={{ margin: 0 }}>{t('planEmpty')}</p></div>}

      {days.map((d) => {
        const items = inWeek.filter((p) => p.date === d).sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal))
        const past = d < today()
        if (past && items.length === 0) return null
        return (
          <section key={d} id={`day-${d}`} className="stack" style={{ scrollMarginTop: 20 }}>
            <div className="between">
              <h2 className="heading">{fmt(d, t.lang, { weekday: 'long', day: 'numeric' })}</h2>
              <span className="small muted">{items.length ? t(items.length === 1 ? 'mealN' : 'mealsN', { n: items.length }) : ''}</span>
            </div>
            {MEALS.map((m) => {
              const here = items.filter((p) => p.meal === m)
              if (here.length === 0) {
                if (past || m === 'snack') return null
                return <button key={m} className="slot" onClick={() => setPickFor({ date: d, meal: m })}><Icon name="plus" size={18} />{t(m)}</button>
              }
              return here.map((p) => {
                const r = recipes.find((x) => x.id === p.recipeId)
                if (!r) return null
                return (
                  <div key={p.id} className="meal-row">
                    <button onClick={() => nav(`/recipes/${r.id}`)} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', padding: 0 }}>
                      <Thumb photo={r.photo} />
                      <span className="grow stack" style={{ gap: 2 }}>
                        <span className="row caption" style={{ gap: 6, whiteSpace: 'nowrap' }}>{t(p.meal)}{p.leftoverOf && <span className="tag" style={{ whiteSpace: 'nowrap' }}>{t('leftovers')}</span>}</span>
                        <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{r.title}</span>
                      </span>
                      <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{p.leftoverOf ? t(p.servings === 1 ? 'servingN' : 'servingsN', { n: p.servings }) : t('cookN', { n: p.servings })}</span>
                    </button>
                    <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', color: 'var(--ink-muted)' }} aria-label={`${t('remove')} ${r.title}`} onClick={() => removePlan(p.id)}><Icon name="close" size={16} /></button>
                  </div>
                )
              })
            })}
            {!past && !items.some((p) => p.meal === 'snack') && <button className="slot-snack" onClick={() => setPickFor({ date: d, meal: 'snack' })}><Icon name="plus" size={16} />{t('addSnack')}</button>}
          </section>
        )
      })}


      <RecipePicker open={!!pickFor} meal={pickFor?.meal} days={days} onClose={() => setPickFor(null)}
        onPick={(r) => { setPlanDate(pickFor?.date); setPlanMeal(pickFor?.meal); setPickFor(null); setRecipe(r) }} />
      <AddToPlanSheet recipe={recipe} open={!!recipe} initialDate={planDate} initialMeal={planMeal} onClose={() => setRecipe(null)} />
    </main>
  )
}

function RecipePicker({ open, meal, days, onClose, onPick }: { open: boolean; meal?: Meal; days: string[]; onClose: () => void; onPick: (r: Recipe) => void }) {
  const t = useT()
  const { recipes, plan } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Meal | 'all'>('all')
  const [openFor, setOpenFor] = useState<Meal | undefined>()
  if (open && openFor !== meal) { setOpenFor(meal); setCat(meal && recipes.some((r) => r.category === meal) ? meal : 'all'); setQ('') }
  const query = q.trim().toLowerCase()
  const matches = (r: Recipe) => (cat === 'all' || r.category === cat) && (!query || r.title.toLowerCase().includes(query) || r.ingredients.some((i) => i.name.toLowerCase().includes(query)))
  const { recent, rest } = rankRecipes(recipes.filter(matches), plan, days)
  const row = (r: Recipe) => (
    <button key={r.id} className="meal-row" onClick={() => onPick(r)}>
      <Thumb photo={r.photo} size={48} />
      <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 600 }}>{r.title}</span>
        <span className="caption">{Math.round(r.nutrition.kcal)} {t('kcal')} · {Math.round(r.nutrition.protein)}g {t('protein').toLowerCase()}{r.minutes ? ` · ${t('minutes', { n: r.minutes })}` : ''}</span>
      </span>
    </button>
  )
  return (
    <Sheet open={open} onClose={() => { setOpenFor(undefined); onClose() }} title={meal ? t('pickFor', { meal: t(meal).toLowerCase() }) : t('pickRecipe')}>
      <input className="input" placeholder={t('searchRecipes')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('searchRecipes')} />
      <div className="chips scroll" role="group">
        <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>{t('all')}</button>
        {MEALS.map((m) => <button key={m} className="chip" aria-pressed={cat === m} onClick={() => setCat(m)}>{t(m)}</button>)}
      </div>
      {recipes.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('emptyRecipes')}</p>}
      {recipes.length > 0 && !recent.length && !rest.length && <p className="muted" style={{ margin: 0 }}>{t('noResults')}</p>}
      {recent.length > 0 && <><span className="label">{t('pickedBefore')}</span>{recent.map(row)}</>}
      {rest.length > 0 && <><span className="label">{query ? t('results') : t('healthiestFirst')}</span>{rest.map(row)}</>}
    </Sheet>
  )
}
