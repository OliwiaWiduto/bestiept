import { useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Activity, Goal, Macros, Profile, Sex } from '../types'
import { BackButton, Icon, NumberField, toast } from '../components/ui'

export default function Settings() {
  const t = useT()
  const { lang, setLang, profile, targets, updateProfile, setTargets, shopping, setShopping, resetAll } = useStore()
  const [p, setP] = useState<Profile | null>(profile)
  const [tg, setTg] = useState<Macros | null>(targets)
  const [staples, setStaples] = useState(shopping.staples.join('\n'))
  if (!p || !tg) return null

  const select = <T extends string>(label: string, value: T, options: [T, string][], on: (v: T) => void) => (
    <label className="field"><span>{label}</span>
      <select className="input" value={value} onChange={(e) => on(e.target.value as T)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  )

  return (
    <main className="screen">
      <div className="row"><BackButton to="/" /></div>
      <h1 className="display">{t('settings')}</h1>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('language')}</h2>
        <div className="chips" role="group" aria-label={t('language')}>
          <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>{t('english')}</button>
          <button className="chip" aria-pressed={lang === 'pl'} onClick={() => setLang('pl')}>{t('polish')}</button>
        </div>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('yourDetails')}</h2>
        <label className="field"><span>{t('obNamePh')}</span><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
        {select<Sex>(t('sex'), p.sex, [['female', t('female')], ['male', t('male')]], (v) => setP({ ...p, sex: v }))}
        <NumberField label={t('age')} value={p.age} onChange={(v) => setP({ ...p, age: v })} />
        <NumberField label={t('heightCm')} value={p.heightCm} onChange={(v) => setP({ ...p, heightCm: v })} />
        <NumberField label={t('weightKg')} value={p.weightKg} step={0.1} onChange={(v) => setP({ ...p, weightKg: v })} />
        {select<Activity>(t('obActivity'), p.activity, [['low', t('actLow')], ['light', t('actLight')], ['moderate', t('actModerate')], ['high', t('actHigh')]], (v) => setP({ ...p, activity: v }))}
        {select<Goal>(t('obGoal'), p.goal, [['lose', t('goalLose')], ['maintain', t('goalMaintain')], ['gain', t('goalGain')]], (v) => setP({ ...p, goal: v }))}
        <div className="row">
          <button className="btn secondary grow" onClick={() => { updateProfile(p, false); toast(t('saved')) }}>{t('save')}</button>
          <button className="btn green grow" onClick={() => { updateProfile(p, true); setTg(useStore.getState().targets); toast(t('saved')) }}>{t('recalc')}</button>
        </div>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('dailyTargets')}</h2>
        {(['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar'] as (keyof Macros)[]).map((k) => (
          <label key={k} className="between">
            <span className="label">{k === 'kcal' ? t('calories') : t(k)}{k === 'sugar' ? ` (${t('limit')})` : ''}</span>
            <span className="grams"><input type="number" inputMode="numeric" value={tg[k]} onChange={(e) => setTg({ ...tg, [k]: Number(e.target.value) || 0 })} /><span className="muted">{k === 'kcal' ? '' : 'g'}</span></span>
          </label>
        ))}
        <button className="btn secondary" onClick={() => { setTargets(tg); toast(t('saved')) }}>{t('save')}</button>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('staples')}</h2>
        <span className="small muted">{t('staplesSettingsHint')}</span>
        <textarea className="input" rows={6} value={staples} onChange={(e) => setStaples(e.target.value)} />
        <button className="btn secondary" onClick={() => { setShopping({ staples: staples.split('\n').map((s) => s.trim()).filter(Boolean), staplesAsked: true }); toast(t('saved')) }}>{t('save')}</button>
      </section>

      <section className="card stack" style={{ gap: 8 }}>
        <h2 className="heading">{t('family')}</h2>
        <span className="small muted">{t('familySoon')}</span>
      </section>

      <button className="btn ghost" style={{ color: 'var(--cherry)', alignSelf: 'center', border: 'none' }} onClick={() => { if (confirm(t('resetConfirm'))) resetAll() }}>
        <Icon name="trash" size={18} />{t('resetData')}
      </button>
    </main>
  )
}
