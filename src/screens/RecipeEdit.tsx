import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MEALS, type Ingredient, type Macros, type Meal } from '../types'
import { formatAmount, parseIngredient, uid } from '../lib/util'
import { usePhoto } from '../lib/sync'
import { importRecipe } from '../lib/ai'
import { BackButton, Icon, PhotoButton, Stepper, toast } from '../components/ui'

export default function RecipeEdit() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const { recipes, saveRecipe } = useStore()
  const existing = recipes.find((r) => r.id === id)

  const [stage, setStage] = useState<'form' | 'review'>('form')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState<Meal>(existing?.category ?? 'dinner')
  const [servings, setServings] = useState(existing?.servings ?? 2)
  const [minutes, setMinutes] = useState(existing?.minutes ? String(existing.minutes) : '')
  const [source, setSource] = useState(existing?.source ?? '')
  const [photo, setPhoto] = useState(existing?.photo)
  const [ingText, setIngText] = useState(existing ? existing.ingredients.map((i) => [i.amount !== null ? formatAmount(i.amount) : '', i.unit, i.name].filter(Boolean).join(' ').replace(/^(\S+) (g|kg|ml|l) /, '$1$2 ')).join('\n') : '')
  const [stepText, setStepText] = useState(existing?.steps.join('\n') ?? '')
  const [equipText, setEquipText] = useState(existing?.equipment.join(', ') ?? '')
  const [nutrition, setNutrition] = useState<Macros>(existing?.nutrition ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 })
  const [parsed, setParsed] = useState<Ingredient[]>([])
  const photoUrl = usePhoto(photo)
  const [link, setLink] = useState('')
  const [importing, setImporting] = useState(false)

  const runImport = async (input: { url?: string; image?: string }) => {
    setImporting(true)
    const { data, error } = await importRecipe(input, t.lang)
    setImporting(false)
    if (!data) { toast(t(`ai_${error ?? 'failed'}`)); return }
    const r = data.recipe
    setTitle(r.title); setCategory(r.category); setServings(r.servings || 2); setMinutes(r.minutes ? String(r.minutes) : '')
    setSource(r.source ?? ''); if (r.photo) setPhoto(r.photo)
    setIngText(r.ingredients.join('\n')); setStepText(r.steps.join('\n')); setEquipText(r.equipment.join(', '))
    setNutrition({ kcal: Math.round(r.nutrition.kcal), protein: Math.round(r.nutrition.protein), carbs: Math.round(r.nutrition.carbs), fat: Math.round(r.nutrition.fat), fibre: Math.round(r.nutrition.fibre), sugar: Math.round(r.nutrition.sugar) })
    setLink('')
    toast(t('importDone'))
  }

  const toReview = () => {
    if (!title.trim()) { toast(t('titleNeeded')); return }
    setParsed(ingText.split('\n').map((l) => l.trim()).filter(Boolean).map(parseIngredient))
    setStage('review')
    window.scrollTo(0, 0)
  }
  const save = () => {
    const rid = existing?.id ?? uid()
    saveRecipe({
      id: rid, title: title.trim(), category, servings, minutes: Number(minutes) || undefined, source: source.trim() || undefined, photo,
      favourite: existing?.favourite ?? false, createdAt: existing?.createdAt ?? Date.now(),
      ingredients: parsed.filter((i) => i.name.trim()),
      steps: stepText.split('\n').map((s) => s.trim()).filter(Boolean),
      equipment: equipText.split(',').map((s) => s.trim()).filter(Boolean),
      nutrition,
    })
    toast(t('saved'))
    nav(`/recipes/${rid}`, { replace: true })
  }
  const setIng = (iid: string, patch: Partial<Ingredient>) => setParsed(parsed.map((i) => (i.id === iid ? { ...i, ...patch } : i)))

  if (stage === 'review')
    return (
      <main className="screen no-nav">
        <div className="between"><button className="icon-btn" aria-label={t('back')} onClick={() => setStage('form')}><Icon name="back" /></button><span style={{ fontWeight: 600 }}>{t('checkIt')}</span><span style={{ width: 44 }} /></div>
        <h1 className="title">{title}</h1>
        <div className="tip"><Icon name="check" size={22} /><span>{t('checkHint')}</span></div>
        <h2 className="heading">{t('ingredients')}</h2>
        <div className="card tight">
          {parsed.map((i) => (
            <div key={i.id} className="list-row" style={{ gap: 8 }}>
              <input className="input" aria-label={t('amount')} style={{ width: 64, height: 44, padding: '0 8px' }} inputMode="decimal" value={i.amount ?? ''} onChange={(e) => setIng(i.id, { amount: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) })} />
              <input className="input" aria-label={t('unit')} style={{ width: 64, height: 44, padding: '0 8px' }} value={i.unit} onChange={(e) => setIng(i.id, { unit: e.target.value })} />
              <input className="input grow" aria-label={t('itemName')} style={{ height: 44, padding: '0 10px' }} value={i.name} onChange={(e) => setIng(i.id, { name: e.target.value })} />
              <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', color: 'var(--ink-muted)' }} aria-label={`${t('remove')} ${i.name}`} onClick={() => setParsed(parsed.filter((x) => x.id !== i.id))}><Icon name="close" size={16} /></button>
            </div>
          ))}
        </div>
        <button className="dashed" onClick={() => setParsed([...parsed, { id: uid(), amount: null, unit: '', name: '' }])}><Icon name="plus" size={20} />{t('add')}</button>
        <h2 className="heading">{t('method')}</h2>
        <div className="card tight">
          {stepText.split('\n').filter((s) => s.trim()).map((s, i) => (
            <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
              <span className="tag" style={{ height: 24, minWidth: 24, justifyContent: 'center' }}>{i + 1}</span><span style={{ fontSize: 15, lineHeight: '22px' }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="bottom-bar"><button className="btn primary block" onClick={save}>{t('saveRecipe')}</button></div>
      </main>
    )

  return (
    <main className="screen no-nav">
      <div className="between"><BackButton /><span style={{ fontWeight: 600 }}>{existing ? t('editRecipe') : t('newRecipe')}</span><span style={{ width: 44 }} /></div>
      {!existing && (
        <section className="card stack" style={{ gap: 10 }}>
          <h2 className="heading" style={{ fontSize: 17 }}>{t('importTitle')}</h2>
          <div className="row" style={{ gap: 8 }}>
            <input className="input grow" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder={t('importLinkPh')} value={link} onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && link.trim()) runImport({ url: link.trim() }) }} disabled={importing} />
            <button className="btn green small" disabled={!link.trim() || importing} onClick={() => runImport({ url: link.trim() })}>{t('import')}</button>
          </div>
          <PhotoButton max={1600} disabled={importing} onPhoto={(img) => runImport({ image: img })} label={t('importPhoto')} className="btn secondary block">
            <Icon name="camera" size={18} />{t('importPhoto')}
          </PhotoButton>
          {importing && <span className="small muted" role="status">{t('importing')}</span>}
          <span className="caption">{t('importHint')}</span>
        </section>
      )}

      <PhotoButton onPhoto={setPhoto} label={photo ? t('changePhoto') : t('addPhoto')} className="thumb"
        style={{ width: '100%', height: 180, borderRadius: 28, backgroundImage: photoUrl ? `url(${photoUrl})` : undefined, flexDirection: 'column', gap: 6, border: 'none', position: 'relative' }}>
        {!photo && <><Icon name="camera" size={32} sw={1.5} /><span className="label">{t('addPhoto')}</span></>}
        {photo && <span className="btn secondary small" style={{ position: 'absolute', right: 12, bottom: 12 }}><Icon name="camera" size={16} />{t('changePhoto')}</span>}
      </PhotoButton>

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

      <h2 className="heading">{t('nutritionPer')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {(['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar'] as (keyof Macros)[]).map((k) => (
          <label key={k} className="field"><span className="caption" style={{ fontWeight: 600 }}>{k === 'kcal' ? t('kcal') : `${t(k)} (g)`}</span>
            <input className="input" type="number" inputMode="decimal" value={nutrition[k] || ''} onChange={(e) => setNutrition({ ...nutrition, [k]: Number(e.target.value) || 0 })} /></label>
        ))}
      </div>

      <div className="bottom-bar"><button className="btn primary block" onClick={toReview}>{t('next')}</button></div>
    </main>
  )
}
