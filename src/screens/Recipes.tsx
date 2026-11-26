import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useT } from '../i18n'
import { MEALS, type Meal, type Recipe } from '../types'
import { usePhoto } from '../lib/sync'
import { CoachTip, Icon, toast } from '../components/ui'
import { missingSamples } from '../lib/samples'
import { foodArt } from '../lib/art'
import { personName, useFamily } from '../lib/family'
import { LIBRARY, libRecipe } from '../lib/library'
import { PickCard } from '../components/Nudges'

type Filter = 'all' | 'picks' | 'fav' | 'protein' | Meal

// One serving: at least 20g protein (10g for snacks) and at least 25% of calories from protein.
function highProtein(r: Recipe) {
  const n = r.nutrition
  if (!n || !n.kcal || !n.protein) return false
  return n.protein >= (r.category === 'snack' ? 10 : 20) && (n.protein * 4) / n.kcal >= 0.25
}

export default function Recipes() {
  const t = useT()
  const nav = useNavigate()
  const recipes = useRecipes()
  const seeTip = useStore((s) => s.seeTip)
  const saveRecipe = useStore((s) => s.saveRecipe)
  const own = useStore((s) => s.recipes)
  const lang = useStore((s) => s.lang)
  const missing = useMemo(() => missingSamples(own.filter((r) => !r.ownerId), lang), [own, lang])
  // The filter lives in the address, so coming back from a recipe keeps it (e.g. Bestie picks).
  const [params, setParams] = useSearchParams()
  const filter = (params.get('f') as Filter | null) ?? 'all'
  const setFilter = (f: Filter) => setParams(f === 'all' ? {} : { f }, { replace: true })
  const [q, setQ] = useState('')

  const picks = useMemo(() => LIBRARY.map((l) => libRecipe(l, lang)), [lang])
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return (filter === 'picks' ? picks : recipes)
      .filter((r) => filter === 'all' || filter === 'picks' || (filter === 'fav' ? r.favourite : filter === 'protein' ? highProtein(r) : r.category === filter))
      .filter((r) => !query || r.title.toLowerCase().includes(query) || r.ingredients.some((i) => i.name.toLowerCase().includes(query)))
      .sort((a, b) => filter === 'picks' ? 0 : b.createdAt - a.createdAt)
  }, [recipes, picks, filter, q])

  return (
    <main className="screen">
      <div className="between" style={{ paddingTop: 8 }}>
        <h1 className="display">{t('recipes')}</h1>
        <span style={{ position: 'relative' }}>
          <button className="btn secondary small" onClick={() => { seeTip('recipes'); nav('/recipes/new') }}><Icon name="plus" size={18} />{t('add')}</button>
          <CoachTip id="recipes">{t('tipRecipes')}</CoachTip>
        </span>
      </div>

      <label className="row input" style={{ gap: 10, borderRadius: 999 }}>
        <Icon name="search" size={20} />
        <span className="sr-only">{t('searchRecipes')}</span>
        <input placeholder={t('searchRecipes')} value={q} onChange={(e) => setQ(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, minWidth: 0, outline: 'none' }} />
      </label>

      <div className="chips scroll" role="group" aria-label="Filter">
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('all')}</button>
        <button className="chip" aria-pressed={filter === 'picks'} onClick={() => setFilter('picks')}>{t('bestiePicks')}</button>
        <button className="chip" aria-pressed={filter === 'fav'} onClick={() => setFilter('fav')}><Icon name="heart" size={14} fill />&nbsp;{t('favourites')}</button>
        <button className="chip" aria-pressed={filter === 'protein'} onClick={() => setFilter('protein')}>{t('highProtein')}</button>
        {MEALS.map((m) => <button key={m} className="chip" aria-pressed={filter === m} onClick={() => setFilter(m)}>{t(m)}</button>)}
      </div>

      {filter === 'all' && !q.trim() && (
        <section className="stack" style={{ gap: 10 }}>
          <div className="between" style={{ alignItems: 'baseline' }}>
            <h2 className="heading">{t('bestiePicks')}</h2>
            <button className="link-btn" onClick={() => setFilter('picks')}>{t('seeAllN', { n: LIBRARY.length })}</button>
          </div>
          <span className="caption" style={{ marginTop: -6 }}>{t('bestiePicksSub')}</span>
          <div className="row" style={{ gap: 12, overflowX: 'auto', margin: '0 -24px', padding: '0 24px 4px', alignItems: 'flex-start', scrollbarWidth: 'none' }}>
            {LIBRARY.map((l) => <PickCard key={l.id} l={l} width={132} />)}
          </div>
          {list.length > 0 && <h2 className="heading" style={{ paddingTop: 6 }}>{t('yourRecipes')}</h2>}
        </section>
      )}
      {filter === 'picks' && <span className="caption">{t('bestiePicksSub')}</span>}

      {list.length === 0 && filter !== 'picks' && (
        <div className="empty">
          <img src="/icons/cat-cupboard.png" alt="" />
          <p style={{ margin: 0 }}>{t('emptyRecipes')}</p>
          <button className="btn primary" onClick={() => nav('/recipes/new')}>{t('addRecipe')}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {list.map((r) => <RecipeCard key={r.id} r={r} onOpen={() => nav(`/recipes/${r.id}`)} />)}
      </div>

      {missing.length > 0 && (
        <button className="btn ghost small" style={{ alignSelf: 'center', border: 'none' }}
          onClick={() => { missing.forEach((r) => saveRecipe(r)); toast(t('startersBack')) }}>
          <Icon name="plus" size={16} />{t('bringBackStarters', { n: missing.length })}
        </button>
      )}
    </main>
  )
}

function RecipeCard({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const t = useT()
  useFamily((s) => s.links) // re-render when names load
  const photo = usePhoto(r.photo)
  return (
    <button onClick={onOpen} className="card" style={{ padding: 10, border: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <div className="thumb" style={{ width: '100%', height: 130, borderRadius: 20, backgroundImage: photo ? `url(${photo})` : undefined }}>
          {!photo && <img src={foodArt(r.title, r.category)} alt="" style={{ width: 96, height: 96 }} />}
        </div>
        {r.favourite && <span style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 999, background: 'var(--surface-raised)', color: 'var(--cherry)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="heart" size={16} fill /></span>}
      </div>
      <span className="stack" style={{ gap: 2, padding: '0 4px 4px' }}>
        <span className="caption">{t(r.category)}{r.minutes ? ` · ${t('minutes', { n: r.minutes })}` : ''}</span>
        {r.ownerId && <span className="caption" style={{ color: 'var(--cherry)', fontWeight: 600 }}>{t('fromPerson', { name: personName(r.ownerId) ?? t('family') })}</span>}
        <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{r.title}</span>
      </span>
    </button>
  )
}
