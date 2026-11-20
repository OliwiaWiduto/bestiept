import { useCallback, useState } from 'react'
import { useT } from '../i18n'
import type { FoodItem, Macros } from '../types'
import { useFoodSearch } from '../lib/foodSearch'
import { lookupBarcode } from '../lib/barcode'
import { scanMeal, scanMealText, type ScannedItem } from '../lib/ai'
import { checkAgainstFoodData } from '../lib/matchFood'
import { uid } from '../lib/util'
import { BarcodeScanner } from './BarcodeScanner'
import { VoiceLog } from './VoiceLog'
import { Icon, PhotoButton, Sheet, toast, type IconName } from './ui'

type Mode = 'menu' | 'barcode' | 'voice' | 'type' | 'quick'

/** Add something to a meal: search, photo, barcode, voice, type it or quick add (everything except recipes). */
export function AddItemSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (items: FoodItem[]) => void }) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('menu')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [custom, setCustom] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const list = useFoodSearch(q, t.lang, 12)

  const close = () => { setMode('menu'); setQ(''); setBusy(false); setCode(''); onClose() }
  const done = (items: FoodItem[]) => { onAdd(items); setMode('menu'); setQ(''); setBusy(false); setCode('') }
  const fromAi = async (items: ScannedItem[]) =>
    checkAgainstFoodData(items.map((i) => ({ id: uid(), name: i.name, amount: Math.max(1, Math.round(i.grams)), unit: 'g' as const, per: i.per100, search: i.search })), t.lang)

  const photo = async (img: string) => {
    setBusy(true)
    const { data, error } = await scanMeal(img, t.lang)
    if (!data) { setBusy(false); toast(t(`ai_${error ?? 'failed'}`)); return }
    done(await fromAi(data.meal.items))
  }
  const said = async (text: string) => {
    const { data, error } = await scanMealText(text, t.lang)
    if (!data) { toast(t(`ai_${error ?? 'failed'}`)); return false }
    done(await fromAi(data.meal.items))
    return true
  }
  const barcode = useCallback(async (c: string) => {
    setBusy(true)
    const f = await lookupBarcode(c, t.lang)
    setBusy(false)
    if (!f) { toast(t('notFound')); setMode('quick'); return }
    onAdd([{ id: uid(), name: f.name, amount: Math.round(f.portion), unit: 'g', per: f.per, src: 'uk' }])
    setMode('menu')
  }, [t, onAdd])
  const onFail = useCallback(() => toast(t('cameraNo')), [t])

  const tile = (icon: IconName, label: string, onClick: () => void) => (
    <button key={label} className="log-tile" aria-label={label} title={label} onClick={onClick}><Icon name={icon} size={24} sw={1.75} /></button>
  )
  const back = <button className="icon-btn" style={{ alignSelf: 'flex-start' }} aria-label={t('back')} onClick={() => setMode('menu')}><Icon name="back" /></button>

  return (
    <Sheet open={open} onClose={close} title={t('addSomething')} tall={mode === 'menu'}>
      {mode === 'menu' && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="log-tiles">
            <PhotoButton max={1200} disabled={busy} onPhoto={photo} label={t('photoScan')} className="log-tile"><Icon name="camera" size={24} sw={1.75} /></PhotoButton>
            {tile('barcode', t('barcode'), () => setMode('barcode'))}
            {tile('mic', t('voiceLog'), () => setMode('voice'))}
            {tile('edit', t('typeLog'), () => setMode('type'))}
            {tile('plus', t('quickAdd'), () => setMode('quick'))}
          </div>
          {busy && <span className="small muted" role="status">{t('voiceWorking')}</span>}
          <label className="search-field">
            <Icon name="search" size={20} />
            <input type="search" placeholder={t('searchFoods')} aria-label={t('searchFoods')} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {q.trim() && (list.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('noResults')}</p> : (
            <div className="card tight">
              {list.map((f) => (
                <button key={f.key} className="list-row" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
                  onClick={() => done([{ id: uid(), name: f.name, amount: f.portion, unit: 'g', per: f.per, src: 'uk' }])}>
                  <span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
                  <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{Math.round(f.per.kcal)} {t('kcal')} / 100g</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {mode === 'barcode' && (
        <div className="stack">
          {back}
          {busy ? <p className="muted" style={{ margin: 0 }}>{t('lookingUp')}</p> : <BarcodeScanner onCode={(c) => { setCode(c); barcode(c) }} onFail={onFail} />}
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (code.trim()) barcode(code) }}>
            <input className="input grow" inputMode="numeric" placeholder={t('barcodePh')} aria-label={t('barcode')} value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn secondary" disabled={!code.trim() || busy}>{t('lookUp')}</button>
          </form>
        </div>
      )}

      {mode === 'voice' && <VoiceLog onClose={() => setMode('menu')} onDone={said} />}
      {mode === 'type' && <VoiceLog typing onClose={() => setMode('menu')} onDone={said} />}

      {mode === 'quick' && (
        <div className="stack">
          {back}
          <input className="input" placeholder={t('quickName')} aria-label={t('quickName')} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
              <label key={k} className="field"><span>{k === 'kcal' ? t('calories') : `${t(k)} (g)`}</span>
                <input className="input" type="text" inputMode="decimal" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} /></label>
            ))}
          </div>
          <button className="btn primary block" disabled={!custom.name.trim() || custom.kcal === ''}
            onClick={() => {
              const per: Macros = { kcal: +custom.kcal || 0, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0, fibre: 0, sugar: 0 }
              done([{ id: uid(), name: custom.name.trim(), amount: 1, unit: 'serving', per }])
              setCustom({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
            }}>{t('add')}</button>
        </div>
      )}
    </Sheet>
  )
}
