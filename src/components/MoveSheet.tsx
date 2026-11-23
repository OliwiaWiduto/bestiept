import { useState } from 'react'
import { useT } from '../i18n'
import { MEALS, type Meal, type PlanItem } from '../types'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { Sheet } from './ui'

/** Move a planned meal to another day or meal. */
export default function MoveSheet({ item, onClose, onMove }: { item: PlanItem | null; onClose: () => void; onMove: (date: string, meal: Meal) => void }) {
  const t = useT()
  const [date, setDate] = useState('')
  const [meal, setMeal] = useState<Meal>('dinner')
  const [for_, setFor] = useState<string | null>(null)
  if (item && for_ !== item.id) { setFor(item.id); setDate(item.date); setMeal(item.meal) }
  const days = [...weekDays(weekStart(today())), ...weekDays(addDays(weekStart(today()), 7))].filter((d) => d >= today())
  return (
    <Sheet open={!!item} onClose={() => { setFor(null); onClose() }} title={t('moveMeal')}>
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
      <button className="btn primary block" disabled={!item || (date === item.date && meal === item.meal)} onClick={() => onMove(date, meal)}>{t('moveHere')}</button>
    </Sheet>
  )
}

