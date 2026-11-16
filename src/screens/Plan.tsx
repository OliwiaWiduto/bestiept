import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import type { Recipe } from '../types'
import { MEALS } from '../types'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { Icon, Sheet, Thumb } from '../components/ui'
import AddToPlanSheet from '../components/AddToPlanSheet'

export default function Plan() {
  const t = useT()
  const nav = useNavigate()
  const { plan, recipes, removePlan } = useStore()
  const { planWeek, setPlanWeek } = useUI()
  const [pickFor, setPickFor] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [planDate, setPlanDate] = useState<string | undefined>()

  const thisWeek = weekStart(today())
  const days = weekDays(planWeek)
  const inWeek = plan.filter((p) => days.includes(p.date))
  const sortedDays = days.filter((d) => inWeek.some((p) => p.date === d)).length
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
            {items.map((p) => {
              const r = recipes.find((x) => x.id === p.recipeId)
              if (!r) return null
              return (
                <div key={p.id} className="meal-row">
                  <button onClick={() => nav(`/recipes/${r.id}`)} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', padding: 0 }}>
                    <Thumb photo={r.photo} />
                    <span className="grow stack" style={{ gap: 2 }}>
                      <span className="row caption" style={{ gap: 6 }}>{t(p.meal)}{p.leftoverOf && <span className="tag">{t('leftovers')}</span>}</span>
                      <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{r.title}</span>
                    </span>
                    <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{p.leftoverOf ? t(p.servings === 1 ? 'servingN' : 'servingsN', { n: p.servings }) : t('cookN', { n: p.servings })}</span>
                  </button>
                  <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', color: 'var(--ink-muted)' }} aria-label={`${t('remove')} ${r.title}`} onClick={() => removePlan(p.id)}><Icon name="close" size={16} /></button>
                </div>
              )
            })}
            {!past && <button className="dashed" onClick={() => setPickFor(d)}><Icon name="plus" size={20} />{t('addMeal')}</button>}
          </section>
        )
      })}

      {inWeek.some((p) => !p.leftoverOf) && (
        <button className="btn green block" style={{ marginTop: 8 }} onClick={() => nav('/shopping')}><Icon name="bag" size={20} />{t('makeList')}</button>
      )}

      <Sheet open={!!pickFor} onClose={() => setPickFor(null)} title={t('pickRecipe')}>
        {recipes.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('emptyRecipes')}</p>}
        {recipes.map((r) => (
          <button key={r.id} className="meal-row" onClick={() => { setPlanDate(pickFor ?? undefined); setPickFor(null); setRecipe(r) }}>
            <Thumb photo={r.photo} size={48} />
            <span className="grow stack" style={{ gap: 0 }}><span className="caption">{t(r.category)}</span><span style={{ fontWeight: 600 }}>{r.title}</span></span>
          </button>
        ))}
      </Sheet>
      <AddToPlanSheet recipe={recipe} open={!!recipe} initialDate={planDate} onClose={() => setRecipe(null)} />
    </main>
  )
}
