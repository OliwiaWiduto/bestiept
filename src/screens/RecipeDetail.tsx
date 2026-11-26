import { useState } from 'react'
import type { Recipe } from '../types'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useT } from '../i18n'
import { ingredientText, siteName } from '../lib/util'
import { usePhoto } from '../lib/sync'
import { Icon, MacroGrid, PhotoButton, Stepper, toast } from '../components/ui'
import { foodArt } from '../lib/art'
import { equipmentIcon } from '../lib/equipment'
import AddToPlanSheet from '../components/AddToPlanSheet'
import MoveSheet from '../components/MoveSheet'
import { fmt } from '../lib/dates'
import { libById, libRecipe, ownCopy } from '../lib/library'
import { localise } from '../lib/recipeLang'

export default function RecipeDetail() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const { recipes: originals, toggleFavourite, deleteRecipe, saveRecipe, plan, updatePlan, lang } = useStore()
  const recipes = useRecipes()
  // A Bestie pick she hasn't saved yet is shown straight from the library.
  const lib = libById(id)
  const mine = lib ? originals.find((x) => x.libId === lib.id && !x.ownerId) : undefined
  const r = recipes.find((x) => x.id === id) ?? (lib ? libRecipe(lib, lang) : undefined)
  /** Her copy of the pick (made now if needed), in the app's language. */
  const copy = () => { const c = lib ? ownCopy(lib.id, useStore.getState().recipes, lang, saveRecipe) : null; return c ? localise(c, lang) : null }
  const original = originals.find((x) => x.id === id)
  // Opened from the plan? Start with the servings she planned to cook.
  const [params] = useSearchParams()
  const [servings, setServings] = useState(Number(params.get('s')) || r?.servings || 2)
  const [planOpen, setPlanOpen] = useState(false)
  const planned = plan.find((p) => p.id === params.get('plan'))
  const [moving, setMoving] = useState(false)
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null)
  const photo = usePhoto(r?.photo)
  if (mine) return <Navigate to={`/recipes/${mine.id}?${params.toString()}`} replace />
  if (!r) return <main className="screen"><p className="muted">{t('notHere')}</p><button className="btn secondary" onClick={() => nav('/recipes')}>{t('back')}</button></main>
  const factor = servings / (r.servings || 1)
  const isPick = !!lib || !!r.libId
  // Opened from a swap tip: what she ate vs this recipe.
  const swapP = params.get('swapP') !== null ? Number(params.get('swapP')) : null

  return (
    <main className="screen no-nav" style={{ paddingTop: 24 }}>
      <div className="hero-photo" role="img" aria-label={r.title} style={{ backgroundImage: photo ? `url(${photo})` : undefined }}>
        {!photo && <img src={foodArt(r.title, r.category)} alt="" style={{ width: 170, height: 170 }} />}
        <button className="icon-btn" style={{ left: 24 }} aria-label={t('back')} onClick={() => nav(-1)}><Icon name="back" /></button>
        <button className="icon-btn" style={{ right: 24, color: 'var(--cherry)' }} aria-pressed={r.favourite} aria-label={r.favourite ? t('unfavourite') : t('favourite')} onClick={() => { if (lib) { const c = copy(); if (c) { toggleFavourite(c.id); toast(t('savedCopy')) } } else toggleFavourite(r.id) }}>
          <Icon name="heart" fill={r.favourite} />
        </button>
        {!lib && <PhotoButton onPhoto={(photo) => original && saveRecipe({ ...original, photo })} label={r.photo ? t('changePhoto') : t('addPhoto')} className="btn secondary small"
          style={{ position: 'absolute', right: 24, bottom: 16 }}>
          <Icon name="camera" size={16} />{r.photo ? t('changePhoto') : t('addPhoto')}
        </PhotoButton>}
      </div>

      <div className="stack" style={{ marginTop: 4 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="chip" aria-pressed="true" style={{ height: 32 }}>{t(r.category)}</span>
          {isPick && <span className="tag" style={{ background: 'var(--cherry-soft)', color: 'var(--ink)' }}>{t('bestiePicks')}</span>}
          {r.source && siteName(r.source).href && (
            <a className="pen" href={siteName(r.source).href} target="_blank" rel="noreferrer" aria-label={t('openSource', { s: siteName(r.source).label })}><Icon name="link" size={18} /></a>
          )}
        </div>
        <h1 className="display" style={{ fontSize: 32, lineHeight: '36px' }}>{r.title}</h1>
        <div className="row small muted" style={{ gap: 6 }}>
          <Icon name="clock" size={16} />
          <span>{[r.minutes ? t('minutes', { n: r.minutes }) : null, r.handsOn && r.minutes && r.handsOn < r.minutes ? t('handsOn', { n: r.handsOn }) : null, t('stepsN', { n: r.steps.length })].filter(Boolean).join(' · ')}</span>
        </div>
        {planned && (
          <div className="row small" style={{ gap: 6 }}>
            <Icon name="calendar" size={16} />
            <span className="muted">{t('plannedFor', { when: `${fmt(planned.date, t.lang, { weekday: 'long', day: 'numeric' })}, ${t(planned.meal).toLowerCase()}` })}</span>
            <button className="link-btn" onClick={() => setMoving(true)}>{t('moveMeal')}</button>
          </div>
        )}
      </div>

      {swapP !== null && r.nutrition.protein > swapP && (
        <section className="card stack" style={{ gap: 12 }}>
          <span className="label">{t('hcWhatChanges')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <div className="stack" style={{ gap: 2, background: 'var(--track)', borderRadius: 18, padding: 12 }}><span className="caption">{t('hcYourMeal')}</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>{swapP} g</span><span className="caption">{params.get('swapK') ? t('hcProteinKcal', { k: params.get('swapK')! }) : t('protein').toLowerCase()}</span></div>
            <div className="stack" style={{ gap: 2, background: 'var(--cherry-soft)', borderRadius: 18, padding: 12 }}><span className="caption" style={{ color: 'var(--ink)' }}>{t('hcThisRecipe')}</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--cherry)' }}>{r.nutrition.protein} g</span><span className="caption" style={{ color: 'var(--ink)' }}>{t('hcProteinKcal', { k: r.nutrition.kcal })}</span></div>
          </div>
          <span className="small" style={{ fontWeight: 600, color: 'var(--green)' }}>{t('hcMore', { n: r.nutrition.protein - swapP })}</span>
        </section>
      )}

      <section className="card stack" style={{ gap: 16 }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: '44px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--green)' }}>{r.nutrition.kcal}</span>
          <span className="label muted" style={{ fontWeight: 500 }}>{t('perServing')}</span>
        </div>
        <MacroGrid m={{ protein: r.nutrition.protein, carbs: r.nutrition.carbs, fat: r.nutrition.fat, fibre: r.nutrition.fibre }} />
      </section>

      <section className="card between" style={{ padding: '12px 12px 12px 20px' }}>
        <span className="label" style={{ fontSize: 15 }}>{t('servings')}</span>
        <Stepper value={servings} onChange={setServings} label={t('servings')} />
      </section>

      <h2 className="heading">{t('ingredients')}</h2>
      <div className="card tight">
        {r.ingredients.map((i) => (
          <div key={i.id} className="list-row" style={{ alignItems: 'baseline' }}>
            <span style={{ width: 76, flexShrink: 0, fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>{ingredientText(i, factor)}</span>
            <span style={{ fontSize: 15, lineHeight: '20px' }}>{i.name}</span>
          </div>
        ))}
      </div>

      {r.equipment.length > 0 && (
        <>
          <h2 className="heading">{t('alsoNeed')}</h2>
          <div className="equip-grid">{r.equipment.map((e) => <span key={e} className="equip light"><img src={equipmentIcon(e)} alt="" /><span>{e}</span></span>)}</div>
        </>
      )}

      <h2 className="heading">{t('method')}</h2>
      <div className="card tight">
        {r.steps.map((s, i) => (
          <div key={i} className="list-row" style={{ alignItems: 'flex-start', padding: '14px 0' }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--peach-soft)', color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 15, lineHeight: '22px' }}>{s}</span>
          </div>
        ))}
      </div>

      {!lib && <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <button className="btn ghost small" onClick={() => nav(`/recipes/${r.id}/edit`)}><Icon name="edit" size={16} />{t('editRecipe')}</button>
        <button className="btn ghost small" style={{ color: 'var(--cherry)' }} onClick={() => {
          if (!original || !confirm(t('confirmDeleteRecipe'))) return
          const planned = useStore.getState().plan.filter((p) => p.recipeId === original.id)
          deleteRecipe(original.id)
          nav('/recipes')
          toast(t('recipeDeleted'), { label: t('undo'), run: () => { saveRecipe(original); useStore.setState((st) => ({ plan: [...st.plan, ...planned] })) } })
        }}>
          <Icon name="trash" size={16} />{t('deleteRecipe')}
        </button>
      </div>}

      <div className="bottom-bar">
        <button className="btn secondary" style={{ flex: 1 }} onClick={() => { if (lib) setPlanRecipe(copy()); setPlanOpen(true) }}>{t('addToPlan')}</button>
        <button className="btn primary" style={{ flex: 1.4 }} disabled={r.steps.length === 0} onClick={() => nav(`/cook/${lib ? copy()?.id ?? r.id : r.id}?s=${servings}`)}>{t('startCooking')}</button>
      </div>
      <MoveSheet item={moving ? planned ?? null : null} onClose={() => setMoving(false)} onMove={(date, meal) => { if (planned) updatePlan(planned.id, { date, meal }); setMoving(false); toast(t('moved')) }} />
      <AddToPlanSheet recipe={planRecipe ?? r} open={planOpen} onClose={() => setPlanOpen(false)} />
    </main>
  )
}
