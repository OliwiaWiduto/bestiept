import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { defaultMeal, useUI } from '../ui-state'
import { useT } from '../i18n'
import { MEALS, type FoodItem, type LogEntry, type Macros, type Meal } from '../types'
import { useFoodSearch } from '../lib/foodSearch'
import { uid } from '../lib/util'
import { BarcodeScanner } from './BarcodeScanner'
import { scanMeal, scanMealText, type ScannedItem } from '../lib/ai'
import { checkAgainstFoodData, recipeItems } from '../lib/matchFood'
import { IngredientForm, IngredientRow, MealHeader } from './MealParts'
import { VoiceLog } from './VoiceLog'
import { itemMacros, sumItems } from '../lib/nutrition'
import { Icon, PhotoButton, Sheet, Stepper, Thumb, toast, type IconName } from './ui'

type Mode = 'menu' | 'recipe' | 'search' | 'quick' | 'barcode' | 'scan' | 'voice' | 'type' | 'again'
type Picked = { name: string; per: Macros; portion: number; source?: string }

export default function LogFoodSheet() {
  const t = useT()
  const { logOpen, logMeal, closeLog, viewDate } = useUI()
  const { saveLog, logs, seeTip } = useStore()
  const recipes = useRecipes()
  const tips = useStore((st) => st.profile?.tips)
  const [mode, setMode] = useState<Mode>('menu')
  const [meal, setMeal] = useState<Meal>(defaultMeal())
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'food' | 'recipe'>('all')
  const [busy, setBusy] = useState(false)
  const [again, setAgain] = useState<LogEntry | null>(null)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [servings, setServings] = useState(1)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [grams, setGrams] = useState('100')
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'notfound'>('idle')
  const [typing, setTyping] = useState(false)
  const [scan, setScan] = useState<{ photo?: string; name: string; items: FoodItem[] } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [guessNote, setGuessNote] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<'denied' | 'unavailable' | null>(null)
  const [dest, setDest] = useState<'own' | 'existing'>('own')
  const [targetId, setTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (logOpen) {
      setMode('menu'); setMeal(logMeal ?? defaultMeal()); setQuery(''); setTab('all'); setAgain(null); setRecipeId(null); setServings(1); setPicked(null)
      setQuick({ name: '', kcal: '', protein: '', carbs: '', fat: '' }); setCode(''); setLookup('idle'); setTyping(false); setScan(null); setEditId(null); setGuessNote(false); setScanning(false); setScanError(null); setDest('own'); setTargetId(null)
    }
  }, [logOpen, logMeal])

  const foods = useFoodSearch(mode === 'menu' || mode === 'search' ? query : '', t.lang)
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
              <Thumb cat={l.meal} name={l.name} photo={l.photo} size={40} />
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



  const goBack = () => { setMode('menu'); setPicked(null); setRecipeId(null); setScan(null); setEditId(null); setAgain(null) }
  const back = mode !== 'menu' && !editId && (
    <button className="icon-btn" style={{ alignSelf: 'flex-start' }} aria-label={t('back')} onClick={goBack}><Icon name="back" /></button>
  )

  const gramsStep = picked && (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack" style={{ gap: 6 }}>
        <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{picked.name}</span>
          <label className="grams" style={{ height: 44, flex: 'none' }}><span className="sr-only">{t('howMuch')}</span>
            <input autoFocus type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} /><span className="muted">g</span></label>
        </div>
        {(() => { const m = itemMacros({ id: 'x', name: '', amount: Number(grams) || 0, unit: 'g', per: picked.per }); return (
          <span className="caption">{Math.round(m.kcal)} {t('kcal')} · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}</span>) })()}
        <span className="caption">{picked.source ?? t('approx')} · {Math.round(picked.per.kcal)} {t('kcal')} {t('per100')}</span>
      </div>
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

  // AI works out what and how much; the figures per 100g come from our food data wherever we have the food.
  const toItems = (items: ScannedItem[]): Promise<FoodItem[]> =>
    checkAgainstFoodData(items.map((i) => ({ id: uid(), name: i.name, amount: Math.max(1, Math.round(i.grams)), unit: 'g' as const, per: i.per100, search: i.search })), t.lang)
  const showGuess = () => {
    if (!(tips ?? []).includes('scanGuess')) { setGuessNote(true); seeTip('scanGuess') }
  }
  const runScan = async (photo: string) => {
    setScanning(true)
    const { data, error } = await scanMeal(photo, t.lang)
    if (!data) { setScanning(false); toast(t(`ai_${error ?? 'failed'}`)); return }
    const items = await toItems(data.meal.items)
    setScanning(false)
    showGuess()
    setScan({ photo, name: data.meal.name, items })
  }
  const runVoice = async (text: string) => {
    const { data, error } = await scanMealText(text, t.lang)
    if (!data) { toast(t(`ai_${error ?? 'failed'}`)); return false }
    showGuess()
    setScan({ name: data.meal.name, items: await toItems(data.meal.items) })
    setMode('scan')
    return true
  }
  const scanFoods: FoodItem[] = (scan?.items ?? []).filter((i) => i.name.trim() && i.amount > 0)
  const editing = scan?.items.find((i) => i.id === editId)

  const r = recipes.find((x) => x.id === recipeId)

  /** Up to 30 different things logged before, newest first. */
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: LogEntry[] = []
    for (const l of [...logs].sort((a, b) => b.createdAt - a.createdAt)) {
      const k = l.name.trim().toLowerCase()
      if (!k || seen.has(k)) continue
      seen.add(k); out.push(l)
      if (out.length >= 30) break
    }
    return out
  }, [logs])
  const logAgain = (l: LogEntry) => {
    const rec = l.recipeId ? recipes.find((x) => x.id === l.recipeId) : undefined
    const only = l.items.length === 1 ? l.items[0] : null
    if (rec && only && only.unit === 'serving') { setRecipeId(rec.id); setServings(only.amount || 1); setMode('recipe') }
    else if (only && only.unit === 'g') { setPicked({ name: only.name, per: only.per, portion: only.amount }); setGrams(String(Math.round(only.amount))); setMode('search') }
    else { setAgain(l); setMode('again') }
  }
  const searching = mode === 'menu' && query.trim().length > 0
  const recipeRow = (x: (typeof recipes)[number]) => (
    <button key={x.id} className="meal-row" onClick={() => { setRecipeId(x.id); setServings(1); setMode('recipe') }}>
      <Thumb cat={x.category} name={x.title} photo={x.photo} size={48} />
      <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
        <span style={{ fontWeight: 600 }}>{x.title}</span>
        <span className="caption">{t('recipe')}</span>
      </span>
      <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{Math.round(x.nutrition.kcal)} {t('kcal')}</span>
    </button>
  )
  const tile = (icon: IconName, label: string, onClick: () => void) => (
    <button key={label} className="log-tile" aria-label={label} title={label} onClick={onClick}><Icon name={icon} size={26} sw={1.75} /></button>
  )

  return (
    <Sheet open={logOpen} onClose={closeLog} title={t('logFood')} tall={mode === 'menu'}>
      {back}
      {mode === 'menu' && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="log-tiles">
            {tile('camera', t('photoScan'), () => setMode('scan'))}
            {tile('barcode', t('barcode'), () => setMode('barcode'))}
            {tile('mic', t('voiceLog'), () => setMode('voice'))}
            {tile('edit', t('typeLog'), () => setMode('type'))}
            {tile('plus', t('quickAdd'), () => setMode('quick'))}
          </div>
          <label className="search-field">
            <Icon name="search" size={20} />
            <input type="search" placeholder={t('searchFoodsRecipes')} aria-label={t('searchFoodsRecipes')} value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent' }} aria-label={t('clear')} onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
          </label>
          {searching && (
            <>
              <div className="chips" role="group">
                <button className="chip" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>{t('all')}</button>
                <button className="chip" aria-pressed={tab === 'food'} onClick={() => setTab('food')}>{t('foodsTab')}</button>
                <button className="chip" aria-pressed={tab === 'recipe'} onClick={() => setTab('recipe')}>{t('recipes')} {recipeList.length > 0 && <span className="muted">· {recipeList.length}</span>}</button>
              </div>
              {tab === 'all' && foods.length === 0 && recipeList.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('noResults')}</p>}
              {tab === 'all' && recipeList.slice(0, 4).map(recipeRow)}
              {(tab === 'food' || tab === 'all') && (foods.length === 0 ? tab === 'all' ? null : <p className="muted" style={{ margin: 0 }}>{t('noResults')}</p> : (
                <div className="card tight">
                  {foods.map((f) => (
                    <button key={f.key} className="list-row" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
                      onClick={() => { setPicked({ name: f.name, per: f.per, portion: f.portion, source: f.uk ? t('ukFoodData') : undefined }); setGrams(String(f.portion)); setMode('search') }}>
                      <span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
                      <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{f.per.kcal} {t('kcal')} / 100g</span>
                    </button>
                  ))}
                </div>
              ))}
              {tab === 'recipe' && (recipeList.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('noResults')}</p> : recipeList.map(recipeRow))}
            </>
          )}
          {!searching && recent.length > 0 && (
            <>
              <span className="label">{t('recentlyLogged')}</span>
              <div className="card tight">
                {recent.map((l) => (
                  <button key={l.id} className="list-row" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }} onClick={() => logAgain(l)}>
                    <Thumb cat={l.meal} name={l.name} photo={l.photo} size={40} />
                    <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{l.name}</span>
                      <span className="caption">{Math.round(sumItems(l.items).kcal)} {t('kcal')}</span>
                    </span>
                    <Icon name="plus" size={18} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {mode === 'again' && again && (
        <div className="stack" style={{ gap: 14 }}>
          <MealHeader photo={again.photo} name={again.name} onName={(name) => setAgain({ ...again, name })} />
          <div className="card tight">{again.items.map((i) => <div key={i.id} className="list-row"><span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>{i.name}</span><span className="small muted">{Math.round(itemMacros(i).kcal)} {t('kcal')}</span></div>)}</div>
          {mealChips}
          <button className="btn primary block" onClick={() => save(again.name, again.items.map((i) => ({ ...i, id: uid() })), again.photo ? { photo: again.photo } : undefined)}>{t('addToMeal', { meal: t(meal) })}</button>
        </div>
      )}

      {mode === 'recipe' && !r && (
        <div className="stack">
          <input className="input" placeholder={t('searchRecipes')} value={query} onChange={(e) => setQuery(e.target.value)} />
          {recipeList.length === 0 && <p className="muted">{t('emptyRecipes')}</p>}
          {recipeList.map((x) => (
            <button key={x.id} className="meal-row" onClick={() => { setRecipeId(x.id); setMeal(x.category) }}>
              <Thumb cat={x.category} name={x.title} photo={x.photo} size={48} />
              <span className="grow" style={{ fontWeight: 600 }}>{x.title}</span>
              <span className="small muted">{x.nutrition.kcal} {t('kcal')}</span>
            </button>
          ))}
        </div>
      )}
      {mode === 'recipe' && r && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="meal-row"><Thumb cat={r.category} name={r.title} photo={r.photo} /><span className="grow" style={{ fontWeight: 600 }}>{r.title}</span></div>
          <div className="between"><span className="label">{t('servingsEaten')}</span><Stepper value={servings} onChange={setServings} min={0.25} step={0.25} label={t('servings')} /></div>
          {mealChips}
          <span className="small muted">{t('recipeLogHint')}</span>
          <button className="btn primary block" disabled={busy} onClick={async () => {
            setBusy(true)
            const items = await recipeItems(r, servings, t.lang)
            setBusy(false)
            save(r.title, items, { photo: r.photo, recipeId: r.id })
          }}>
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
              <button key={f.key} className="list-row" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
                onClick={() => { setPicked({ name: f.name, per: f.per, portion: f.portion, source: f.uk ? t('ukFoodData') : undefined }); setGrams(String(f.portion)) }}>
                <span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
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

      {mode === 'scan' && !scan && (
        <div className="stack" style={{ gap: 12 }}>
          <PhotoButton max={1200} disabled={scanning} onPhoto={runScan} label={t('takeMealPhoto')} className="thumb"
            style={{ width: '100%', height: 200, borderRadius: 28, flexDirection: 'column', gap: 8, border: 'none' }}>
            <Icon name="camera" size={36} sw={1.5} /><span className="label">{scanning ? t('scanning') : t('takeMealPhoto')}</span>
          </PhotoButton>
          <span className="caption">{t('scanHint')}</span>
        </div>
      )}
      {mode === 'voice' && <VoiceLog onClose={() => setMode('menu')} onDone={runVoice} />}
      {mode === 'type' && <VoiceLog typing onClose={() => setMode('menu')} onDone={runVoice} />}
      {mode === 'scan' && scan && editing && (
        <IngredientForm item={editing} onCancel={() => setEditId(null)}
          onDelete={() => { setScan({ ...scan, items: scan.items.filter((x) => x.id !== editing.id) }); setEditId(null) }}
          onSave={(i) => { setScan({ ...scan, items: scan.items.map((x) => (x.id === i.id ? i : x)) }); setEditId(null) }} />
      )}
      {mode === 'scan' && scan && !editing && (
        <div className="stack" style={{ gap: 14 }}>
          <MealHeader photo={scan.photo} name={scan.name} onName={(name) => setScan({ ...scan, name })} />
          {guessNote && <div className="tip"><Icon name="check" size={22} /><span>{t('scanCheck')}</span></div>}
          <div className="card tight">
            {scan.items.map((i) => <IngredientRow key={i.id} item={i} onOpen={() => setEditId(i.id)} />)}
          </div>
          <div className="between"><span className="label">{t('total')}</span><b>{Math.round(scanFoods.reduce((a, f) => a + itemMacros(f).kcal, 0))} {t('kcal')}</b></div>
          {mealChips}
          <button className="btn primary block" disabled={!scanFoods.length} onClick={() => save(scan.name.trim() || t('photoScan'), scanFoods, scan.photo ? { photo: scan.photo } : undefined)}>
            {t('addToMeal', { meal: t(meal) })}
          </button>
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
