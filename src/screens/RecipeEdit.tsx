import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MEALS, type Ingredient, type Macros, type Meal } from '../types'
import { formatAmount, ingredientText, parseIngredient, splitName, uid } from '../lib/util'
import { equipmentIcon } from '../lib/equipment'
import { recipeLang } from '../lib/recipeLang'
import { recipeNutrition } from '../lib/matchFood'
import { usePhoto } from '../lib/sync'
import { importRecipe } from '../lib/ai'
import { BackButton, Icon, MacroGrid, PhotoButton, Sheet, Stepper, toast } from '../components/ui'
import { MealHeader } from '../components/MealParts'

const MAX_SHOTS = 6
const ingLine = (i: Ingredient) => [i.amount !== null ? formatAmount(i.amount) : '', i.unit, i.name].filter(Boolean).join(' ').replace(/^(\S+) (g|kg|ml|l) /, '$1$2 ')
const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)

type Open = { kind: 'ing'; id: string | null } | { kind: 'step'; index: number | null } | { kind: 'details' } | { kind: 'equip' } | { kind: 'nutrition' } | null

export default function RecipeEdit() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const { recipes, saveRecipe } = useStore()
  const existing = recipes.find((r) => r.id === id)

  // New recipes: choose how to add → (typed ones only) the lines form → the check page. Saved recipes open on the check page.
  const [stage, setStage] = useState<'start' | 'form' | 'review'>(existing ? 'review' : 'start')
  const [typed, setTyped] = useState(false)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState<Meal>(existing?.category ?? 'dinner')
  const [servings, setServings] = useState(existing?.servings ?? 2)
  const [minutes, setMinutes] = useState(existing?.minutes ? String(existing.minutes) : '')
  const [source, setSource] = useState(existing?.source ?? '')
  const [photo, setPhoto] = useState(existing?.photo)
  const [ings, setIngs] = useState<Ingredient[]>(existing?.ingredients ?? [])
  const [steps, setSteps] = useState<string[]>(existing?.steps ?? [])
  const [equip, setEquip] = useState<string[]>(existing?.equipment ?? [])
  const [nutrition, setNutrition] = useState<Macros>(existing?.nutrition ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 })
  const [ingText, setIngText] = useState('')
  const [stepText, setStepText] = useState('')
  const [equipText, setEquipText] = useState('')
  const [open, setOpen] = useState<Open>(null)
  const [calc, setCalc] = useState<'busy' | { found: number; of: number } | null>(null)
  const photoUrl = usePhoto(photo)
  const [link, setLink] = useState('')
  const [importing, setImporting] = useState(false)
  const [shots, setShots] = useState<string[]>([])
  const addShot = (img: string) => setShots((s) => (s.length < MAX_SHOTS ? [...s, img] : s))

  const runImport = async (input: { url?: string; images?: string[] }) => {
    setImporting(true)
    const { data, error } = await importRecipe(input, t.lang)
    setImporting(false)
    if (!data) { toast(t(`ai_${error ?? 'failed'}`)); return }
    const r = data.recipe
    setTitle(r.title); setCategory(r.category); setServings(r.servings || 2); setMinutes(r.minutes ? String(r.minutes) : '')
    setSource(r.source ?? ''); if (r.photo) setPhoto(r.photo)
    setIngs(r.ingredients.map(parseIngredient)); setSteps(r.steps); setEquip(r.equipment)
    setNutrition({ kcal: Math.round(r.nutrition.kcal), protein: Math.round(r.nutrition.protein), carbs: Math.round(r.nutrition.carbs), fat: Math.round(r.nutrition.fat), fibre: Math.round(r.nutrition.fibre), sugar: Math.round(r.nutrition.sugar) })
    setLink(''); setShots([]); setTyped(false)
    setStage('review')
    window.scrollTo(0, 0)
  }

  const toForm = () => {
    setIngText(ings.map(ingLine).join('\n')); setStepText(steps.join('\n')); setEquipText(equip.join(', '))
    setTyped(true); setStage('form'); window.scrollTo(0, 0)
  }
  const workOut = async (list: Ingredient[], serves: number) => {
    setCalc('busy')
    const { per, found } = await recipeNutrition(list, serves, t.lang)
    setNutrition(per)
    setCalc({ found, of: list.length })
  }
  const toReview = () => {
    if (!title.trim()) { toast(t('titleNeeded')); return }
    const parsed = lines(ingText).map(parseIngredient)
    setIngs(parsed); setSteps(lines(stepText)); setEquip(equipText.split(',').map((s) => s.trim()).filter(Boolean))
    setStage('review')
    window.scrollTo(0, 0)
    if (!nutrition.kcal && parsed.length) workOut(parsed, servings)
  }
  const save = () => {
    if (!title.trim()) { toast(t('titleNeeded')); return }
    const rid = existing?.id ?? uid()
    saveRecipe({
      id: rid, title: title.trim(), category, servings, minutes: Number(minutes) || undefined, source: source.trim() || undefined, photo,
      favourite: existing?.favourite ?? false, createdAt: existing?.createdAt ?? Date.now(),
      ingredients: ings.filter((i) => i.name.trim()),
      steps: steps.map((s) => s.trim()).filter(Boolean),
      equipment: equip,
      nutrition,
      lang: existing ? recipeLang(existing) : t.lang,
    })
    toast(t('saved'))
    nav(`/recipes/${rid}`, { replace: true })
  }

  const cover = (
    <PhotoButton onPhoto={setPhoto} label={photo ? t('changePhoto') : t('addPhoto')} className="thumb"
      style={{ width: '100%', height: 180, borderRadius: 28, backgroundImage: photoUrl ? `url(${photoUrl})` : undefined, flexDirection: 'column', gap: 6, border: 'none', position: 'relative' }}>
      {!photo && <><Icon name="camera" size={32} sw={1.5} /><span className="label">{t('addPhoto')}</span></>}
      {photo && <span className="btn secondary small" style={{ position: 'absolute', right: 12, bottom: 12 }}><Icon name="camera" size={16} />{t('changePhoto')}</span>}
    </PhotoButton>
  )

  if (stage === 'review') {
    const editing = open?.kind === 'ing' ? ings.find((i) => i.id === open.id) ?? { id: '', amount: null, unit: '', name: '' } : null
    const rowStyle = { width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' } as const
    return (
      <main className="screen no-nav">
        <div className="between">
          {existing ? <BackButton /> : <button className="icon-btn" aria-label={t('back')} onClick={() => (typed ? toForm() : setStage('start'))}><Icon name="back" /></button>}
          <span style={{ fontWeight: 600 }}>{existing ? t('editRecipe') : t('checkIt')}</span><span style={{ width: 44 }} />
        </div>
        {cover}
        <div className="stack" style={{ gap: 12 }}>
          <MealHeader name={title} onName={setTitle} />
          <div className="chips" role="group" aria-label={t('editDetails')}>
            <button className="chip" style={{ height: 34 }} onClick={() => setOpen({ kind: 'details' })}>{t(category)}</button>
            <button className="chip" style={{ height: 34 }} onClick={() => setOpen({ kind: 'details' })}>{t('serves', { n: servings })}</button>
            <button className="chip" style={{ height: 34 }} onClick={() => setOpen({ kind: 'details' })}>{Number(minutes) ? t('minutes', { n: Number(minutes) }) : t('addTime')}</button>
          </div>
          {!existing && <span className="small muted">{t('checkTap')}</span>}
        </div>

        <h2 className="heading">{t('ingredients')}</h2>
        {ings.length > 0 && (
          <div className="card tight">
            {ings.map((i) => {
              const { main, note } = splitName(i.name)
              return (
                <button key={i.id} className="list-row" style={rowStyle} aria-label={`${t('editIngredient')}: ${i.name}`} onClick={() => setOpen({ kind: 'ing', id: i.id })}>
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{main}</span>
                    {note && <span className="caption">{note}</span>}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap', flex: 'none' }}>{ingredientText(i)}</span>
                </button>
              )
            })}
          </div>
        )}
        <button className="dashed" onClick={() => setOpen({ kind: 'ing', id: null })}><Icon name="plus" size={20} />{t('addIngredient')}</button>

        <h2 className="heading">{t('method')}</h2>
        {steps.length > 0 && (
          <div className="card tight">
            {steps.map((s, i) => (
              <button key={i} className="list-row" style={{ ...rowStyle, alignItems: 'flex-start' }} aria-label={`${t('editStep')} ${i + 1}`} onClick={() => setOpen({ kind: 'step', index: i })}>
                <span className="tag" style={{ height: 24, minWidth: 24, justifyContent: 'center', flex: 'none' }}>{i + 1}</span>
                <span className="grow" style={{ fontSize: 15, lineHeight: '22px' }}>{s}</span>
              </button>
            ))}
          </div>
        )}
        <button className="dashed" onClick={() => setOpen({ kind: 'step', index: null })}><Icon name="plus" size={20} />{t('addStep')}</button>

        <div className="between"><h2 className="heading">{t('equipment')}</h2>
          {equip.length > 0 && <button className="pen" aria-label={t('editEquipment')} onClick={() => { setEquipText(equip.join(', ')); setOpen({ kind: 'equip' }) }}><Icon name="edit" size={18} /></button>}
        </div>
        {equip.length > 0
          ? <div className="equip-grid">{equip.map((e) => <span key={e} className="equip light"><img src={equipmentIcon(e)} alt="" /><span>{e}</span></span>)}</div>
          : <button className="dashed" onClick={() => { setEquipText(''); setOpen({ kind: 'equip' }) }}><Icon name="plus" size={20} />{t('addEquipment')}</button>}

        <div className="between"><h2 className="heading">{t('nutritionPer')}</h2>
          <button className="pen" aria-label={t('editNutrition')} onClick={() => setOpen({ kind: 'nutrition' })}><Icon name="edit" size={18} /></button>
        </div>
        <section className="card stack" style={{ gap: 14 }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: '40px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--green)' }}>{Math.round(nutrition.kcal)}</span>
            <span className="label muted" style={{ fontWeight: 500 }}>{t('kcal')}</span>
          </div>
          <MacroGrid m={nutrition} />
          {calc && calc !== 'busy' && <span className="caption">{t('workedOut')} · {t('foundOf', { n: calc.found, t: calc.of })}</span>}
        </section>
        {ings.length > 0 && (
          <button className="btn ghost small" style={{ alignSelf: 'flex-start', border: 'none' }} disabled={calc === 'busy'} onClick={() => workOut(ings, servings)}>
            <Icon name="bolt" size={16} />{calc === 'busy' ? t('workingOut') : t('workOut')}
          </button>
        )}

        <div className="bottom-bar"><button className="btn primary block" onClick={save}>{t('saveRecipe')}</button></div>

        <Sheet open={open?.kind === 'ing'} onClose={() => setOpen(null)} title={open?.kind === 'ing' && open.id ? t('editIngredient') : t('addIngredient')}>
          {editing && <IngForm key={editing.id || 'new'} item={editing} onCancel={() => setOpen(null)}
            onDelete={editing.id ? () => { setIngs(ings.filter((x) => x.id !== editing.id)); setOpen(null) } : undefined}
            onSave={(i) => { setIngs(i.id ? ings.map((x) => (x.id === i.id ? i : x)) : [...ings, { ...i, id: uid() }]); setOpen(null) }} />}
        </Sheet>
        <Sheet open={open?.kind === 'step'} onClose={() => setOpen(null)} title={open?.kind === 'step' && open.index !== null ? `${t('editStep')} ${open.index + 1}` : t('addStep')}>
          {open?.kind === 'step' && <StepForm key={open.index ?? 'new'} text={open.index !== null ? steps[open.index] : ''} onCancel={() => setOpen(null)}
            onDelete={open.index !== null ? () => { setSteps(steps.filter((_, x) => x !== open.index)); setOpen(null) } : undefined}
            onSave={(text) => { setSteps(open.index !== null ? steps.map((x, n) => (n === open.index ? text : x)) : [...steps, text]); setOpen(null) }} />}
        </Sheet>
        <Sheet open={open?.kind === 'details'} onClose={() => setOpen(null)} title={t('editDetails')}>
          <div className="stack"><span className="label">{t('category')}</span>
            <div className="chips">{MEALS.map((m) => <button key={m} className="chip" aria-pressed={category === m} onClick={() => setCategory(m)}>{t(m)}</button>)}</div>
          </div>
          <div className="between"><span className="label">{t('servings')}</span><Stepper value={servings} onChange={setServings} label={t('servings')} /></div>
          <label className="field"><span>{t('cookTime')}</span><input className="input" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
          <label className="field"><span>{t('source')}</span><input className="input" placeholder={t('sourcePh')} value={source} onChange={(e) => setSource(e.target.value)} /></label>
          <button className="btn primary block" onClick={() => setOpen(null)}>{t('done')}</button>
        </Sheet>
        <Sheet open={open?.kind === 'equip'} onClose={() => setOpen(null)} title={t('equipment')}>
          <label className="field"><span>{t('equipmentComma')}</span><input className="input" placeholder={t('equipmentPh')} value={equipText} onChange={(e) => setEquipText(e.target.value)} /></label>
          <button className="btn primary block" onClick={() => { setEquip(equipText.split(',').map((s) => s.trim()).filter(Boolean)); setOpen(null) }}>{t('save')}</button>
        </Sheet>
        <Sheet open={open?.kind === 'nutrition'} onClose={() => setOpen(null)} title={t('nutritionPer')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {(['kcal', 'protein', 'carbs', 'fat', 'fibre'] as (keyof Macros)[]).map((k) => (
              <label key={k} className="field"><span>{k === 'kcal' ? t('calories') : `${t(k)} (g)`}</span>
                <input className="input" type="number" inputMode="decimal" value={nutrition[k] || ''} onChange={(e) => setNutrition({ ...nutrition, [k]: Number(e.target.value) || 0 })} /></label>
            ))}
          </div>
          <button className="btn primary block" onClick={() => setOpen(null)}>{t('done')}</button>
        </Sheet>
      </main>
    )
  }

  if (stage === 'start')
    return (
      <main className="screen no-nav">
        <div className="between"><BackButton /><span style={{ fontWeight: 600 }}>{t('newRecipe')}</span><span style={{ width: 44 }} /></div>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="title">{t('importTitle')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t('importHint')}</p>
        </div>
        <textarea className="input" rows={3} style={{ height: 'auto', minHeight: 96, padding: 14, resize: 'none' }} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          aria-label={t('importLinkPh')} placeholder={t('importLinkPh')} value={link} onChange={(e) => setLink(e.target.value)} disabled={importing} />
        <button className="btn green block" disabled={!link.trim() || importing} onClick={() => runImport({ url: link.trim() })}>{t('import')}</button>
        {shots.length === 0 ? (
          <PhotoButton multiple max={1600} disabled={importing} onPhoto={addShot} label={t('importPhoto')} className="btn secondary block">
            <Icon name="camera" size={18} />{t('importPhoto')}
          </PhotoButton>
        ) : (
          <section className="card stack" style={{ gap: 12 }}>
            <div className="shots">
              {shots.map((src, i) => (
                <div key={i} className="shot" role="img" aria-label={`${t('photo')} ${i + 1}`} style={{ backgroundImage: `url(${src})` }}>
                  <span className="shot-n">{i + 1}</span>
                  <button aria-label={`${t('remove')} ${t('photo')} ${i + 1}`} disabled={importing} onClick={() => setShots(shots.filter((_, x) => x !== i))}><Icon name="close" size={14} sw={2.5} /></button>
                </div>
              ))}
              {shots.length < MAX_SHOTS && (
                <PhotoButton multiple max={1600} disabled={importing} onPhoto={addShot} label={t('importAddMore')} className="shot add"><Icon name="plus" size={22} /></PhotoButton>
              )}
            </div>
            <span className="caption">{t('importMany')}</span>
            <button className="btn green block" disabled={importing} onClick={() => runImport({ images: shots })}>{t('importRead')}</button>
          </section>
        )}
        <div className="row" style={{ gap: 12 }}><hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--line)' }} /><span className="caption">{t('orWord')}</span><hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--line)' }} /></div>
        <button className="btn ghost block" disabled={importing} onClick={toForm}><Icon name="edit" size={18} />{t('typeItIn')}</button>
        {importing && <span className="small muted" role="status" style={{ textAlign: 'center' }}>{t('importing')}</span>}
      </main>
    )

  return (
    <main className="screen no-nav">
      <div className="between">
        <button className="icon-btn" aria-label={t('back')} onClick={() => setStage('start')}><Icon name="back" /></button>
        <span style={{ fontWeight: 600 }}>{t('newRecipe')}</span><span style={{ width: 44 }} />
      </div>

      {cover}
      <label className="field"><span>{t('recipeTitle')}</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="stack"><span className="label">{t('category')}</span>
        <div className="chips">{MEALS.map((m) => <button key={m} className="chip" aria-pressed={category === m} onClick={() => setCategory(m)}>{t(m)}</button>)}</div>
      </div>
      <div className="between"><span className="label">{t('servings')}</span><Stepper value={servings} onChange={setServings} label={t('servings')} /></div>
      <label className="field"><span>{t('cookTime')}</span><input className="input" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
      <label className="field"><span>{t('source')}</span><input className="input" placeholder={t('sourcePh')} value={source} onChange={(e) => setSource(e.target.value)} /></label>
      <label className="field"><span>{t('ingredientsLines')}</span><textarea className="input" rows={6} placeholder={t('ingredientsPh')} value={ingText} onChange={(e) => setIngText(e.target.value)} /></label>
      <label className="field"><span>{t('stepsLines')}</span><textarea className="input" rows={6} placeholder={t('stepsPh')} value={stepText} onChange={(e) => setStepText(e.target.value)} /></label>
      <label className="field"><span>{t('equipmentComma')}</span><input className="input" placeholder={t('equipmentPh')} value={equipText} onChange={(e) => setEquipText(e.target.value)} /></label>


      <div className="bottom-bar"><button className="btn primary block" onClick={toReview}>{t('next')}</button></div>
    </main>
  )
}

