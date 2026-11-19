import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { useRecipes } from '../lib/recipeLang'
import { useUI } from '../ui-state'
import { useT } from '../i18n'
import { addDays, fmt, today, weekDays, weekStart } from '../lib/dates'
import { buildList, categorise, CATEGORIES, CATEGORY_ICON, DEFAULT_STAPLES, DEFAULT_STAPLES_PL, displayAmount, staplesIn, type ShoppingLine } from '../lib/shopping'
import { formatAmount, parseIngredient, uid } from '../lib/util'
import { Icon, Sheet, toast } from '../components/ui'
import { LineEditor } from '../components/LineEditor'
import { useFamilyLists } from '../lib/family'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lineText = (amount: string, name: string) => [amount, cap(name)].filter(Boolean).join(' ')

/** A small chip that flies from the ticked row into the basket button. */
function flyToBasket(from: HTMLElement, label: string) {
  const basket = document.getElementById('basket-btn')
  if (!basket || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = from.getBoundingClientRect()
  const b = basket.getBoundingClientRect()
  const chip = document.createElement('div')
  chip.className = 'fly-chip'
  chip.textContent = label
  chip.style.left = `${a.left + 12}px`
  chip.style.top = `${a.top + a.height / 2 - 16}px`
  document.body.appendChild(chip)
  const dx = b.left + b.width / 2 - (a.left + 12) - 20
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  chip.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.6}px, ${dy * 0.35 - 60}px) scale(.8)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0.2 },
  ], { duration: 650, easing: 'cubic-bezier(.5,0,.6,1)' }).onfinish = () => {
    chip.remove()
    basket.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' })
  }
}

