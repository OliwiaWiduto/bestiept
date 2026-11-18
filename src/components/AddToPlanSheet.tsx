import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MEALS, type Meal, type Recipe } from '../types'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { Sheet, Stepper, toast } from './ui'

/** Pick a day, meal and servings; offers to put spare servings on another day as leftovers. */
export default function AddToPlanSheet({ recipe, open, onClose, initialDate, initialMeal }: { recipe: Recipe | null; open: boolean; onClose: () => void; initialDate?: string; initialMeal?: Meal }) {
  const t = useT()
  const addPlan = useStore((s) => s.addPlan)
  const [date, setDate] = useState(initialDate ?? today())
  const [meal, setMeal] = useState<Meal>('dinner')
  const [servings, setServings] = useState(2)
  const people = useStore((st) => st.profile?.household ?? 1)
  const [leftoverDays, setLeftoverDays] = useState<string[]>([])
  const [leftoverMeal, setLeftoverMeal] = useState<Meal>('lunch')
  const [stage, setStage] = useState<'pick' | 'leftovers'>('pick')
  const [lastId, setLastId] = useState<string | null>(null)

  useEffect(() => {
    if (open && recipe) { setDate(initialDate ?? today()); setMeal(initialMeal ?? recipe.category); setServings(Math.max(recipe.servings, people)); setStage('pick'); setLeftoverDays([]); setLeftoverMeal('lunch') }
  }, [open, recipe, initialDate, initialMeal, people])
  if (!recipe) return null

  const days = [...weekDays(weekStart(today())), ...weekDays(addDays(weekStart(today()), 7))].filter((d) => d >= today())
  // Everyone she cooks for eats now; whatever's left becomes meals for later.
  const extra = Math.floor((servings - people) / people)

  return (
    <Sheet open={open} onClose={onClose} title={stage === 'pick' ? t('addToPlan') : t('leftovers')}>
      {stage === 'pick' && (
        <>
          <span className="label">{t('whichDay')}</span>
          <div className="chips scroll">
            {days.map((d) => (
              <button key={d} className="chip" aria-pressed={date === d} onClick={() => setDate(d)} style={{ height: 52, flexDirection: 'column', justifyContent: 'center', lineHeight: '16px' }}>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{fmt(d, t.lang, { weekday: 'short' })}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{fmt(d, t.lang, { day: 'numeric' })}</span>
              </button>
            ))}
          </div>
          <span className="label">{t('whichMeal')}</span>
          <div className="chips">{MEALS.map((m) => <button key={m} className="chip" aria-pressed={meal === m} onClick={() => setMeal(m)}>{t(m)}</button>)}</div>
          <div className="between"><span className="label">{t('cookingFor')}</span><Stepper value={servings} onChange={setServings} label={t('servings')} /></div>
          <span className="caption">{t('servingsHint', { n: people })}</span>
          <button className="btn primary block" onClick={() => {
            const id = addPlan({ date, meal, recipeId: recipe.id, servings })
            setLastId(id)
            if (extra >= 1) { setStage('leftovers'); setLeftoverDays([addDays(date, 1)]) } else { toast(t('addedToPlan')); onClose() }
          }}>{t('addToPlan')}</button>
        </>
      )}
      {stage === 'leftovers' && (
        <>
          <p style={{ margin: 0 }}>{t('leftoversOffer', { n: extra })}</p>
          <div className="chips scroll">
            {days.filter((d) => d > date).map((d) => {
              const on = leftoverDays.includes(d)
              return (
                <button key={d} className="chip" aria-pressed={on} disabled={!on && leftoverDays.length >= extra}
                  onClick={() => setLeftoverDays(on ? leftoverDays.filter((x) => x !== d) : [...leftoverDays, d].sort())}
                  style={{ height: 52, flexDirection: 'column', justifyContent: 'center', lineHeight: '16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{fmt(d, t.lang, { weekday: 'short' })}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{fmt(d, t.lang, { day: 'numeric' })}</span>
                </button>
              )
            })}
          </div>
          <div className="between" style={{ gap: 12 }}>
            <div className="chips" role="group">
              {(['lunch', 'dinner'] as const).map((m) => <button key={m} className="chip" aria-pressed={leftoverMeal === m} onClick={() => setLeftoverMeal(m)}>{t(m === 'lunch' ? 'forLunch' : 'forDinner')}</button>)}
            </div>
            <span className="small muted" aria-live="polite" style={{ whiteSpace: 'nowrap' }}>{t('leftoversLeft', { n: leftoverDays.length, t: extra })}</span>
          </div>
          <div className="row">
            <button className="btn secondary grow" onClick={() => { toast(t('addedToPlan')); onClose() }}>{t('notNow')}</button>
            <button className="btn primary grow" disabled={!leftoverDays.length || !lastId} onClick={() => {
              leftoverDays.forEach((d) => addPlan({ date: d, meal: leftoverMeal, recipeId: recipe.id, servings: people, leftoverOf: lastId! }))
              toast(t('addedToPlan')); onClose()
            }}>{t('addLeftovers')}</button>
          </div>
        </>
      )}
    </Sheet>
  )
}
