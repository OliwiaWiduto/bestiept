import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Activity, Goal, Profile, Sex } from '../types'
import { calcTargets } from '../lib/nutrition'
import { sampleRecipes } from '../lib/samples'
import { DEFAULT_STAPLES, DEFAULT_STAPLES_PL } from '../lib/shopping'
import { canPromptInstall, isInstalled, isIos, openInBrowserUrl, promptInstall, whereOpen } from '../lib/install'
import { Icon, NumberField } from '../components/ui'
import { HeightField, UnitsToggle, WeightField } from '../components/BodyFields'

// Same colours as the bars on the Today screen
const TARGET_CARDS: ['protein' | 'carbs' | 'fat' | 'fibre', string, string][] = [
  ['protein', 'var(--cherry)', '#fff'],
  ['carbs', 'var(--butter)', 'var(--ink)'],
  ['fat', 'var(--olive)', 'var(--ink)'],
  ['fibre', 'var(--lime)', 'var(--ink)'],
]

export default function Onboarding() {
  const t = useT()
  const { lang, setLang, completeOnboarding } = useStore()
  const [step, setStep] = useState(0)
  const [where] = useState(() => (isInstalled() ? 'desktop' : whereOpen()))
  const showHome = where !== 'desktop'
  const last = showHome ? 6 : 5
  const [, rerender] = useState(0)
  const [p, setP] = useState<Profile>({ name: '', sex: 'female', age: 28, heightCm: 165, weightKg: 65, activity: 'light', goal: 'maintain' })
  const auto = useMemo(() => calcTargets(p), [p])
  const targets = auto
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v })

  const valid = [true, p.name.trim().length > 0, p.age >= 13 && p.age <= 100 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 300, true, true, true, true][step]
  const finish = () => {
    completeOnboarding({ ...p, name: p.name.trim() }, sampleRecipes(lang), lang === 'pl' ? DEFAULT_STAPLES_PL : DEFAULT_STAPLES)
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
            {Array.from({ length: last }, (_, n) => n + 1).map((i) => <span key={i} style={{ width: 22, height: 6, borderRadius: 999, background: i <= step ? 'var(--green)' : 'var(--line)' }} />)}
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
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('obTargets')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t('tgIntro')}</p>
          <div className="card green" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 18px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{t('calories')}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="number-hero" style={{ color: 'var(--lime)' }}>{targets.kcal}</span><span>{t('kcal')}</span>
            </span>
            <span style={{ fontSize: 13, lineHeight: '18px', opacity: 0.85 }}>{t('ex_kcal')}</span>
          </div>
          {TARGET_CARDS.map(([k, bg, fg]) => (
            <div key={k} className="card" style={{ background: bg, color: fg, display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 18px', border: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t(k)}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap' }}>{targets[k]}g</span>
              </span>
              <span style={{ fontSize: 13, lineHeight: '18px', opacity: 0.9 }}>{t(`ex_${k}` as const)}</span>
            </div>
          ))}
          <span className="caption" style={{ textAlign: 'center' }}>{t('tgLater')}</span>
        </div>
      )}

      {step === 6 && (() => {
        const [before, after] = t('homeStep1').split('{share}')
        const steps = where === 'android'
          ? [t('homeAndroid1'), t('homeAndroid2')]
          : [<>{before}<Icon name="share" size={17} className="inline-icon" />{after}</>, t('homeStep2'), t('homeStep3')]
        return (
          <div className="stack" style={{ gap: 16 }}>
            <img src="/pwa-192.png" alt="" width={72} height={72} style={{ width: 72, height: 72, borderRadius: 18 }} />
            <h1 className="title">{t('homeTitle')}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t('homeWhy')}</p>
            {where === 'android' && canPromptInstall() ? (
              <button className="btn green block" onClick={async () => { await promptInstall(); rerender((n) => n + 1) }}><Icon name="plus" size={18} />{t('install')}</button>
            ) : (
              <ol className="home-steps">
                {where === 'ios-safari' && <li className="done"><span>{t('homeInSafari')}</span></li>}
                {(where === 'ios-other' || where === 'in-app') && (
                  <li className="action">
                    <span className="grow stack" style={{ gap: 8 }}>
                      <span>{t(isIos() ? 'homeOpenSafariStep' : 'homeOpenChromeStep')}</span>
                      <a className="btn green small" style={{ alignSelf: 'flex-start', textDecoration: 'none' }} href={openInBrowserUrl()}><Icon name="compass" size={18} />{t(isIos() ? 'openSafari' : 'openChrome')}</a>
                    </span>
                  </li>
                )}
                {steps.map((s, i) => <li key={i}><span>{s}</span></li>)}
              </ol>
            )}
            <span className="caption">{t('homeAfter')}</span>
          </div>
        )
      })()}

      <div className="bottom-bar">
        <button className="btn primary block" disabled={!valid} onClick={() => (step === last ? finish() : setStep(step + 1))}>
          {step === 0 ? t('obStart') : step === last ? (step === 6 ? t('homeDone') : t('obGo')) : t('continue')}
        </button>
      </div>
    </main>
  )
}
