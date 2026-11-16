import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MEALS, type Meal, type Recipe } from '../types'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { Sheet, Stepper, toast } from './ui'

/** Pick a day, meal and servings; offers to put spare servings on another day as leftovers. */
export default function AddToPlanSheet({ recipe, open, onClose, initialDate }: { recipe: Recipe | null; open: boolean; onClose: () => void; initialDate?: string }) {
  const t = useT()
  const addPlan = useStore((s) => s.addPlan)
  const [date, setDate] = useState(initialDate ?? today())
  const [meal, setMeal] = useState<Meal>('dinner')
  const [servings, setServings] = useState(2)
  const [leftoverFor, setLeftoverFor] = useState<string | null>(null)
  const [stage, setStage] = useState<'pick' | 'leftovers'>('pick')
  const [lastId, setLastId] = useState<string | null>(null)

  useEffect(() => {
    if (open && recipe) { setDate(initialDate ?? today()); setMeal(recipe.category); setServings(recipe.servings); setStage('pick'); setLeftoverFor(null) }
  }, [open, recipe, initialDate])
  if (!recipe) return null

  const days = [...weekDays(weekStart(today())), ...weekDays(addDays(weekStart(today()), 7))].filter((d) => d >= today())
  const extra = servings - 1

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
          <button className="btn primary block" onClick={() => {
            const id = addPlan({ date, meal, recipeId: recipe.id, servings })
            setLastId(id)
            if (extra >= 1) { setStage('leftovers'); setLeftoverFor(addDays(date, 1)) } else { toast(t('addedToPlan')); onClose() }
          }}>{t('addToPlan')}</button>
        </>
      )}
      {stage === 'leftovers' && (
        <>
          <p style={{ margin: 0 }}>{t('leftoversOffer', { n: extra })}</p>
          <div className="chips scroll">
            {days.filter((d) => d > date).map((d) => (
              <button key={d} className="chip" aria-pressed={leftoverFor === d} onClick={() => setLeftoverFor(d)} style={{ height: 52, flexDirection: 'column', justifyContent: 'center', lineHeight: '16px' }}>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{fmt(d, t.lang, { weekday: 'short' })}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{fmt(d, t.lang, { day: 'numeric' })}</span>
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn secondary grow" onClick={() => { toast(t('addedToPlan')); onClose() }}>{t('notNow')}</button>
            <button className="btn primary grow" disabled={!leftoverFor || !lastId} onClick={() => {
              addPlan({ date: leftoverFor!, meal: 'lunch', recipeId: recipe.id, servings: 1, leftoverOf: lastId! })
              toast(t('addedToPlan')); onClose()
            }}>{t('addLeftovers')}</button>
          </div>
        </>
      )}
    </Sheet>
  )
}
