import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { ingredientText, siteName } from '../lib/util'
import { usePhoto } from '../lib/sync'
import { Icon, MacroGrid, PhotoButton, Stepper } from '../components/ui'
import AddToPlanSheet from '../components/AddToPlanSheet'

export default function RecipeDetail() {
  const t = useT()
  const nav = useNavigate()
  const { id } = useParams()
  const { recipes, toggleFavourite, deleteRecipe, saveRecipe } = useStore()
  const r = recipes.find((x) => x.id === id)
  const [servings, setServings] = useState(r?.servings ?? 2)
  const [planOpen, setPlanOpen] = useState(false)
  const photo = usePhoto(r?.photo)
  if (!r) return <main className="screen"><button className="btn ghost" onClick={() => nav('/recipes')}>{t('back')}</button></main>
  const factor = servings / (r.servings || 1)

  return (
    <main className="screen no-nav" style={{ paddingTop: 24 }}>
      <div className="hero-photo" role="img" aria-label={r.title} style={{ backgroundImage: photo ? `url(${photo})` : undefined }}>
        {!r.photo && <Icon name="bowl" size={56} sw={1.5} />}
        <button className="icon-btn" style={{ left: 24 }} aria-label={t('back')} onClick={() => nav(-1)}><Icon name="back" /></button>
        <button className="icon-btn" style={{ right: 24, color: 'var(--cherry)' }} aria-pressed={r.favourite} aria-label={r.favourite ? t('unfavourite') : t('favourite')} onClick={() => toggleFavourite(r.id)}>
          <Icon name="heart" fill={r.favourite} />
        </button>
        <PhotoButton onPhoto={(photo) => saveRecipe({ ...r, photo })} label={r.photo ? t('changePhoto') : t('addPhoto')} className="btn secondary small"
          style={{ position: 'absolute', right: 24, bottom: 16 }}>
          <Icon name="camera" size={16} />{r.photo ? t('changePhoto') : t('addPhoto')}
        </PhotoButton>
      </div>

      <div className="stack" style={{ marginTop: 4 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="chip" aria-pressed="true" style={{ height: 32 }}>{t(r.category)}</span>
          {r.source && siteName(r.source).href && (
            <a className="pen" href={siteName(r.source).href} target="_blank" rel="noreferrer" aria-label={t('openSource', { s: siteName(r.source).label })}><Icon name="link" size={18} /></a>
          )}
        </div>
        <h1 className="display" style={{ fontSize: 32, lineHeight: '36px' }}>{r.title}</h1>
        <div className="row small muted" style={{ gap: 6 }}>
          <Icon name="clock" size={16} />
          <span>{[r.minutes ? t('minutes', { n: r.minutes }) : null, t('stepsN', { n: r.steps.length })].filter(Boolean).join(' · ')}</span>
        </div>
      </div>

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
          <div className="chips">{r.equipment.map((e) => <span key={e} className="chip" style={{ background: 'var(--surface-raised)' }}>{e}</span>)}</div>
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

      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <button className="btn ghost small" onClick={() => nav(`/recipes/${r.id}/edit`)}><Icon name="edit" size={16} />{t('editRecipe')}</button>
        <button className="btn ghost small" style={{ color: 'var(--cherry)' }} onClick={() => { if (confirm(t('confirmDeleteRecipe'))) { deleteRecipe(r.id); nav('/recipes') } }}>
          <Icon name="trash" size={16} />{t('deleteRecipe')}
        </button>
      </div>

      <div className="bottom-bar">
        <button className="btn secondary" style={{ flex: 1 }} onClick={() => setPlanOpen(true)}>{t('addToPlan')}</button>
        <button className="btn primary" style={{ flex: 1.4 }} disabled={r.steps.length === 0} onClick={() => nav(`/cook/${r.id}?s=${servings}`)}>{t('startCooking')}</button>
      </div>
      <AddToPlanSheet recipe={r} open={planOpen} onClose={() => setPlanOpen(false)} />
    </main>
  )
}
