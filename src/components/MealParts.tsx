import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { FoodItem, Macros } from '../types'
import { itemMacros } from '../lib/nutrition'
import { usePhoto } from '../lib/sync'
import { Icon, Stepper } from './ui'

/** Big photo on top, name in our display font underneath, with a small pen to rename. */
export function MealHeader({ photo, name, onName }: { photo?: string; name: string; onName: (n: string) => void }) {
  const t = useT()
  const url = usePhoto(photo)
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  return (
    <div className="stack" style={{ gap: 14 }}>
      {photo && <div role="img" aria-label={name} style={{ height: 240, borderRadius: 28, background: `url(${url}) center / cover` }} />}
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        {editing ? (
          <input ref={ref} className="input grow" aria-label={t('itemName')} value={name} onChange={(e) => onName(e.target.value)}
            onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)} />
        ) : (
          <>
            <h1 className="title grow" style={{ paddingTop: 2 }}>{name || '…'}</h1>
            <button className="pen" aria-label={t('editName')} onClick={() => setEditing(true)}><Icon name="edit" size={18} /></button>
          </>
        )}
      </div>
    </div>
  )
}

/** One ingredient: name on top with the amount to the right, macros below. Tap to edit. */
export function IngredientRow({ item, onOpen }: { item: FoodItem; onOpen: () => void }) {
  const t = useT()
  const m = itemMacros(item)
  const amount = item.unit === 'g' ? `${Math.round(item.amount)} g` : `${Math.round(item.amount * 100) / 100} ×`
  return (
    <button className="list-row" onClick={onOpen} aria-label={`${t('editIngredient')}: ${item.name}`}
      style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left', gap: 12 }}>
      <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
        <span className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap', flex: 'none' }}>{amount}</span>
        </span>
        <span className="caption">{Math.round(m.kcal)} {t('kcal')} · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}{item.src === 'ai' && <> · <span style={{ color: 'var(--cherry)' }}>{t('estimate')}</span></>}</span>
      </span>
      <Icon name="forward" size={16} />
    </button>
  )
}

type Vals = { kcal: string; protein: string; carbs: string; fat: string }
const show = (n: number) => String(Math.round(n * 10) / 10)

/** Edit an ingredient. The macros are the totals for the amount shown; changing the amount rescales them. */
export function IngredientForm({ item, onSave, onDelete, onCancel }: { item: FoodItem; onSave: (i: FoodItem) => void; onDelete: () => void; onCancel: () => void }) {
  const t = useT()
  const isG = item.unit === 'g'
  const start = itemMacros(item)
  const [name, setName] = useState(item.name)
  const [amount, setAmount] = useState(isG ? String(Math.round(item.amount)) : String(item.amount))
  const [vals, setVals] = useState<Vals>({ kcal: show(start.kcal), protein: show(start.protein), carbs: show(start.carbs), fat: show(start.fat) })
  // Figures for one unit of the amount (1 g, or 1 serving). Changing the amount always rescales from these,
  // so clearing the box or typing digit by digit can't throw the numbers off.
  const [unitVals, setUnitVals] = useState<Macros>(() => {
    const per = item.per
    return isG ? { kcal: per.kcal / 100, protein: per.protein / 100, carbs: per.carbs / 100, fat: per.fat / 100, fibre: per.fibre / 100, sugar: per.sugar / 100 } : { ...per }
  })

  const changeAmount = (next: string) => {
    setAmount(next)
    const now = Number(next)
    if (now > 0) setVals({ kcal: show(unitVals.kcal * now), protein: show(unitVals.protein * now), carbs: show(unitVals.carbs * now), fat: show(unitVals.fat * now) })
  }
  const changeVal = (k: keyof Vals, v: string) => {
    setVals({ ...vals, [k]: v })
    const now = Number(amount)
    if (now > 0) setUnitVals({ ...unitVals, [k]: (Number(v) || 0) / now })
  }

  const amt = Number(amount)
  const ok = name.trim() && amt > 0
  const save = () => {
    const m = isG ? 100 : 1
    const per: Macros = { kcal: unitVals.kcal * m, protein: unitVals.protein * m, carbs: unitVals.carbs * m, fat: unitVals.fat * m, fibre: unitVals.fibre * m, sugar: unitVals.sugar * m }
    const edited = (['kcal', 'protein', 'carbs', 'fat'] as const).some((k) => Math.abs(per[k] - item.per[k]) > 0.01)
    onSave({ ...item, name: name.trim(), amount: amt, per, src: edited ? 'you' : item.src })
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <label className="field"><span>{t('itemName')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="between">
        <span className="label">{t('amountLabel')}</span>
        {isG ? (
          <span className="grams" style={{ height: 48 }}><input aria-label={t('grams')} type="number" inputMode="decimal" value={amount} onChange={(e) => changeAmount(e.target.value)} /><span className="muted">g</span></span>
        ) : (
          <Stepper value={amt || 1} onChange={(n) => changeAmount(String(n))} min={0.25} step={0.25} label={t('servings')} />
        )}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">{t('totalsFor')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
            <label key={k} className="field"><span>{k === 'kcal' ? t('calories') : `${t(k)} (g)`}</span>
              <input className="input" type="number" inputMode="decimal" value={vals[k]} onChange={(e) => changeVal(k, e.target.value)} /></label>
          ))}
        </div>
      </div>
      <button className="btn primary block" disabled={!ok} onClick={save}>{t('save')}</button>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn ghost" style={{ border: 'none' }} onClick={onCancel}>{t('cancel')}</button>
        <button className="btn ghost" style={{ color: 'var(--cherry)', border: 'none' }} onClick={onDelete}><Icon name="trash" size={18} />{t('removeIngredient')}</button>
      </div>
    </div>
  )
}
