import { useState } from 'react'
import { syncAvatar } from '../lib/family'
import { useStore } from '../store'
import { useT, type TKey } from '../i18n'
import { staplesIn } from '../lib/shopping'
import InstallNudge from '../components/InstallNudge'
import type { Activity, Goal, Macros, Pace, Profile, Sex } from '../types'
import { maintenance, suggestedGoalWeight, weeksToGoal } from '../lib/nutrition'
import { formatWeight } from '../lib/units'
import { addDays, fmt, today } from '../lib/dates'
import { AVATARS, Avatar, BackButton, Icon, NumberField, toast } from '../components/ui'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOutEverywhere } from '../lib/sync'
import { HeightField, UnitsToggle, WeightField } from '../components/BodyFields'

export default function Settings() {
  const t = useT()
  const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const nav = useNavigate()
  const loc = useLocation()
  const [generalOpen, setGeneralOpen] = useState(false)
  const { lang, setLang, profile, targets, updateProfile, setTargets, shopping, setShopping, resetAll } = useStore()
  const [p, setP] = useState<Profile | null>(profile)
  const [tg, setTg] = useState<Macros | null>(targets)
  const [staples, setStaples] = useState(staplesIn(shopping.staples, t.lang).join('\n'))
  const [email, setEmail] = useState('')
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')) }, [])
  if (!p || !tg || !profile || !targets) return null

  // Each section shows its own action in a bar at the bottom, only once something in it has changed.
  const savedStaples = staplesIn(shopping.staples, t.lang).join('\n')
  const detailsDirty = JSON.stringify(p) !== JSON.stringify(profile)
  const targetsDirty = JSON.stringify(tg) !== JSON.stringify(targets)
  const staplesDirty = staples.trim() !== savedStaples.trim()
  const dirty = detailsDirty || targetsDirty || staplesDirty
  const discard = () => { setP(profile); setTg(targets); setStaples(savedStaples) }
  const saveAll = (recalc: boolean) => {
    if (staplesDirty) setShopping({ staples: staples.split('\n').map((s) => s.trim()).filter(Boolean), staplesAsked: true })
    if (targetsDirty && !recalc) setTargets(tg)
    if (detailsDirty) updateProfile(p, recalc)
    const st = useStore.getState()
    setP(st.profile); setTg(st.targets); setStaples(staplesIn(st.shopping.staples, t.lang).join('\n'))
    toast(t('saved'))
  }

  const units = useStore((st) => st.units)
  const select = <T extends string>(label: string, value: T, options: [T, string][], on: (v: T) => void) => (
    <label className="field"><span>{label}</span>
      <select className="input" value={value} onChange={(e) => on(e.target.value as T)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  )

  const saveBar = (
    <>
      {dirty && (
        <div className="bottom-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom))', paddingBottom: 16, zIndex: 31, borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 24px rgba(27, 33, 28, .1)' }}>
          {detailsDirty && <span className="small muted" style={{ textAlign: 'center' }}>{t('detailsChangedHint')}</span>}
          {detailsDirty && <button className="btn primary block" onClick={() => saveAll(true)}>{t('saveUpdateTargets')}</button>}
          <div className="row" style={{ gap: 10 }}>
            <button className="btn ghost grow" onClick={discard}>{t('discard')}</button>
            <button className={`btn grow ${detailsDirty ? 'secondary' : 'primary'}`} onClick={() => saveAll(false)}>{detailsDirty ? t('saveOnly') : t('saveChanges')}</button>
          </div>
        </div>
      )}
    </>
  )
  const goalsPage = loc.pathname === '/settings/goals'
  const goalLabel = t(({ lose: 'goalLose', maintain: 'goalMaintain', gain: 'goalGain', build: 'goalBuild' } as const)[profile.goal])
  const goalSummary = [goalLabel, (profile.goal === 'lose' || profile.goal === 'gain') ? t(profile.pace === 'faster' ? 'paceFaster' : 'paceSlower') : null, `${targets.kcal} ${t('kcal')}`].filter(Boolean).join(' · ')

  if (goalsPage) return (
    <main className="screen" style={dirty ? { paddingBottom: 'calc(var(--nav-h) + 260px + env(safe-area-inset-bottom))' } : undefined}>
      <div className="row"><BackButton to="/settings" /></div>
      <h1 className="display">{t('goalsTargets')}</h1>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('yourDetails')}</h2>
        <span className="small muted">{t('detailsWhy')}</span>
        {select<Sex>(t('sex'), p.sex, [['female', t('female')], ['male', t('male')]], (v) => setP({ ...p, sex: v }))}
        <NumberField label={t('age')} value={p.age} onChange={(v) => setP({ ...p, age: v })} />
        <div className="stack"><span className="label">{t('units')}</span><UnitsToggle /></div>
        <HeightField cm={p.heightCm} onChange={(v) => setP({ ...p, heightCm: v })} />
        <WeightField kg={p.weightKg} onChange={(v) => setP({ ...p, weightKg: v })} />
        {select<Activity>(t('obActivity'), p.activity, [['low', t('actLow')], ['light', t('actLight')], ['moderate', t('actModerate')], ['high', t('actHigh')]], (v) => setP({ ...p, activity: v }))}
        {select<Goal>(t('obGoal'), p.goal, [['lose', t('goalLose')], ['maintain', t('goalMaintain')], ['gain', t('goalGain')], ['build', t('goalBuild')]], (v) => setP({ ...p, goal: v }))}
        {p.goal === 'build' && (
          <>
            {select<'yes' | 'no'>(t('obStrength'), p.strength === false ? 'no' : 'yes', [['yes', t('strengthYes')], ['no', t('strengthNo')]], (v) => setP({ ...p, strength: v === 'yes' }))}
            <span className="caption">{t(p.strength === false ? 'buildExpectNoTraining' : 'buildExpect')}</span>
          </>
        )}
        {(p.goal === 'lose' || p.goal === 'gain') && (
          <>
            <WeightField label={t('goalWeight')} kg={p.goalWeightKg ?? NaN} placeholderKg={suggestedGoalWeight(p)} onChange={(v) => setP({ ...p, goalWeightKg: Number.isFinite(v) && v > 0 ? v : undefined })} />
            {select<Pace>(t('howFast'), p.pace ?? 'slower', [['slower', t('paceSlower')], ['faster', t('paceFaster')]], (v) => setP({ ...p, pace: v }))}
            {(() => { const w = weeksToGoal(p); return w && p.goalWeightKg ? <span className="caption">{t('goalBy', { kg: formatWeight(p.goalWeightKg, units), date: fmt(addDays(today(), w * 7), t.lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</span> : null })()}
          </>
        )}
        <div className="stack" style={{ gap: 4 }}>
          <div className="between"><span className="label">{t('maintenanceKcal')}</span><span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{Number.isFinite(p.weightKg) && Number.isFinite(p.heightCm) && Number.isFinite(p.age) ? maintenance(p) : '—'} {t('kcal')}</span></div>
          <span className="caption">{t('maintenanceHint')}</span>
        </div>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('dailyTargets')}</h2>
        {(['kcal', 'protein', 'carbs', 'fat', 'fibre'] as (keyof Macros)[]).map((k) => (
          <label key={k} className="between">
            <span className="label">{k === 'kcal' ? t('calories') : t(k)}</span>
            <span className="grams"><input type="text" inputMode="numeric" style={{ width: 64 }} value={tg[k]} onChange={(e) => setTg({ ...tg, [k]: Number(e.target.value) || 0 })} /><span className="muted">{k === 'kcal' ? '' : 'g'}</span></span>
          </label>
        ))}
      </section>
{saveBar}
    </main>
  )

  return (
    <main className="screen" style={dirty ? { paddingBottom: 'calc(var(--nav-h) + 260px + env(safe-area-inset-bottom))' } : undefined}>
      <div className="row"><BackButton to="/" /></div>
      <h1 className="display">{t('settings')}</h1>

      <section className="card stack" style={{ gap: generalOpen ? 16 : 0 }}>
        <button className="between" aria-expanded={generalOpen} onClick={() => setGeneralOpen(!generalOpen)} style={{ border: 'none', background: 'none', padding: 0, width: '100%', textAlign: 'left' }}>
          <span className="row" style={{ gap: 12, minWidth: 0 }}>
            <Avatar name={profile.name} avatar={profile.avatar} size={44} />
            <span className="stack" style={{ gap: 0, minWidth: 0 }}><h2 className="heading">{t('general')}</h2><span className="caption">{profile.name} · {lang === 'pl' ? t('polish') : t('english')}</span></span>
          </span>
          <span style={{ transform: generalOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'flex' }}><Icon name="forward" /></span>
        </button>
        {generalOpen && (
          <>
            <label className="field"><span>{t('obNamePh')}</span><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })}
              onBlur={() => { const name = p.name.trim(); if (name && name !== profile.name) { updateProfile({ ...profile, name }, false); setP({ ...p, name }) } }} /></label>
            <span className="label">{t('yourPicture')}</span>
        <div className="row" style={{ gap: 12 }} role="radiogroup" aria-label={t('yourPicture')}>
          {AVATARS.map((a) => {
            const on = profile.avatar === a.id
            return (
              <button key={a.id} role="radio" aria-checked={on} aria-label={t(`av_${a.id}` as TKey)} onClick={() => { updateProfile({ ...profile, avatar: a.id }, false); setP({ ...p, avatar: a.id }); syncAvatar(a.id) }}
                style={{ padding: 3, border: `3px solid ${on ? 'var(--cherry)' : 'transparent'}`, borderRadius: 999, background: 'none' }}>
                <Avatar name={p.name} avatar={a.id} size={56} />
              </button>
            )
          })}
        </div>
            <span className="label">{t('language')}</span>
        <div className="chips" role="group" aria-label={t('language')}>
          <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>{t('english')}</button>
          <button className="chip" aria-pressed={lang === 'pl'} onClick={() => setLang('pl')}>{t('polish')}</button>
        </div>
          </>
        )}
      </section>

      <button className="card stack" style={{ gap: 4, border: 'none', textAlign: 'left' }} onClick={() => nav('/settings/goals')}>
        <span className="between"><h2 className="heading">{t('goalsTargets')}</h2><Icon name="forward" /></span>
        <span className="small muted">{goalSummary}</span>
      </button>

      <section className="card stack" style={{ gap: 4 }}>
        <button className="switch-row" role="switch" aria-checked={!profile.nudges?.off} onClick={() => useStore.getState().setNudges({ off: !profile.nudges?.off })}>
          <span className="grow stack" style={{ gap: 2 }}><span className="heading" style={{ fontSize: 17 }}>{t('hcTipsSetting')}</span><span className="small muted">{t('hcTipsSettingSub')}</span></span>
          <span className="switch" aria-hidden><span /></span>
        </button>
      </section>

      <button className="card stack" style={{ gap: 8, border: 'none', textAlign: 'left' }} onClick={() => nav('/family')}>
        <span className="between"><h2 className="heading">{t('family')}</h2><Icon name="forward" /></span>
        <span className="small muted">{t('familySummary')}</span>
      </button>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('staples')}</h2>
        <span className="small muted">{t('staplesSettingsHint')}</span>
        <textarea className="input" rows={6} value={staples} onChange={(e) => setStaples(e.target.value)} />
      </section>

      {!installed && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 className="heading">{t('addToHome')}</h2>
          <InstallNudge inline />
        </section>
      )}

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('account')}</h2>
        {email && <span className="small muted">{t('signedInAs', { email })}</span>}
        <button className="btn secondary" onClick={() => signOutEverywhere()}>{t('signOut')}</button>
      </section>

      <button className="btn ghost" style={{ color: 'var(--cherry)', alignSelf: 'center', border: 'none' }} onClick={() => { if (confirm(t('resetConfirm'))) resetAll() }}>
        <Icon name="trash" size={18} />{t('resetData')}
      </button>

{saveBar}
    </main>
  )
}
