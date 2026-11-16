import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Activity, Goal, Macros, Profile, Sex } from '../types'
import { calcTargets } from '../lib/nutrition'
import { sampleRecipes } from '../lib/samples'
import { DEFAULT_STAPLES, DEFAULT_STAPLES_PL } from '../lib/shopping'
import { Icon, NumberField } from '../components/ui'
import { HeightField, UnitsToggle, WeightField } from '../components/BodyFields'

export default function Onboarding() {
  const t = useT()
  const { lang, setLang, completeOnboarding, setTargets } = useStore()
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>({ name: '', sex: 'female', age: 28, heightCm: 165, weightKg: 65, activity: 'light', goal: 'maintain' })
  const auto = useMemo(() => calcTargets(p), [p])
  const [custom, setCustom] = useState<Macros | null>(null)
  const [editing, setEditing] = useState(false)
  const targets = custom ?? auto
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => { setP({ ...p, [k]: v }); setCustom(null) }

  const valid = [true, p.name.trim().length > 0, p.age >= 13 && p.age <= 100 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 300, true, true, true][step]
  const finish = () => {
    completeOnboarding({ ...p, name: p.name.trim() }, sampleRecipes(lang), lang === 'pl' ? DEFAULT_STAPLES_PL : DEFAULT_STAPLES)
    if (custom) setTargets(custom)
  }

  const option = (selected: boolean, label: string, onClick: () => void) => (
    <button key={label} className="meal-row" aria-pressed={selected} onClick={onClick}
      style={{ border: `2px solid ${selected ? 'var(--green)' : 'transparent'}`, minHeight: 60, fontWeight: 600, fontSize: 16, padding: '16px 18px' }}>
      <span className={`check ${selected ? 'on' : ''}`} style={{ borderRadius: 999 }}>{selected && <Icon name="check" size={16} sw={2.5} />}</span>
      {label}
    </button>
  )

  return (
    <main className="screen no-nav" style={{ minHeight: '100dvh' }}>
      {step > 0 && (
        <div className="between">
          <button className="icon-btn" aria-label={t('back')} onClick={() => setStep(step - 1)}><Icon name="back" /></button>
          <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ width: 22, height: 6, borderRadius: 999, background: i <= step ? 'var(--green)' : 'var(--line)' }} />)}
          </div>
          <span style={{ width: 44 }} />
        </div>
      )}

      {step === 0 && (
        <div className="stack" style={{ gap: 24, paddingTop: 40 }}>
          <img src="/icons/cat-fruitveg.png" alt="" width={96} height={96} style={{ width: 96, height: 96 }} />
          <h1 className="display" style={{ fontSize: 44, lineHeight: '46px' }}>{t('obWelcome')}</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: '26px' }} className="muted">{t('obWelcomeSub')}</p>
          <div className="stack">
            <span className="label">{t('obLanguage')}</span>
            <div className="chips" role="group" aria-label={t('obLanguage')}>
              <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
              <button className="chip" aria-pressed={lang === 'pl'} onClick={() => setLang('pl')}>Polski</button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ gap: 20 }}>
          <h1 className="title">{t('obName')}</h1>
          <label className="field"><span className="sr-only">{t('obNamePh')}</span>
            <input className="input" autoFocus placeholder={t('obNamePh')} value={p.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valid && setStep(2)} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 16 }}>
          <h1 className="title">{t('obAbout')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t('obAboutSub')}</p>
          <div className="stack"><span className="label">{t('sex')}</span>
            <div className="chips" role="group" aria-label={t('sex')}>
              {(['female', 'male'] as Sex[]).map((s) => <button key={s} className="chip" aria-pressed={p.sex === s} onClick={() => set('sex', s)}>{t(s)}</button>)}
            </div>
          </div>
          <NumberField label={t('age')} value={p.age} onChange={(v) => set('age', v)} />
          <div className="stack"><span className="label">{t('units')}</span><UnitsToggle /></div>
          <HeightField cm={p.heightCm} onChange={(v) => set('heightCm', v)} />
          <WeightField kg={p.weightKg} onChange={(v) => set('weightKg', v)} />
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('obActivity')}</h1>
          {(['low', 'light', 'moderate', 'high'] as Activity[]).map((a) =>
            option(p.activity === a, t(({ low: 'actLow', light: 'actLight', moderate: 'actModerate', high: 'actHigh' } as const)[a]), () => set('activity', a)))}
        </div>
      )}

      {step === 4 && (
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('obGoal')}</h1>
          {(['lose', 'maintain', 'gain'] as Goal[]).map((g) =>
            option(p.goal === g, t(({ lose: 'goalLose', maintain: 'goalMaintain', gain: 'goalGain' } as const)[g]), () => set('goal', g)))}
        </div>
      )}

      {step === 5 && (
        <div className="stack" style={{ gap: 16 }}>
          <h1 className="title">{t('obTargets')}</h1>
          <div className="card green" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="number-hero" style={{ color: 'var(--lime)' }}>{targets.kcal}</span><span>{t('kcal')}</span>
          </div>
          <span className="small muted" style={{ marginTop: -6 }}>{t('ex_kcal')}</span>
          <p style={{ margin: 0 }}>{t('tgIntro')}</p>
          <div className="card tight">
            {(['protein', 'carbs', 'fat', 'fibre', 'sugar'] as (keyof Macros)[]).map((k) => (
              <div key={k} className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className="grow stack" style={{ gap: 2 }}>
                  <span className="label">{t(k)}{k === 'sugar' ? ` (${t('limit')})` : ''}</span>
                  <span className="small muted">{t(`ex_${k}` as const)}</span>
                </span>
                {editing
                  ? <span className="grams"><input type="number" inputMode="numeric" aria-label={t(k)} value={targets[k]} onChange={(e) => setCustom({ ...targets, [k]: Number(e.target.value) || 0 })} /><span className="muted">g</span></span>
                  : <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>{targets[k]}g</span>}
              </div>
            ))}
          </div>
          {!editing && <button className="btn ghost small" style={{ alignSelf: 'center', border: 'none', textDecoration: 'underline' }} onClick={() => setEditing(true)}>{t('customise')}</button>}
          {editing && (
            <div className="stack" style={{ gap: 10 }}>
              <span className="small muted">{t('customiseHint')}</span>
              <label className="between"><span className="label">{t('calories')}</span>
                <span className="grams"><input type="number" inputMode="numeric" aria-label={t('calories')} style={{ width: 60 }} value={targets.kcal} onChange={(e) => setCustom({ ...targets, kcal: Number(e.target.value) || 0 })} /><span className="muted">kcal</span></span>
              </label>
              <button className="btn ghost small" style={{ alignSelf: 'center', border: 'none', textDecoration: 'underline' }} onClick={() => { setCustom(null); setEditing(false) }}>{t('useRecommended')}</button>
            </div>
          )}
        </div>
      )}

      <div className="bottom-bar">
        <button className="btn primary block" disabled={!valid} onClick={() => (step === 5 ? finish() : setStep(step + 1))}>
          {step === 0 ? t('obStart') : step === 5 ? t('obGo') : t('continue')}
        </button>
      </div>
    </main>
  )
}
