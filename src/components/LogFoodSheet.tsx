import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { defaultMeal, useUI } from '../ui-state'
import { useT } from '../i18n'
import { MEALS, type FoodItem, type Macros, type Meal } from '../types'
import { FOODS } from '../lib/foods'
import { uid } from '../lib/util'
import { BarcodeScanner } from './BarcodeScanner'
import { Icon, Sheet, Stepper, Thumb, toast, type IconName } from './ui'

type Mode = 'menu' | 'recipe' | 'search' | 'quick' | 'barcode'
type Picked = { name: string; per: Macros; portion: number; source?: string }

export default function LogFoodSheet() {
  const t = useT()
  const { logOpen, logMeal, closeLog, viewDate } = useUI()
  const { recipes, saveLog, logs } = useStore()
  const [mode, setMode] = useState<Mode>('menu')
  const [meal, setMeal] = useState<Meal>(defaultMeal())
  const [query, setQuery] = useState('')
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [servings, setServings] = useState(1)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [grams, setGrams] = useState('100')
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'notfound'>('idle')
  const [typing, setTyping] = useState(false)
  const [scanError, setScanError] = useState<'denied' | 'unavailable' | null>(null)
  const [dest, setDest] = useState<'own' | 'existing'>('own')
  const [targetId, setTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (logOpen) {
      setMode('menu'); setMeal(logMeal ?? defaultMeal()); setQuery(''); setRecipeId(null); setServings(1); setPicked(null)
      setQuick({ name: '', kcal: '', protein: '', carbs: '', fat: '' }); setCode(''); setLookup('idle'); setTyping(false); setScanError(null); setDest('own'); setTargetId(null)
    }
  }, [logOpen, logMeal])

  const foods = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FOODS.filter((f) => !q || f[t.lang].toLowerCase().includes(q) || f.en.toLowerCase().includes(q)).slice(0, 30)
  }, [query, t.lang])
  const recipeList = useMemo(() => recipes.filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase())), [recipes, query])

  const mealChips = (
    <div className="chips" role="group" aria-label={t('whichMeal')}>
      {MEALS.map((m) => <button key={m} className="chip" aria-pressed={meal === m} onClick={() => setMeal(m)}>{t(m)}</button>)}
    </div>
  )

  const dayLogs = logs.filter((l) => l.date === viewDate).sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal) || a.createdAt - b.createdAt)
  const target = dest === 'existing' ? dayLogs.find((l) => l.id === targetId) : undefined

  /** Save a single food either as its own meal or into a meal already logged that day. */
  const saveItem = (name: string, item: FoodItem) => {
    if (target) {
      saveLog({ ...target, items: [...target.items, item] })
      closeLog()
      toast(t('addedToNamed', { name: target.name }))
    } else save(name, [item])
  }

  const destination = (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chips" role="group">
        <button className="chip" aria-pressed={dest === 'own'} onClick={() => setDest('own')}>{t('ownMeal')}</button>
        <button className="chip" aria-pressed={dest === 'existing'} onClick={() => { setDest('existing'); if (!targetId && dayLogs[0]) setTargetId(dayLogs[0].id) }}>{t('addToExisting')}</button>
      </div>
      {dest === 'existing' && dayLogs.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          {dayLogs.map((l) => (
            <button key={l.id} className="meal-row" aria-pressed={targetId === l.id} onClick={() => setTargetId(l.id)}
              style={{ border: `2px solid ${targetId === l.id ? 'var(--green)' : 'transparent'}`, padding: 10 }}>
              <Thumb photo={l.photo} size={40} />
              <span className="grow stack" style={{ gap: 0 }}><span className="caption">{t(l.meal)}</span><span style={{ fontWeight: 600, fontSize: 15 }}>{l.name}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {dest === 'existing' && <span className="small muted">{t('noMealsYet')}</span>}
          {mealChips}
        </>
      )}
    </div>
  )
  const addLabel = target ? t('addToNamed', { name: target.name }) : t('addToMeal', { meal: t(meal) })

  const save = (name: string, items: FoodItem[], extra?: { photo?: string; recipeId?: string }) => {
    saveLog({ id: uid(), date: viewDate, meal, name, items, createdAt: Date.now(), ...extra })
    closeLog()
    toast(`${name} · ${t(meal)}`)
  }

  const option = (icon: IconName, label: string, onClick?: () => void, sub?: string) => (
    <button key={label} className="meal-row" onClick={onClick} disabled={!onClick} style={{ opacity: onClick ? 1 : 0.55 }}>
      <span className="thumb" style={{ width: 44, height: 44, background: 'var(--peach-soft)' }}><Icon name={icon} /></span>
      <span className="grow stack" style={{ gap: 0 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {sub && <span className="caption">{sub}</span>}
      </span>
      {onClick && <Icon name="forward" size={18} />}
    </button>
  )


  const back = mode !== 'menu' && (
    <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => { setMode('menu'); setPicked(null); setRecipeId(null); setQuery('') }}>
      <Icon name="back" size={18} />{t('back')}
    </button>
  )

  const gramsStep = picked && (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack" style={{ gap: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 17 }}>{picked.name}</span>
        <span className="caption">{Math.round(picked.per.kcal)} {t('kcal')} {t('per100')} · {picked.source ?? t('approx')}</span>
      </div>
      <label className="between"><span className="label">{t('howMuch')}</span>
        <span className="grams" style={{ height: 52 }}><input autoFocus type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} /><span className="muted">g</span></span>
      </label>
      {destination}
      <button className="btn primary block" disabled={!(Number(grams) > 0)}
        onClick={() => saveItem(picked.name, { id: uid(), name: picked.name, amount: Number(grams), unit: 'g', per: picked.per })}>
        {addLabel}
      </button>
    </div>
  )

  const lookUp = async (c: string = code) => {
    setLookup('loading')
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c.trim())}.json?fields=product_name,brands,nutriments,serving_quantity`)
      const data = await res.json()
      const n = data?.product?.nutriments
      if (!data?.product || !n || n['energy-kcal_100g'] === undefined) { setLookup('notfound'); setTyping(true); return }
      const name = [data.product.brands?.split(',')[0], data.product.product_name].filter(Boolean).join(' ') || c
      setPicked({
        name,
        per: { kcal: +n['energy-kcal_100g'] || 0, protein: +n.proteins_100g || 0, carbs: +n.carbohydrates_100g || 0, fat: +n.fat_100g || 0, fibre: +n.fiber_100g || 0, sugar: +n.sugars_100g || 0 },
        portion: +data.product.serving_quantity || 100,
        source: t('foodData'),
      })
      setGrams(String(Math.round(+data.product.serving_quantity || 100)))
      setLookup('idle')
    } catch {
      setLookup('notfound'); setTyping(true)
    }
  }

  const onScan = useCallback((c: string) => { setCode(c); lookUp(c) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onScanFail = useCallback((why: 'denied' | 'unavailable') => { setScanError(why); setTyping(true) }, [])

  const r = recipes.find((x) => x.id === recipeId)

  return (
    <Sheet open={logOpen} onClose={closeLog} title={t('logFood')}>
      {back}
      {mode === 'menu' && (
        <div className="stack">
          {option('book', t('fromRecipe'), () => setMode('recipe'))}
          {option('search', t('searchFoods'), () => setMode('search'))}
          {option('barcode', t('barcode'), () => setMode('barcode'))}
          {option('bolt', t('quickAdd'), () => setMode('quick'))}
          {option('camera', t('photoScan'), undefined, t('comingSoon'))}
        </div>
      )}

      {mode === 'recipe' && !r && (
        <div className="stack">
          <input className="input" placeholder={t('searchRecipes')} value={query} onChange={(e) => setQuery(e.target.value)} />
          {recipeList.length === 0 && <p className="muted">{t('emptyRecipes')}</p>}
          {recipeList.map((x) => (
            <button key={x.id} className="meal-row" onClick={() => { setRecipeId(x.id); setMeal(x.category) }}>
              <Thumb photo={x.photo} size={48} />
              <span className="grow" style={{ fontWeight: 600 }}>{x.title}</span>
              <span className="small muted">{x.nutrition.kcal} {t('kcal')}</span>
            </button>
          ))}
        </div>
      )}
      {mode === 'recipe' && r && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="meal-row"><Thumb photo={r.photo} /><span className="grow" style={{ fontWeight: 600 }}>{r.title}</span></div>
          <div className="between"><span className="label">{t('servingsEaten')}</span><Stepper value={servings} onChange={setServings} label={t('servings')} /></div>
          {mealChips}
          <button className="btn primary block" onClick={() => save(r.title, [{ id: uid(), name: r.title, amount: servings, unit: 'serving', per: r.nutrition }], { photo: r.photo, recipeId: r.id })}>
            {t('addToMeal', { meal: t(meal) })}
          </button>
        </div>
      )}

      {mode === 'search' && !picked && (
        <div className="stack">
          <input className="input" autoFocus placeholder={t('searchPh')} value={query} onChange={(e) => setQuery(e.target.value)} />
          {foods.length === 0 && <p className="muted">{t('noResults')}</p>}
          <div className="card tight">
            {foods.map((f) => (
              <button key={f.en} className="list-row" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
                onClick={() => { setPicked({ name: f[t.lang], per: f.per, portion: f.portion }); setGrams(String(f.portion)) }}>
                <span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>{f[t.lang]}</span>
                <span className="small muted">{f.per.kcal} {t('kcal')} / 100g</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {(mode === 'search' || mode === 'barcode') && gramsStep}

      {mode === 'barcode' && !picked && (
        <div className="stack" style={{ gap: 16 }}>
          {lookup === 'loading' ? <p className="muted" style={{ margin: 0 }}>{t('lookingUp')}</p> : !typing && <BarcodeScanner onCode={onScan} onFail={onScanFail} />}
          {!typing && <button className="btn ghost small" style={{ alignSelf: 'center' }} onClick={() => setTyping(true)}>{t('typeInstead')}</button>}
          {typing && <>
          {scanError && <p className="tip" style={{ margin: 0 }}>{t(scanError === 'denied' ? 'cameraDenied' : 'cameraUnavailable')}</p>}
          <label className="field"><span>{t('enterBarcode')}</span>
            <input className="input" inputMode="numeric" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setLookup('idle') }} onKeyDown={(e) => { if (e.key === 'Enter' && code.length >= 8) lookUp() }} />
          </label>
          {lookup === 'notfound' && <p className="muted" style={{ margin: 0 }}>{t('notFound')}</p>}
          <button className="btn green block" disabled={code.length < 8 || lookup === 'loading'} onClick={() => lookUp()}>{lookup === 'loading' ? t('lookingUp') : t('lookUp')}</button>
          </>}
          <span className="caption">{t('foodData')}</span>
        </div>
      )}

      {mode === 'quick' && (
        <div className="stack" style={{ gap: 12 }}>
          <label className="field"><span>{t('quickName')}</span><input className="input" autoFocus value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
              <label key={k} className="field"><span>{k === 'kcal' ? t('calories') : `${t(k)} (g)`}</span>
                <input className="input" type="number" inputMode="decimal" value={quick[k]} onChange={(e) => setQuick({ ...quick, [k]: e.target.value })} /></label>
            ))}
          </div>
          {destination}
          <button className="btn primary block" disabled={!quick.name.trim() || !(Number(quick.kcal) >= 0) || quick.kcal === ''}
            onClick={() => saveItem(quick.name.trim(), { id: uid(), name: quick.name.trim(), amount: 1, unit: 'serving', per: { kcal: +quick.kcal || 0, protein: +quick.protein || 0, carbs: +quick.carbs || 0, fat: +quick.fat || 0, fibre: 0, sugar: 0 } })}>
            {addLabel}
          </button>
        </div>
      )}
    </Sheet>
  )
}
