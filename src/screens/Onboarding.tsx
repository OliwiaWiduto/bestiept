import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Activity, Goal, Pace, Profile, Sex } from '../types'
import { calcTargets, lowestHealthy, maintenance, suggestedGoalWeight, weeksToGoal } from '../lib/nutrition'
import { formatWeight } from '../lib/units'
import { addDays, fmt, today } from '../lib/dates'
import { sampleRecipes } from '../lib/samples'
import { DEFAULT_STAPLES, DEFAULT_STAPLES_PL } from '../lib/shopping'
import { canPromptInstall, isInstalled, isIos, openInBrowserUrl, promptInstall, whereOpen } from '../lib/install'
import { Icon, NumberField, Stepper } from '../components/ui'
import { HeightField, UnitsToggle, WeightField } from '../components/BodyFields'

// Same colours as the bars on the Today screen
const MACRO_ROWS: ['protein' | 'carbs' | 'fat' | 'fibre', string][] = [
  ['protein', 'var(--cherry)'], ['carbs', 'var(--butter)'], ['fat', 'var(--olive)'], ['fibre', 'var(--lime)'],
]

export default function Onboarding() {
  const t = useT()
  const { lang, completeOnboarding } = useStore()
  const [step, setStep] = useState(0)
  const [where] = useState(() => (isInstalled() ? 'desktop' : whereOpen()))
  const showHome = where !== 'desktop'
  const last = showHome ? 8 : 7
  // The goal weight and pace step only applies to losing or gaining.
  const next = () => setStep(step === 3 && p.goal === 'maintain' ? 5 : step + 1)
  const prev = () => setStep(step === 5 && p.goal === 'maintain' ? 3 : step - 1)
  // Pantry staples: nothing picked to start with, so she has to choose (or say she keeps none of them).
  const [staples, setStaples] = useState<string[]>([])
  const [noStaples, setNoStaples] = useState(false)
  const stapleOptions = lang === 'pl' ? DEFAULT_STAPLES_PL : DEFAULT_STAPLES
  const [, rerender] = useState(0)
  const [p, setP] = useState<Profile>({ name: '', sex: 'female', age: 28, heightCm: 165, weightKg: 65, activity: 'light', goal: 'maintain', household: 1 })
  const auto = useMemo(() => calcTargets(p), [p])
  const targets = auto
  const units = useStore((s) => s.units)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v })
  // Goal weight: suggested when she reaches that step; losing can't go below a healthy weight for her height.
  const building = p.goal === 'build'
  // The suggestion is only a placeholder: she types her own goal.
  const goalKg = p.goalWeightKg ?? NaN
  const goalOk = p.goal === 'maintain' || (building ? p.strength !== undefined : Number.isFinite(goalKg) && (p.goal === 'lose' ? goalKg < p.weightKg && goalKg >= lowestHealthy(p) : goalKg > p.weightKg))
  const weeks = goalOk ? weeksToGoal({ ...p, goalWeightKg: goalKg }) : null

  const valid = [p.name.trim().length > 0, p.age >= 13 && p.age <= 100 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 300, true, true, goalOk, true, true, staples.length > 0 || noStaples, true][step]
  const finish = () => {
    completeOnboarding({ ...p, name: p.name.trim(), ...(p.goal === 'maintain' || building ? { goalWeightKg: undefined, pace: undefined } : { goalWeightKg: p.goalWeightKg, pace: p.pace ?? 'slower' }) }, sampleRecipes(lang), staples)
  }

  const option = (selected: boolean, label: string, onClick: () => void, sub?: string) => (
    <button key={label} className="meal-row" aria-pressed={selected} onClick={onClick}
      style={{ border: `2px solid ${selected ? 'var(--green)' : 'transparent'}`, minHeight: 60, fontWeight: 600, fontSize: 16, padding: '16px 18px' }}>
      <span className={`check ${selected ? 'on' : ''}`} style={{ borderRadius: 999 }}>{selected && <Icon name="check" size={16} sw={2.5} />}</span>
      {sub ? <span className="stack" style={{ gap: 2, textAlign: 'left' }}><span>{label}</span><span className="caption" style={{ fontWeight: 400 }}>{sub}</span></span> : label}
    </button>
  )

  return (
    <main className="screen no-nav" style={{ minHeight: '100dvh' }}>
      <div className="between">
        {step > 0 ? <button className="icon-btn" aria-label={t('back')} onClick={prev}><Icon name="back" /></button> : <span style={{ width: 44, height: 44 }} />}
        <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
          {Array.from({ length: last + 1 }, (_, i) => <span key={i} style={{ width: 20, height: 6, borderRadius: 999, background: i <= step ? 'var(--green)' : 'var(--line)' }} />)}
        </div>
        <span style={{ width: 44 }} />
      </div>

      {step === 0 && (
        <div className="stack" style={{ gap: 20 }}>
          <h1 className="title">{t('obName')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, marginTop: -8 }}>{t('obNameSub')}</p>
          <label className="field"><span className="sr-only">{t('obNamePh')}</span>
            <input className="input" autoFocus placeholder={t('obNamePh')} value={p.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valid && setStep(1)} />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ gap: 16 }}>
          <h1 className="title">{t('obAbout')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t('obAboutSub')}</p>
          <div className="stack"><span className="label">{t('units')}</span><UnitsToggle /></div>
          <div className="stack" style={{ gap: 6 }}><span className="label">{t('sex')}</span>
            <div className="chips" role="group" aria-label={t('sex')}>
              {(['female', 'male'] as Sex[]).map((s) => <button key={s} className="chip" aria-pressed={p.sex === s} onClick={() => set('sex', s)}>{t(s)}</button>)}
            </div>
            <span className="caption">{t('sexHint')}</span>
          </div>
          <NumberField label={t('age')} value={p.age} onChange={(v) => set('age', v)} />
          <HeightField cm={p.heightCm} onChange={(v) => set('heightCm', v)} />
          <WeightField kg={p.weightKg} onChange={(v) => set('weightKg', v)} />
          <span style={{ paddingBottom: 96 }} />
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('obActivity')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t('obActivitySub')}</p>
          {(['low', 'light', 'moderate', 'high'] as Activity[]).map((a) =>
            option(p.activity === a, t(({ low: 'actLow', light: 'actLight', moderate: 'actModerate', high: 'actHigh' } as const)[a]), () => set('activity', a)))}
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('obGoal')}</h1>
          {(['lose', 'maintain', 'gain', 'build'] as Goal[]).map((g) =>
            option(p.goal === g, t(({ lose: 'goalLose', maintain: 'goalMaintain', gain: 'goalGain', build: 'goalBuild' } as const)[g]), () => set('goal', g),
              t(({ lose: 'goalLoseSub', maintain: 'goalMaintainSub', gain: 'goalGainSub', build: 'goalBuildSub' } as const)[g])))}
          <span className="caption" style={{ paddingBottom: 96 }}>{t('obGoalNote')}</span>
        </div>
      )}

      {step === 4 && building && (
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('obStrength')}</h1>
          {option(p.strength === true, t('strengthYes'), () => set('strength', true))}
          {option(p.strength === false, t('strengthNo'), () => set('strength', false))}
          {p.strength !== undefined && (
            <div className="card" style={{ background: 'var(--green)', color: '#FFFCF6', border: 'none', padding: '18px 20px', marginTop: 4 }}>
              <span style={{ fontSize: 15, lineHeight: '22px' }}>{t(p.strength ? 'buildExpect' : 'buildExpectNoTraining')}</span>
            </div>
          )}
          <span className="caption" style={{ paddingBottom: 96 }}>{t('buildScale')}</span>
        </div>
      )}

      {step === 4 && !building && (
        <div className="stack" style={{ gap: 14 }}>
          <h1 className="title">{t(p.goal === 'lose' ? 'obGoalWeightLose' : 'obGoalWeightGain')}</h1>
          <WeightField label={t('goalWeight')} kg={goalKg} placeholderKg={suggestedGoalWeight(p)} onChange={(v) => set('goalWeightKg', Number.isFinite(v) && v > 0 ? v : undefined)} />
          {p.goal === 'lose' && goalKg < lowestHealthy(p) && <span className="caption" style={{ color: 'var(--cherry)' }}>{t('goalTooLow', { kg: formatWeight(lowestHealthy(p), units) })}</span>}
          <span className="stack" style={{ gap: 2, marginTop: 6 }}><span className="label">{t('howFast')}</span><span className="caption">{t('paceCoach')}</span></span>
          {(['slower', 'faster'] as Pace[]).map((pc) => {
            const w = weeksToGoal({ ...p, pace: pc, goalWeightKg: goalKg })
            const on = (p.pace ?? 'slower') === pc
            return (
              <button key={pc} className="meal-row" aria-pressed={on} onClick={() => set('pace', pc)}
                style={{ border: `2px solid ${on ? 'var(--green)' : 'transparent'}`, minHeight: 72, padding: '14px 18px', alignItems: 'center' }}>
                <span className={`check ${on ? 'on' : ''}`} style={{ borderRadius: 999 }}>{on && <Icon name="check" size={16} sw={2.5} />}</span>
                <span className="stack grow" style={{ gap: 2, textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{t(pc === 'slower' ? 'paceSlower' : 'paceFaster')}</span>
                  <span className="caption">{t(p.goal === 'lose' ? (pc === 'slower' ? 'paceSlowerLose' : 'paceFasterLose') : (pc === 'slower' ? 'paceSlowerGain' : 'paceFasterGain'))}</span>
                </span>
                {goalOk && w && <span style={{ flex: 'none', fontWeight: 700, color: 'var(--green)', textAlign: 'right' }}>{t('weeksN', { n: w })}</span>}
              </button>
            )
          })}
          {goalOk && weeks && (
            <div className="card" style={{ background: 'var(--green)', color: '#FFFCF6', border: 'none', padding: '18px 20px' }}>
              <span style={{ fontSize: 15, lineHeight: '22px' }}>{t('goalBy', { kg: formatWeight(goalKg, units), date: fmt(addDays(today(), weeks * 7), lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</span>
            </div>
          )}
          <span className="caption" style={{ paddingBottom: 96 }}>{t('goalEstimate')}</span>
        </div>
      )}

      {step === 5 && (() => {
        const uses = maintenance(p)
        const diff = targets.kcal - uses
        const floor = p.sex === 'male' ? 1500 : 1200
        const perWeek = ((Math.abs(diff) * 7) / 7700).toFixed(1).replace('.', lang === 'pl' ? ',' : '.')
        const sum = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, lineHeight: '22px' } as const
        return (
          <div className="stack" style={{ gap: 12 }}>
            <h1 className="title">{t('obTargets')}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t('tgIntro')}</p>
            <div className="card stack" style={{ gap: 14 }}>
              <div className="stack" style={{ gap: 2 }}>
                <span className="label">{t('calories')}</span>
                <span className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: '52px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--green)' }}>{targets.kcal}</span>
                  <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>{t('tgKcalDay')}</span>
                </span>
              </div>
              {(p.goal === 'lose' || p.goal === 'gain') && Math.abs(diff) >= 50 ? (
                <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div style={sum}><span className="muted">{t('tgBodyUses')}</span><span style={{ fontWeight: 600 }}>{uses}</span></div>
                  <div style={sum}><span className="muted">{p.goal === 'lose' ? t('tgLose', { kg: perWeek }) : t('tgGain')}</span><span style={{ fontWeight: 600 }}>{diff < 0 ? '−' : '+'} {Math.abs(diff)}</span></div>
                  <div style={{ ...sum, borderTop: '1px solid var(--line)', paddingTop: 8 }}><span style={{ fontWeight: 600 }}>{t('tgYours')}</span><span style={{ fontWeight: 700, color: 'var(--green)' }}>{targets.kcal}</span></div>
                  {p.goal === 'lose' && targets.kcal === floor && <span className="caption">{t('tgFloor', { n: floor })}</span>}
                </div>
              ) : (
                <span className="small muted" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>{t(p.goal === 'build' ? 'tgBuild' : p.goal === 'lose' ? 'tgFloor' : 'tgMaintain', { n: floor })}</span>
              )}
            </div>
            <div className="card stack" style={{ gap: 0, paddingTop: 16, paddingBottom: 6 }}>
              <span className="label" style={{ paddingBottom: 6 }}>{t('tgInside')}</span>
              {MACRO_ROWS.map(([k, color], i) => (
                <div key={k} className="row" style={{ gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 999, background: color, flex: 'none' }} />
                  <span className="stack grow" style={{ gap: 0, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{t(k)}</span>
                    <span className="caption">{t(`ex_${k}` as const)}</span>
                  </span>
                  <span style={{ flex: 'none', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{targets[k]}g</span>
                </div>
              ))}
            </div>
            <div className="tip"><Icon name="heart" size={22} /><span>{t('tgClose')}</span></div>
            <span className="caption" style={{ textAlign: 'center', paddingBottom: 96 }}>{t('tgLater')}</span>
          </div>
        )
      })()}

      {step === 6 && (
        <div className="stack" style={{ gap: 16 }}>
          <h1 className="title">{t('householdQ')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t('householdHint')}</p>
          <div className="card between" style={{ padding: '18px 20px' }}>
            <span className="label">{t('people')}</span>
            <Stepper value={p.household ?? 1} onChange={(n) => setP({ ...p, household: n })} min={1} label={t('people')} />
          </div>
          <span className="caption">{t('householdSolo')}</span>
        </div>
      )}

      {step === 7 && (
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="title">{t('staplesTitle')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t('obStaplesHint')}</p>
          <div className="chips" style={{ gap: 8 }}>
            {stapleOptions.map((s) => (
              <button key={s} className="chip" style={{ height: 44, fontSize: 15, background: staples.includes(s) ? undefined : 'var(--surface-raised)' }} aria-pressed={staples.includes(s)}
                onClick={() => { setNoStaples(false); setStaples(staples.includes(s) ? staples.filter((x) => x !== s) : [...staples, s]) }}>{s}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 16 }}>
            <button className="link-btn" onClick={() => setStaples(staples.length === stapleOptions.length ? [] : stapleOptions)}>{t(staples.length === stapleOptions.length ? 'clearAll' : 'selectAll')}</button>
            <button className="link-btn" aria-pressed={noStaples} onClick={() => { setStaples([]); setNoStaples(true) }}>{t('noneOfThese')}</button>
          </div>
          {noStaples && <span className="caption">{t('noStaplesNote')}</span>}
          <span className="caption" style={{ paddingBottom: 96 }}>{t('staplesLater')}</span>
        </div>
      )}

      {step === 8 && (() => {
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
        <button className="btn primary block" disabled={!valid} onClick={() => (step === last ? finish() : next())}>
          {step === last ? (step === 8 ? t('homeDone') : t('obGo')) : t('continue')}
        </button>
      </div>
    </main>
  )
}