export default function Shopping() {
  const t = useT()
  const { plan, shopping, setShopping } = useStore()
  const recipes = useRecipes()
  const { planWeek, setPlanWeek } = useUI()
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
  // Planned items she deleted from the list text this week
  const hidden = new Set((shopping.hidden ?? []).filter((h) => h.startsWith(planWeek + ':')).map((h) => h.slice(planWeek.length + 1)))
  const visible = need.filter((l) => !hidden.has(l.key))
  type Item = { key: string; name: string; amount: string; category: ShoppingLine['category'] }
  const items: Item[] = [
    ...visible.map((l) => ({ key: l.key, name: l.name, amount: displayAmount(l), category: l.category })),
    ...shopping.extras.map((e) => ({ key: `extra:${e.id}`, name: e.name, amount: e.amount, category: categorise(e.name) })),
  ]
  const allKeys = items.map((i) => i.key)
  const done = allKeys.filter(isTicked).length
  const inBasket = items.filter((i) => isTicked(i.key))
  const shoppingNow = !!shopping.shoppingMode
  const bought = new Set(inBasket.map((i) => lineText(i.amount, i.name).toLowerCase()))

  // The list as text, one item per line. Edits are saved when she leaves the box or starts shopping.
  const asText = () => items.map((i) => lineText(i.amount, i.name)).join('\n')
  const [text, setText] = useState(asText)
  const editing = useRef(false)
  const listKey = items.map((i) => i.key + i.amount).join('|')
  useEffect(() => { if (!editing.current) setText(asText()) }, [listKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    editing.current = false
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const wanted = new Map(lines.map((l) => [l.toLowerCase(), l]))
    const planned = new Map(need.map((l) => [lineText(displayAmount(l), l.name).toLowerCase(), l.key]))
    const nextHidden = new Set(shopping.hidden ?? [])
    for (const [txt, key] of planned) {
      if (wanted.has(txt)) { nextHidden.delete(`${planWeek}:${key}`); wanted.delete(txt) } else nextHidden.add(`${planWeek}:${key}`)
    }
    const keep = shopping.extras.filter((e) => { const k = lineText(e.amount, e.name).toLowerCase(); if (wanted.has(k)) { wanted.delete(k); return true } return false })
    const added = [...wanted.values()].map((l) => {
      const ing = parseIngredient(l)
      const amount = ing.amount === null ? '' : [formatAmount(ing.amount), ing.unit].filter(Boolean).join(['g', 'kg', 'ml', 'l'].includes(ing.unit) ? '' : ' ')
      return { id: uid(), name: ing.name || l, amount }
    })
    setShopping({ hidden: [...nextHidden], extras: [...keep, ...added] })
  }
  const basketOpen = useUI((u) => u.basketOpen)
  const setBasketOpen = useUI((u) => u.setBasketOpen)
  const setBasketCount = useUI((u) => u.setBasketCount)
  useEffect(() => { setBasketCount(done) }, [done, setBasketCount])

  const [staplePick, setStaplePick] = useState<string[]>(() => staplesIn(shopping.staples, t.lang))
  const stapleOptions = Array.from(new Set([...(t.lang === 'pl' ? DEFAULT_STAPLES_PL : DEFAULT_STAPLES), ...staplesIn(shopping.staples, t.lang)]))

  const row = (key: string, name: string, amount: string, caption: string, last: boolean) => {
    const on = isTicked(key)
    return (
      <button key={key} aria-pressed={on} onClick={(e) => { if (!on) flyToBasket(e.currentTarget, cap(name)); toggle(key) }}
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

  const section = (title: string, icon: string | undefined, lines: Item[]) => (
    <section key={title} className="stack">
      <div className="between">
        <div className="row" style={{ gap: 8 }}>
          {icon && <img src={icon} alt="" width={32} height={32} style={{ width: 32, height: 32, margin: '-2px 0 -2px -2px' }} />}
          <h2 className="heading" style={{ fontSize: 18, lineHeight: '24px' }}>{title}</h2>
        </div>
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {lines.map((l, i) => row(l.key, l.name, l.amount, '', i === lines.length - 1))}
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
      {!shoppingNow && (
        <button className="btn primary block" disabled={text.trim() === ''} onClick={() => { commit(); setShopping({ shoppingMode: true }); window.scrollTo(0, 0) }}>
          <Icon name="bag" size={20} />{t('startShopping')}
        </button>
      )}
      {family.length > 0 && (
        <div className="chips" role="group" aria-label={t('includeFamily')}>
          {family.map((f) => (
            <button key={f.person.id} className="chip" aria-pressed={!skip[f.person.id]} onClick={() => setSkip({ ...skip, [f.person.id]: !skip[f.person.id] })}>
              {t('includeMeals', { name: f.person.name, n: f.plan.filter((p) => !p.leftoverOf).length })}
            </button>
          ))}
        </div>
      )}

      {!shoppingNow && !shopping.staplesAsked && need.length + probably.length > 0 && (
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

      {!shoppingNow && (
        <section className="stack" style={{ gap: 8 }}>
          <span className="small muted">{t('listHint')}</span>
          <LineEditor value={text} onChange={setText} onFocus={() => { editing.current = true }} onDone={commit}
            struck={(l) => bought.has(l)} placeholder={t('listPh')} label={t('shopping')} />
          {inBasket.length > 0 && <span className="caption">{t('boughtHint', { n: inBasket.length })}</span>}
        </section>
      )}


      {shoppingNow && allKeys.length > 0 && done === allKeys.length && (
        <div className="empty"><img src="/icons/cat-fruitveg.png" alt="" /><p style={{ margin: 0 }}>{t('allInBasket')}</p></div>
      )}

      {items.length === 0 && probably.length === 0 && !shoppingNow && text.trim() === '' && (
        <div className="empty"><img src="/icons/cat-extras.png" alt="" /><p style={{ margin: 0 }}>{t('emptyList')}</p></div>
      )}

      {shoppingNow && CATEGORIES.map((c) => {
        const lines = items.filter((l) => l.category === c && !isTicked(l.key))
        return lines.length ? section(t(`cat_${c}` as const), CATEGORY_ICON[c], lines) : null
      })}

      {!shoppingNow && probably.length > 0 && (
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

      {shoppingNow && (
        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          <button className="btn ghost small" style={{ border: 'none' }} onClick={() => setShopping({ shoppingMode: false })}><Icon name="edit" size={16} />{t('editList')}</button>
          <button className="btn secondary small" onClick={() => { setShopping({ shoppingMode: false }); toast(t('shopDone')) }}>{t('finishShopping')}</button>
        </div>
      )}
      <Sheet open={basketOpen} onClose={() => setBasketOpen(false)} title={t('basketTitle')}>
        {inBasket.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('basketEmpty')}</p> : (
          <>
            <span className="small muted">{t('basketHint')}</span>
            <div className="card" style={{ padding: '4px 16px' }}>
              {inBasket.map((l, i) => row(l.key, l.name, l.amount, '', i === inBasket.length - 1))}
            </div>
          </>
        )}
      </Sheet>
    </main>
  )
}
