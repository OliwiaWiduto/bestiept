import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { buildList, CATEGORIES, CATEGORY_ICON, DEFAULT_STAPLES, DEFAULT_STAPLES_PL, displayAmount, staplesIn, type ShoppingLine } from '../lib/shopping'
import { uid } from '../lib/util'
import { Icon } from '../components/ui'
import { useFamilyLists } from '../lib/family'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Shopping() {
  const t = useT()
  const { plan, shopping, setShopping } = useStore()
  const recipes = useRecipes()
  const { planWeek, setPlanWeek } = useUI()
  const [newItem, setNewItem] = useState('')
  const days = weekDays(planWeek)
  const thisWeek = weekStart(today())
  const weekPlan = useMemo(() => plan.filter((p) => days.includes(p.date)), [plan, days])
  const family = useFamilyLists(planWeek)
  const [skip, setSkip] = useState<Record<string, boolean>>({})
  const allPlan = useMemo(() => [...weekPlan, ...family.flatMap((f) => (skip[f.person.id] ? [] : f.plan))], [weekPlan, family, skip])
  const { need, probably } = useMemo(() => buildList(allPlan, recipes, shopping, today()), [allPlan, recipes, shopping])
  const range = `${fmt(days[0], t.lang, { day: 'numeric' })} – ${fmt(days[6], t.lang, { day: 'numeric', month: 'long' })}`

  const tk = (key: string) => `${planWeek}:${key}`
  const isTicked = (key: string) => !!shopping.ticked[tk(key)]
  const toggle = (key: string) => {
    const on = !isTicked(key)
    setShopping({
      ticked: { ...shopping.ticked, [tk(key)]: on },
      lastBought: on ? { ...shopping.lastBought, [key]: today() } : shopping.lastBought,
      out: on ? shopping.out.filter((k) => k !== key) : shopping.out,
    })
  }
  const allKeys = [...need.map((l) => l.key), ...shopping.extras.map((e) => `extra:${e.id}`)]
  const done = allKeys.filter(isTicked).length

  const [staplePick, setStaplePick] = useState<string[]>(() => staplesIn(shopping.staples, t.lang))
  const stapleOptions = Array.from(new Set([...(t.lang === 'pl' ? DEFAULT_STAPLES_PL : DEFAULT_STAPLES), ...staplesIn(shopping.staples, t.lang)]))

  const row = (key: string, name: string, amount: string, caption: string, last: boolean) => {
    const on = isTicked(key)
    return (
      <button key={key} aria-pressed={on} onClick={() => toggle(key)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', background: 'transparent', border: 'none', borderBottom: last ? 'none' : '1px solid var(--line)', textAlign: 'left', width: '100%' }}>
        <span className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={16} sw={2.5} />}</span>
        <span className="grow stack" style={{ gap: 2 }}>
          <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600, color: on ? 'var(--ink-muted)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{cap(name)}</span>
          {caption && <span className="caption">{caption}</span>}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: on ? 'var(--ink-muted)' : 'var(--green)', whiteSpace: 'nowrap' }}>{amount}</span>
      </button>
    )
  }

  const section = (title: string, icon: string | undefined, lines: ShoppingLine[]) => (
    <section key={title} className="stack">
      <div className="between">
        <div className="row" style={{ gap: 8 }}>
          {icon && <img src={icon} alt="" width={32} height={32} style={{ width: 32, height: 32, margin: '-2px 0 -2px -2px' }} />}
          <h2 className="heading" style={{ fontSize: 18, lineHeight: '24px' }}>{title}</h2>
        </div>
        <span className="small muted">{t(lines.length === 1 ? 'itemN' : 'itemsN', { n: lines.length })}</span>
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {lines.map((l, i) => row(l.key, l.name, displayAmount(l), '', i === lines.length - 1))}
      </div>
    </section>
  )

  return (
    <main className="screen">
      <div className="between" style={{ paddingTop: 8, alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">{t('forWeek', { range })}</span>
          <h1 className="display">{t('shopping')}</h1>
        </div>
        <button className="icon-btn" style={{ marginBottom: 6 }} aria-label={planWeek === thisWeek ? t('nextWeek') : t('thisWeek')}
          onClick={() => setPlanWeek(planWeek === thisWeek ? addDays(thisWeek, 7) : thisWeek)}>
          <Icon name={planWeek === thisWeek ? 'forward' : 'back'} />
        </button>
      </div>
      {family.length > 0 && (
        <div className="chips" role="group" aria-label={t('includeFamily')}>
          {family.map((f) => (
            <button key={f.person.id} className="chip" aria-pressed={!skip[f.person.id]} onClick={() => setSkip({ ...skip, [f.person.id]: !skip[f.person.id] })}>
              {t('includeMeals', { name: f.person.name, n: f.plan.filter((p) => !p.leftoverOf).length })}
            </button>
          ))}
        </div>
      )}

      {!shopping.staplesAsked && need.length + probably.length > 0 && (
        <section className="card stack" style={{ gap: 12, background: 'var(--peach-soft)' }}>
          <h2 className="heading" style={{ fontSize: 18 }}>{t('staplesTitle')}</h2>
          <span className="small">{t('staplesHint')}</span>
          <div className="chips">
            {stapleOptions.map((s) => (
              <button key={s} className="chip" style={{ background: staplePick.includes(s) ? undefined : 'var(--surface-raised)' }} aria-pressed={staplePick.includes(s)}
                onClick={() => setStaplePick(staplePick.includes(s) ? staplePick.filter((x) => x !== s) : [...staplePick, s])}>{s}</button>
            ))}
          </div>
          <button className="btn green" onClick={() => setShopping({ staples: staplePick, staplesAsked: true })}>{t('save')}</button>
        </section>
      )}

      {allKeys.length > 0 && (
        <section className="card stack" style={{ gap: 8, padding: '16px 20px' }}>
          <div className="between label"><span>{t('inBasket', { a: done, b: allKeys.length })}</span><span className="muted" style={{ fontWeight: 400 }}>{t('toGo', { n: allKeys.length - done })}</span></div>
          <div className="track" style={{ height: 10 }}><span style={{ width: `${(done / allKeys.length) * 100}%`, background: 'var(--green)' }} /></div>
        </section>
      )}

      <form className="row input" style={{ borderRadius: 999, gap: 10 }} onSubmit={(e) => {
        e.preventDefault()
        if (!newItem.trim()) return
        setShopping({ extras: [...shopping.extras, { id: uid(), name: newItem.trim(), amount: '' }] })
        setNewItem('')
      }}>
        <Icon name="plus" size={20} />
        <label className="grow"><span className="sr-only">{t('addOwn')}</span>
          <input placeholder={t('addOwn')} value={newItem} onChange={(e) => setNewItem(e.target.value)} style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }} />
        </label>
      </form>

      {need.length === 0 && shopping.extras.length === 0 && probably.length === 0 && (
        <div className="empty"><img src="/icons/cat-extras.png" alt="" /><p style={{ margin: 0 }}>{t('emptyList')}</p></div>
      )}

      {CATEGORIES.map((c) => {
        const lines = need.filter((l) => l.category === c)
        return lines.length ? section(t(`cat_${c}` as const), CATEGORY_ICON[c], lines) : null
      })}

      {shopping.extras.length > 0 && (
        <section className="stack">
          <div className="row" style={{ gap: 8 }}>
            <img src="/icons/cat-extras.png" alt="" width={32} height={32} style={{ width: 32, height: 32, margin: '-2px 0 -2px -2px' }} />
            <h2 className="heading" style={{ fontSize: 18 }}>{t('yourExtras')}</h2>
          </div>
          <div className="card" style={{ padding: '4px 16px' }}>
            {shopping.extras.map((e, i) => row(`extra:${e.id}`, e.name, e.amount, t('addedByYou'), i === shopping.extras.length - 1))}
          </div>
        </section>
      )}

      {probably.length > 0 && (
        <section className="stack">
          <h2 className="heading" style={{ fontSize: 18 }}>{t('probably')}</h2>
          <div className="stack" style={{ background: 'var(--stone-soft)', borderRadius: 28, padding: 16, gap: 6 }}>
            <span className="small" style={{ fontSize: 14, lineHeight: '20px' }}>{t('probablyHint')}</span>
            {probably.map((l, i) => (
              <div key={l.key} className="between" style={{ padding: '8px 0', borderBottom: i === probably.length - 1 ? 'none' : '1px solid #DDD0C6' }}>
                <span className="stack" style={{ gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-muted)' }}>{cap(l.name)}</span>
                  <span className="caption">{[displayAmount(l), t(l.reason === 'staple' ? 'reasonStaple' : l.reason === 'small' ? 'reasonSmall' : 'reasonRecent')].filter(Boolean).join(' · ')}</span>
                </span>
                <button className="chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }} onClick={() => setShopping({ out: [...shopping.out, l.key] })}>{t('imOut')}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {shopping.extras.some((e) => isTicked(`extra:${e.id}`)) && (
        <button className="btn ghost" style={{ alignSelf: 'center' }} onClick={() => setShopping({ extras: shopping.extras.filter((e) => !isTicked(`extra:${e.id}`)) })}>{t('clearTicked')}</button>
      )}
    </main>
  )
}
