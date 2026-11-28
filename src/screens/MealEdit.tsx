import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MEALS, type LogEntry } from '../types'
import { sumItems } from '../lib/nutrition'
import { BackButton, Icon, MacroGrid, PhotoButton, PortionPicker, Sheet, scaleItems } from '../components/ui'
import { IngredientForm, IngredientRow, MealHeader } from '../components/MealParts'
import { AddItemSheet } from '../components/AddItemSheet'

export default function MealEdit() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const { logs, saveLog, deleteLog } = useStore()
  const original = logs.find((l) => l.id === id)
  const [draft, setDraft] = useState<LogEntry | null>(original ?? null)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  // How much of what was logged she actually had: changing it scales every ingredient.
  const [portion, setPortion] = useState(1)
  if (!draft) return <main className="screen"><div className="row"><BackButton to="/" /></div><p className="muted">{t('notHere')}</p></main>

  const totals = sumItems(draft.items)
  const editing = draft.items.find((i) => i.id === editId)

  return (
    <main className="screen no-nav">
      <div className="between">
        <BackButton />
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t('yourMeal')}</span>
        <PhotoButton className="icon-btn" label={draft.photo ? t('changePhoto') : t('addPhoto')} onPhoto={(photo) => setDraft({ ...draft, photo })}><Icon name="camera" /></PhotoButton>
      </div>

      <MealHeader photo={draft.photo} name={draft.name} onName={(name) => setDraft({ ...draft, name })} />

      <div className="stack">
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

      <PortionPicker value={portion} onChange={(n) => { setDraft({ ...draft, items: scaleItems(draft.items, n / portion) }); setPortion(n) }} label={t('portionQ')} />

      <div className="between" style={{ paddingTop: 4 }}>
        <h2 className="heading">{t('whatsIn')}</h2>
        <span className="small muted">{t('ingredientsN', { n: draft.items.length })}</span>
      </div>
      <div className="card tight">
        {draft.items.map((i) => <IngredientRow key={i.id} item={i} onOpen={() => setEditId(i.id)} />)}
      </div>
      <button className="dashed" onClick={() => setAdding(true)}><Icon name="plus" size={20} />{t('addSomething')}</button>
      <span className="small muted" style={{ textAlign: 'center', marginTop: -8 }}>{t('addHint')}</span>
      <button className="btn ghost" style={{ color: 'var(--cherry)', alignSelf: 'center', border: 'none' }}
        onClick={() => { deleteLog(draft.id); nav('/') }}><Icon name="trash" size={18} />{t('deleteMeal')}</button>

      <div className="bottom-bar">
        <button className="btn primary block" onClick={() => { saveLog(draft); nav('/') }}>{t('saveTo', { meal: t(draft.meal) })}</button>
      </div>

      <Sheet open={!!editing} onClose={() => setEditId(null)} title={t('editIngredient')}>
        {editing && <IngredientForm item={editing} onCancel={() => setEditId(null)}
          onDelete={() => { setDraft({ ...draft, items: draft.items.filter((x) => x.id !== editing.id) }); setEditId(null) }}
          onSave={(i) => { setDraft({ ...draft, items: draft.items.map((x) => (x.id === i.id ? i : x)) }); setEditId(null) }} />}
      </Sheet>
      <AddItemSheet open={adding} onClose={() => setAdding(false)} onAdd={(items) => { setDraft({ ...draft, items: [...draft.items, ...items] }); setAdding(false) }} />
    </main>
  )
}
