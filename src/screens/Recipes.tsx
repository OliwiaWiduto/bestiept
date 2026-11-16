import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useT } from '../i18n'
import { MEALS, type Meal, type Recipe } from '../types'
import { usePhoto } from '../lib/sync'
import { CoachTip, Icon } from '../components/ui'
import { foodArt } from '../lib/art'
import { personName, useFamily } from '../lib/family'

type Filter = 'all' | 'fav' | Meal

export default function Recipes() {
  const t = useT()
  const nav = useNavigate()
  const recipes = useRecipes()
  const seeTip = useStore((s) => s.seeTip)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return recipes
      .filter((r) => filter === 'all' || (filter === 'fav' ? r.favourite : r.category === filter))
      .filter((r) => !query || r.title.toLowerCase().includes(query) || r.ingredients.some((i) => i.name.toLowerCase().includes(query)))
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [recipes, filter, q])

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
        <button className="chip" aria-pressed={filter === 'fav'} onClick={() => setFilter('fav')}><Icon name="heart" size={14} fill />&nbsp;{t('favourites')}</button>
        {MEALS.map((m) => <button key={m} className="chip" aria-pressed={filter === m} onClick={() => setFilter(m)}>{t(m)}</button>)}
      </div>

      {list.length === 0 && (
        <div className="empty">
          <img src="/icons/cat-cupboard.png" alt="" />
          <p style={{ margin: 0 }}>{t('emptyRecipes')}</p>
          <button className="btn primary" onClick={() => nav('/recipes/new')}>{t('addRecipe')}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {list.map((r) => <RecipeCard key={r.id} r={r} onOpen={() => nav(`/recipes/${r.id}`)} />)}
      </div>
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
