import { useStore } from '../store'
import { useT } from '../i18n'
import { cmToFtIn, ftInToCm, kgToStLb, stLbToKg, type Units } from '../lib/units'

function Num({ label, value, onChange, suffix, step = 1 }: { label: string; value: number; onChange: (n: number) => void; suffix: string; step?: number }) {
  return (
    <label className="grams" style={{ height: 52, flex: 1, minWidth: 0, borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)' }}>
      <span className="sr-only">{label}</span>
      <input type="text" inputMode="decimal" step={step} value={Number.isFinite(value) ? value : ''} style={{ flex: 1, minWidth: 0, width: 'auto', textAlign: 'left', fontSize: 16 }}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
      <span className="muted">{suffix}</span>
    </label>
  )
}

export function UnitsToggle() {
  const t = useT()
  const { units, setUnits } = useStore()
  return (
    <div className="chips" role="group" aria-label={t('units')}>
      {(['metric', 'imperial'] as Units[]).map((u) => <button key={u} className="chip" aria-pressed={units === u} onClick={() => setUnits(u)}>{t(u === 'metric' ? 'metric' : 'imperial')}</button>)}
    </div>
  )
}

/** Height in cm or ft/in; always stored in cm. */
export function HeightField({ cm, onChange }: { cm: number; onChange: (cm: number) => void }) {
  const t = useT()
  const units = useStore((s) => s.units)
  const { ft, inch } = cmToFtIn(Number.isFinite(cm) ? cm : 0)
  return (
    <div className="field"><span>{t('height')}</span>
      {units === 'metric'
        ? <div className="row"><Num label={t('height')} value={cm} onChange={onChange} suffix="cm" /></div>
        : <div className="row" style={{ gap: 10 }}>
            <Num label={`${t('height')} ft`} value={ft} onChange={(v) => onChange(ftInToCm(v || 0, inch))} suffix="ft" />
            <Num label={`${t('height')} in`} value={inch} onChange={(v) => onChange(ftInToCm(ft, v || 0))} suffix="in" />
          </div>}
    </div>
  )
}

/** Weight in kg or st/lb; always stored in kg. */
export function WeightField({ kg, onChange, big }: { kg: number; onChange: (kg: number) => void; big?: boolean }) {
  const t = useT()
  const units = useStore((s) => s.units)
  const { st, lb } = kgToStLb(Number.isFinite(kg) ? kg : 0)
  const style = big ? { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--green)' } : undefined
  return (
    <div className="field"><span>{t('weight')}</span>
      <div style={style}>
        {units === 'metric'
          ? <div className="row"><Num label={t('weight')} value={kg} step={0.1} onChange={onChange} suffix="kg" /></div>
          : <div className="row" style={{ gap: 10 }}>
              <Num label={`${t('weight')} st`} value={st} onChange={(v) => onChange(stLbToKg(v || 0, lb))} suffix="st" />
              <Num label={`${t('weight')} lb`} value={lb} onChange={(v) => onChange(stLbToKg(st, v || 0))} suffix="lb" />
            </div>}
      </div>
    </div>
  )
}