function IngForm({ item, onSave, onDelete, onCancel }: { item: Ingredient; onSave: (i: Ingredient) => void; onDelete?: () => void; onCancel: () => void }) {
  const t = useT()
  const [name, setName] = useState(item.name)
  const [amount, setAmount] = useState(item.amount === null ? '' : formatAmount(item.amount))
  const [unit, setUnit] = useState(item.unit)
  const n = Number(amount.replace(',', '.'))
  return (
    <div className="stack" style={{ gap: 16 }}>
      <label className="field"><span>{t('itemName')}</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <label className="field"><span>{t('amount')}</span><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="field"><span>{t('unit')}</span><input className="input" autoCapitalize="none" placeholder="g, ml, tbsp" value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      </div>
      <button className="btn primary block" disabled={!name.trim()} onClick={() => onSave({ ...item, name: name.trim(), amount: amount.trim() === '' || !Number.isFinite(n) ? null : n, unit: unit.trim() })}>{t('save')}</button>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn ghost" style={{ border: 'none' }} onClick={onCancel}>{t('cancel')}</button>
        {onDelete && <button className="btn ghost" style={{ color: 'var(--cherry)', border: 'none' }} onClick={onDelete}><Icon name="trash" size={18} />{t('removeIngredient')}</button>}
      </div>
    </div>
  )
}

function StepForm({ text, onSave, onDelete, onCancel }: { text: string; onSave: (s: string) => void; onDelete?: () => void; onCancel: () => void }) {
  const t = useT()
  const [value, setValue] = useState(text)
  return (
    <div className="stack" style={{ gap: 16 }}>
      <textarea className="input" rows={5} aria-label={t('stepText')} placeholder={t('stepText')} style={{ height: 'auto', padding: 14 }} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn primary block" disabled={!value.trim()} onClick={() => onSave(value.trim())}>{t('save')}</button>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn ghost" style={{ border: 'none' }} onClick={onCancel}>{t('cancel')}</button>
        {onDelete && <button className="btn ghost" style={{ color: 'var(--cherry)', border: 'none' }} onClick={onDelete}><Icon name="trash" size={18} />{t('removeStep')}</button>}
      </div>
    </div>
  )
}
