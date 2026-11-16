import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MEALS, type FoodItem, type LogEntry } from '../types'
import { itemMacros, sumItems } from '../lib/nutrition'
import { useFoodSearch } from '../lib/foodSearch'
import { uid } from '../lib/util'
import { usePhoto } from '../lib/sync'
import { BackButton, Icon, MacroGrid, PhotoButton, Sheet, Stepper } from '../components/ui'

export default function MealEdit() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const { logs, saveLog, deleteLog } = useStore()
  const original = logs.find((l) => l.id === id)
  const [draft, setDraft] = useState<LogEntry | null>(original ?? null)
  const [adding, setAdding] = useState(false)
  const photoUrl = usePhoto(draft?.photo)
  if (!draft) return <main className="screen"><BackButton to="/" /></main>

  const totals = sumItems(draft.items)
  const setItem = (iid: string, patch: Partial<FoodItem>) => setDraft({ ...draft, items: draft.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) })

  return (
    <main className="screen no-nav">
      <div className="between">
        <BackButton />
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t('yourMeal')}</span>
        <PhotoButton className="icon-btn" label={draft.photo ? t('changePhoto') : t('addPhoto')} onPhoto={(photo) => setDraft({ ...draft, photo })}><Icon name="camera" /></PhotoButton>
      </div>

      {draft.photo && <div role="img" aria-label={draft.name} style={{ height: 220, borderRadius: 28, background: `url(${photoUrl}) center / cover` }} />}

      <div className="stack">
        <input className="title" aria-label={t('itemName')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }} />
        <div className="chips" role="group" aria-label={t('whichMeal')}>
          {MEALS.map((m) => <button key={m} className="chip" aria-pressed={draft.meal === m} onClick={() => setDraft({ ...draft, meal: m })}>{t(m)}</button>)}
        </div>
      </div>

      <section className="card stack" style={{ gap: 16 }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: '52px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--green)' }}>{Math.round(totals.kcal)}</span>
          <span className="label muted" style={{ fontWeight: 500 }}>{t('kcal')}</span>
        </div>
        <MacroGrid m={totals} />
      </section>

      <div className="between" style={{ paddingTop: 4 }}>
        <h2 className="heading">{t('whatsIn')}</h2>
        <span className="small muted">{t('ingredientsN', { n: draft.items.length })}</span>
      </div>
      <div className="card tight">
        {draft.items.map((i) => {
          const m = itemMacros(i)
          return (
            <div key={i.id} className="list-row">
              <div className="grow stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{i.name}</span>
                <span className="caption">{Math.round(m.kcal)} {t('kcal')} · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}</span>
              </div>
              {i.unit === 'g' ? (
                <label className="grams"><span className="sr-only">{i.name} {t('grams')}</span>
                  <input type="number" inputMode="decimal" value={i.amount} onChange={(e) => setItem(i.id, { amount: Number(e.target.value) || 0 })} /><span className="muted">g</span>
                </label>
              ) : (
                <Stepper value={i.amount} onChange={(n) => setItem(i.id, { amount: n })} label={t('servings')} />
              )}
              <button className="icon-btn" style={{ width: 36, height: 36, background: 'transparent', color: 'var(--ink-muted)' }} aria-label={`${t('remove')} ${i.name}`}
                onClick={() => setDraft({ ...draft, items: draft.items.filter((x) => x.id !== i.id) })}><Icon name="close" size={18} /></button>
            </div>
          )
        })}
      </div>
      <button className="dashed" onClick={() => setAdding(true)}><Icon name="plus" size={20} />{t('addSomething')}</button>
      <span className="small muted" style={{ textAlign: 'center', marginTop: -8 }}>{t('addHint')}</span>
      <button className="btn ghost" style={{ color: 'var(--cherry)', alignSelf: 'center', border: 'none' }}
        onClick={() => { deleteLog(draft.id); nav('/') }}><Icon name="trash" size={18} />{t('deleteMeal')}</button>

      <div className="bottom-bar">
        <button className="btn primary block" onClick={() => { saveLog(draft); nav('/') }}>{t('saveTo', { meal: t(draft.meal) })}</button>
      </div>

      <AddItemSheet open={adding} onClose={() => setAdding(false)} onAdd={(item) => { setDraft({ ...draft, items: [...draft.items, item] }); setAdding(false) }} />
    </main>
  )
}

function AddItemSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (i: FoodItem) => void }) {
  const t = useT()
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const list = useFoodSearch(q, t.lang, 12)
  return (
    <Sheet open={open} onClose={onClose} title={t('addSomething')}>
      <input className="input" placeholder={t('searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card tight">
        {list.map((f) => (
          <button key={f.key} className="list-row" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
            onClick={() => onAdd({ id: uid(), name: f.name, amount: f.portion, unit: 'g', per: f.per })}>
            <span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
            <span className="small muted">{f.portion}g</span>
          </button>
        ))}
      </div>
      <h3 className="heading" style={{ fontSize: 17 }}>{t('quickAdd')}</h3>
      <input className="input" placeholder={t('quickName')} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
          <label key={k} className="field"><span className="caption">{k === 'kcal' ? t('kcal') : t(k)}</span>
            <input className="input" style={{ padding: '0 10px' }} type="number" inputMode="decimal" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} /></label>
        ))}
      </div>
      <button className="btn green block" disabled={!custom.name.trim() || custom.kcal === ''}
        onClick={() => { onAdd({ id: uid(), name: custom.name.trim(), amount: 1, unit: 'serving', per: { kcal: +custom.kcal || 0, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0, fibre: 0, sugar: 0 } }); setCustom({ name: '', kcal: '', protein: '', carbs: '', fat: '' }) }}>
        {t('add')}
      </button>
    </Sheet>
  )
}
