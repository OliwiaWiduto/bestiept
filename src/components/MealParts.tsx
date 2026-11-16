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
  const amount = item.unit === 'g' ? `${Math.round(item.amount)} g` : `${item.amount} ×`
  return (
    <button className="list-row" onClick={onOpen} aria-label={`${t('editIngredient')}: ${item.name}`}
      style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left', gap: 12 }}>
      <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
        <span className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap', flex: 'none' }}>{amount}</span>
        </span>
        <span className="caption">{Math.round(m.kcal)} {t('kcal')} · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}</span>
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
  const [extra, setExtra] = useState({ fibre: start.fibre, sugar: start.sugar })

  const changeAmount = (next: string) => {
    const was = Number(amount), now = Number(next)
    if (was > 0 && now > 0) {
      const f = now / was
      setVals({ kcal: show(Number(vals.kcal) * f), protein: show(Number(vals.protein) * f), carbs: show(Number(vals.carbs) * f), fat: show(Number(vals.fat) * f) })
      setExtra({ fibre: extra.fibre * f, sugar: extra.sugar * f })
    }
    setAmount(next)
  }

  const amt = Number(amount)
  const ok = name.trim() && amt > 0
  const save = () => {
    const div = isG ? amt / 100 : amt
    const per: Macros = {
      kcal: (Number(vals.kcal) || 0) / div, protein: (Number(vals.protein) || 0) / div, carbs: (Number(vals.carbs) || 0) / div, fat: (Number(vals.fat) || 0) / div,
      fibre: extra.fibre / div, sugar: extra.sugar / div,
    }
    onSave({ ...item, name: name.trim(), amount: amt, per })
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
          <Stepper value={item.unit === 'g' ? amt : (amt || 1)} onChange={(n) => changeAmount(String(n))} label={t('servings')} />
        )}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">{t('totalsFor')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
            <label key={k} className="field"><span>{k === 'kcal' ? t('calories') : `${t(k)} (g)`}</span>
              <input className="input" type="number" inputMode="decimal" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>
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
