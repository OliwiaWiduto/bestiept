import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import type { Meal, Recipe } from '../types'
import { MEALS } from '../types'
import { rankRecipes } from '../lib/pick'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { Avatar, Icon, Sheet, Stepper, Thumb } from '../components/ui'
import { householdLink, useFamily } from '../lib/family'
import AddToPlanSheet from '../components/AddToPlanSheet'
import { isLow, MAIN } from '../lib/nudges'
import { LIBRARY, ownCopy } from '../lib/library'
import { localise } from '../lib/recipeLang'
import { foodArt } from '../lib/art'

export default function Plan() {
  const t = useT()
  const nav = useNavigate()
  const { plan, removePlan, profile, updateProfile, targets } = useStore()
  const people = profile?.household ?? 1
  const [peopleOpen, setPeopleOpen] = useState(false)
  const recipes = useRecipes()
  const { planWeek, setPlanWeek } = useUI()
  // Planning together: each meal shows the picture of whoever added it.
  const partner = householdLink(useFamily((s) => s.links))
  const whoAdded = (ownerId?: string) => {
    if (!partner) return null
    const p = ownerId ? useFamily.getState().links.find((l) => l.person.id === ownerId)?.person : null
    return p ? { name: p.name, avatar: p.avatar } : { name: profile?.name ?? '', avatar: profile?.avatar }
  }
  const [pickFor, setPickFor] = useState<{ date: string; meal: Meal } | null>(null)
  const [planMeal, setPlanMeal] = useState<Meal | undefined>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [planDate, setPlanDate] = useState<string | undefined>()
  // Start at today; earlier days only show once you tap them in the calendar.
  const [from, setFrom] = useState(today())
  const jump = (d: string) => {
    if (d < from) setFrom(d)
    requestAnimationFrame(() => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const thisWeek = weekStart(today())
  const days = weekDays(planWeek)
  const inWeek = plan.filter((p) => days.includes(p.date))
  const range = `${fmt(days[0], t.lang, { day: 'numeric' })} – ${fmt(days[6], t.lang, { day: 'numeric', month: 'long' })}`
  // Week check (Healthy choices): main meals still to come this week, by protein per serving.
  const ahead = inWeek.filter((p) => p.date >= today() && MAIN.includes(p.meal) && !p.leftoverOf)
    .map((p) => ({ meal: p.meal, r: recipes.find((x) => x.id === p.recipeId) })).filter((x) => x.r)
  const lowMeal = targets ? MAIN.find((m) => ahead.filter((x) => x.meal === m && isLow(x.r!.nutrition.protein, targets)).length >= 2) : undefined
  const weekCheck = !targets ? null
    : lowMeal ? t('hcPlanLow', { meal: t(lowMeal).toLowerCase() })
    : ahead.length >= 5 && !ahead.some((x) => isLow(x.r!.nutrition.protein, targets)) ? t('hcPlanGood') : null

  return (
    <main className="screen">
      <div className="between" style={{ paddingTop: 8, alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">{range}</span>
          <h1 className="display">{planWeek === thisWeek ? t('thisWeek') : t('nextWeek')}</h1>
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <button className="icon-btn" aria-label={planWeek === thisWeek ? t('nextWeek') : t('thisWeek')}
          onClick={() => setPlanWeek(planWeek === thisWeek ? addDays(thisWeek, 7) : thisWeek)}>
          <Icon name={planWeek === thisWeek ? 'forward' : 'back'} />
        </button>
        </div>
      </div>
      <Sheet open={peopleOpen} onClose={() => setPeopleOpen(false)} title={t('householdQ')}>
        <p className="muted" style={{ margin: 0 }}>{t('householdHint')}</p>
        <div className="between"><span className="label">{t('people')}</span>
          <Stepper value={people} onChange={(n) => profile && updateProfile({ ...profile, household: n }, false)} min={1} label={t('people')} /></div>
        <button className="btn primary block" onClick={() => setPeopleOpen(false)}>{t('done')}</button>
      </Sheet>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {days.map((d) => {
          const isToday = d === today()
          const has = inWeek.some((p) => p.date === d)
          return (
            <a key={d} href={`#day-${d}`} onClick={(e) => { e.preventDefault(); jump(d) }} aria-label={fmt(d, t.lang, { weekday: 'long', day: 'numeric' })}
              style={{ height: 64, borderRadius: 999, background: isToday ? 'var(--green)' : 'var(--surface-raised)', color: isToday ? 'var(--on-green)' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textDecoration: 'none' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: isToday ? 'var(--on-green)' : 'var(--ink-muted)' }}>{fmt(d, t.lang, { weekday: 'narrow' })}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{fmt(d, t.lang, { day: 'numeric' })}</span>
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: has ? (isToday ? 'var(--lime)' : 'var(--olive)') : 'transparent' }} />
            </a>
          )
        })}
      </div>

      <button className="people-row" onClick={() => setPeopleOpen(true)}>
        <Icon name="heart" size={20} />
        <span className="grow">{t('cookingForLong', { n: people })}</span>
        <span className="small" style={{ color: 'var(--cherry)', fontWeight: 600 }}>{t('change')}</span>
      </button>
      {weekCheck && (
        <div className="row small" style={{ gap: 10, alignItems: 'flex-start', background: lowMeal ? 'var(--cherry-soft)' : 'var(--surface-raised)', borderRadius: 18, padding: '12px 14px', lineHeight: '18px' }}>
          <span style={{ color: lowMeal ? 'var(--cherry)' : 'var(--olive)', flex: 'none' }}><Icon name="sparkle" size={18} /></span><span>{weekCheck}</span>
        </div>
      )}
      {inWeek.length === 0 && <div className="empty"><img src="/icons/cat-cupboard.png" alt="" /><p style={{ margin: 0 }}>{t('planEmpty')}</p></div>}

      {days.map((d) => {
        const items = inWeek.filter((p) => p.date === d).sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal))
        const past = d < today()
        if (d < from) return null
        if (past && items.length === 0 && d !== from) return null
        // What the day adds up to for her (one serving of each planned meal), to plan around her targets.
        const day = items.reduce((acc, p) => { const n = recipes.find((x) => x.id === p.recipeId)?.nutrition; return n ? { kcal: acc.kcal + n.kcal, protein: acc.protein + n.protein, carbs: acc.carbs + n.carbs, fat: acc.fat + n.fat } : acc }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
        const next = MEALS.find((m) => !items.some((p) => p.meal === m)) ?? 'snack'
        return (
          <section key={d} id={`day-${d}`} className="stack" style={{ scrollMarginTop: 20 }}>
            <div className="between">
              <h2 className="heading">{fmt(d, t.lang, { weekday: 'long', day: 'numeric' })}</h2>
              {items.length > 0 && <span className="small muted" style={{ textAlign: 'right' }}><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{Math.round(day.kcal).toLocaleString(t.lang === 'pl' ? 'pl-PL' : 'en-GB')} {t('kcal')}</b> · P {Math.round(day.protein)} · C {Math.round(day.carbs)} · F {Math.round(day.fat)}</span>}
            </div>
            {MEALS.map((m) => {
              const here = items.filter((p) => p.meal === m)
              if (here.length === 0) return null
              return here.map((p) => {
                const r = recipes.find((x) => x.id === p.recipeId)
                if (!r) return null
                return (
                  <div key={p.id} className="meal-row">
                    <button onClick={() => nav(`/recipes/${r.id}?s=${p.leftoverOf ? r.servings : p.servings}&plan=${p.id}`)} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', padding: 0 }}>
                      <span style={{ position: 'relative', flex: 'none' }}>
                        <Thumb photo={r.photo} cat={r.category} name={r.title} />
                        {(() => { const w = whoAdded(p.ownerId); return w && <span className="who-added" title={t('addedBy', { name: w.name })}><Avatar name={w.name} avatar={w.avatar} size={22} /></span> })()}
                      </span>
                      <span className="grow stack" style={{ gap: 2 }}>
                        <span className="row caption" style={{ gap: 6, whiteSpace: 'nowrap' }}>{t(p.meal)}{p.leftoverOf && <span className="tag" style={{ whiteSpace: 'nowrap' }}>{t('leftovers')}</span>}</span>
                        <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{r.title}</span>
                      </span>
                    </button>
                    <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', color: 'var(--ink-muted)' }} aria-label={`${t('remove')} ${r.title}`} onClick={() => removePlan(p.id)}><Icon name="close" size={16} /></button>
                  </div>
                )
              })
            })}
            {past && items.length === 0 && <span className="small muted">{t('nothingPlanned')}</span>}
            {/* One add button per day: a dashed box while the day is empty, then a small text button so the plan stays compact. */}
            {!past && (items.length === 0
              ? <button className="slot" onClick={() => setPickFor({ date: d, meal: next })}><Icon name="plus" size={18} />{t('addMeal')}</button>
              : <button className="slot-snack" onClick={() => setPickFor({ date: d, meal: next })}><Icon name="plus" size={16} />{t('addMeal')}</button>)}
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
  const { plan } = useStore()
  const recipes = useRecipes()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Meal | 'all'>('all')
  const [openFor, setOpenFor] = useState<Meal | undefined>()
  if (open && openFor !== meal) { setOpenFor(meal); setCat(meal && recipes.some((r) => r.category === meal) ? meal : 'all'); setQ('') }
  const query = q.trim().toLowerCase()
  const matches = (r: Recipe) => (cat === 'all' || r.category === cat) && (!query || r.title.toLowerCase().includes(query) || r.ingredients.some((i) => i.name.toLowerCase().includes(query)))
  const { recent, rest } = rankRecipes(recipes.filter(matches), plan, days)
  // Bestie picks come first (the ones she hasn't got a copy of yet), highest protein first.
  const own = useStore((s) => s.recipes)
  const lang = useStore((s) => s.lang)
  const picks = LIBRARY.filter((l) => !own.some((r) => r.libId === l.id && !r.ownerId))
    .filter((l) => (cat === 'all' || l.category === cat) && (!query || l[lang].title.toLowerCase().includes(query)))
    .sort((a, b) => b.nutrition.protein - a.nutrition.protein).slice(0, query ? 10 : 5)
  const pickLib = (id: string) => { const s = useStore.getState(); const c = ownCopy(id, s.recipes, lang, s.saveRecipe); if (c) onPick(localise(c, lang)) }
  const row = (r: Recipe) => (
    <button key={r.id} className="meal-row" onClick={() => onPick(r)}>
      <Thumb photo={r.photo} size={48} cat={r.category} name={r.title} />
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
      {recipes.length > 0 && !recent.length && !rest.length && !picks.length && <p className="muted" style={{ margin: 0 }}>{t('noRecipeMatch')}</p>}
      {picks.length > 0 && <><span className="label">{t('bestiePicks')}</span>{picks.map((l) => (
        <button key={l.id} className="meal-row" onClick={() => pickLib(l.id)}>
          <span className="thumb" style={{ width: 48, height: 48, borderRadius: 14 }}><img src={foodArt(l.en.title, l.category)} alt="" style={{ width: 40, height: 40 }} /></span>
          <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
            <span style={{ fontWeight: 600 }}>{l[lang].title}</span>
            <span className="caption">{l.nutrition.kcal} {t('kcal')} · {l.nutrition.protein}g {t('protein').toLowerCase()} · {t('minutes', { n: l.handsOn })}</span>
          </span>
        </button>
      ))}</>}
      {recent.length > 0 && <><span className="label">{t('pickedBefore')}</span>{recent.map(row)}</>}
      {rest.length > 0 && <><span className="label">{query ? t('results') : t('healthiestFirst')}</span>{rest.map(row)}</>}
    </Sheet>
  )
}
