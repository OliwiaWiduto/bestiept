import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { localise, useRecipes } from '../lib/recipeLang'
import { useUI } from '../ui-state'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { fmt, today, weekDays, weekStart } from '../lib/dates'
import { plBasic } from '../lib/plNames'
import { buildList, categorise, CATEGORIES, CATEGORY_ICON, displayAmount, type ShoppingLine } from '../lib/shopping'
import { formatAmount, parseIngredient, uid } from '../lib/util'
import { Icon, Sheet, Thumb, toast } from '../components/ui'
import { LineEditor } from '../components/LineEditor'
import { useFamilyLists } from '../lib/family'
import { translateRecipe } from '../lib/ai'
import { dictTranslate } from '../lib/groceryDict'
import type { ShoppingExtra } from '../types'
import { MEALS } from '../types'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lineText = (amount: string, name: string) => [amount, cap(name)].filter(Boolean).join(' ')
// "7 onion" → "7 onions"; Polish counts would need the right plural, so "7 × cebula" reads cleanly instead.
const plural = (n: string) => n.replace(/(\w+)$/, (w) => /s$/i.test(w) ? w : /(o|ch|sh|x)$/i.test(w) && !/(avocado|mango)$/i.test(w) ? w + 'es' : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : w + 's')
const plannedText = (amount: string, name: string, lang: string) => {
  if (!/^\d+([.,]\d+)?$/.test(amount) || Number(amount.replace(',', '.')) <= 1) return lineText(amount, name)
  return lang === 'pl' ? `${amount} × ${plBasic(name)}` : lineText(amount, plural(name))
}

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
  const nav = useNavigate()
  const { plan, shopping, setShopping } = useStore()
  const recipes = useRecipes()
  // The recipes as saved and in both languages: a household list's ticks match whichever language each of us reads it in.
  const rawRecipes = useStore((s) => s.recipes)
  const keyFrom = useMemo(() => ({ raw: rawRecipes, alts: (['en', 'pl'] as const).map((l) => rawRecipes.map((r) => localise(r, l))) }), [rawRecipes])
  const planWeek = weekStart(today())
  const days = weekDays(planWeek)
  const weekPlan = useMemo(() => plan.filter((p) => days.includes(p.date)), [plan, days])
  const family = useFamilyLists(planWeek)
  const [skip, setSkip] = useState<Record<string, boolean>>({})
  const allPlan = useMemo(() => [...weekPlan, ...family.flatMap((f) => (skip[f.person.id] ? [] : f.plan))], [weekPlan, family, skip])
  // Shopping for just a few of the week's meals?
  const cookable = allPlan.filter((p) => !p.leftoverOf && recipes.some((r) => r.id === p.recipeId)).sort((a, b) => a.date.localeCompare(b.date) || MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal))
  const chosen = (shopping.onlyFor ?? []).filter((id) => cookable.some((p) => p.id === id))
  // Things typed onto the list show in the reader's language ("milk" typed in English reads "Mleko" in Polish).
  const exName = (e: ShoppingExtra) => e.tr?.[t.lang] ?? e.name
  useTranslatedExtras(shopping.extras, t.lang, setShopping)
  // 'extras' in the choice = the things she typed in herself
  const extrasPicked = !!shopping.onlyFor?.includes('extras')
  const someMeals = !!shopping.onlyFor && (chosen.length > 0 || extrasPicked)
  const showExtras = !someMeals || extrasPicked
  const pickedIds = [...chosen, ...(extrasPicked ? ['extras'] : [])]
  const [choosing, setChoosing] = useState(false)
  const listPlan = useMemo(() => (someMeals ? allPlan.filter((p) => chosen.includes(p.id)) : allPlan), [allPlan, someMeals, chosen.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const { need, probably } = useMemo(() => buildList(listPlan, recipes, shopping, today(), keyFrom), [listPlan, recipes, shopping, keyFrom])

  const tk = (key: string) => `${planWeek}:${key}`
  const altsOf = useMemo(() => new Map([...need, ...probably].map((l) => [l.key, l.alts ?? []])), [need, probably])
  // Ticked under its key, or (ticked before keys matched across languages) under the same line's key in either language.
  const isTicked = (key: string) => shopping.ticked[tk(key)] ?? (altsOf.get(key) ?? []).some((a) => shopping.ticked[tk(a)])
  // A shopping trip: starting shopping, or the first tick in 3 hours. Kept so reminders come when she usually shops.
  const noteTrip = () => {
    const p = useStore.getState().profile
    const times = p?.shopTimes ?? []
    if (p && !(times.length && Date.now() - times[times.length - 1] < 3 * 3600_000)) useStore.getState().updateProfile({ ...p, shopTimes: [...times, Date.now()].slice(-12) }, false)
  }
  const toggle = (key: string) => {
    const on = !isTicked(key)
    if (on) noteTrip()
    const ticked = { ...shopping.ticked, [tk(key)]: on }
    for (const a of altsOf.get(key) ?? []) delete ticked[tk(a)]
    setShopping({
      ticked,
      lastBought: on ? { ...shopping.lastBought, [key]: today() } : shopping.lastBought,
      out: on ? shopping.out.filter((k) => k !== key) : shopping.out,
    })
  }
  // Planned items she deleted from the list text this week
  const hidden = new Set((shopping.hidden ?? []).filter((h) => h.startsWith(planWeek + ':')).map((h) => h.slice(planWeek.length + 1)))
  const visible = need.filter((l) => !hidden.has(l.key))
  type Item = { key: string; name: string; amount: string; category: ShoppingLine['category']; text: string }
  const items: Item[] = [
    // Her own things first, newest at the top, where she types them.
    ...(showExtras ? shopping.extras : []).map((e) => ({ key: `extra:${e.id}`, name: exName(e), amount: e.amount, category: categorise(e.tr?.en ?? e.name), text: lineText(e.amount, exName(e)) })),
    ...visible.map((l) => ({ key: l.key, name: l.name, amount: displayAmount(l, t.lang), category: l.category, text: plannedText(displayAmount(l, t.lang), l.name, t.lang) })),
  ]
  const allKeys = items.map((i) => i.key)
  const done = allKeys.filter(isTicked).length
  const inBasket = items.filter((i) => isTicked(i.key))
  // Which line to show above the list: no plan, nothing bought, some bought, or everything from the plan bought.
  const fromPlan = items.filter((i) => !i.key.startsWith('extra:'))
  const hint = allPlan.length === 0 ? 'listHintNoPlan'
    : fromPlan.length > 0 && fromPlan.every((i) => isTicked(i.key)) ? 'listHintAllBought'
    : inBasket.length > 0 ? 'listHintSomeBought' : 'listHint'
  const shoppingNow = !!shopping.shoppingMode
  const bought = new Set(inBasket.map((i) => i.text.toLowerCase()))

  // The list as text, one item per line. Edits are saved when she leaves the box or starts shopping.
  const asText = () => items.map((i) => i.text).join('\n')
  const [text, setText] = useState(asText)
  const editing = useRef(false)
  const listKey = items.map((i) => i.key + i.amount + i.name).join('|')
  useEffect(() => { if (!editing.current) setText(asText()) }, [listKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (v = text) => {
    editing.current = false
    const lines = v.split('\n').map((l) => l.trim()).filter(Boolean)
    const wanted = new Map(lines.map((l) => [l.toLowerCase(), l]))
    const planned = new Map(need.map((l) => [plannedText(displayAmount(l, t.lang), l.name, t.lang).toLowerCase(), l.key]))
    const nextHidden = new Set(shopping.hidden ?? [])
    for (const [txt, key] of planned) {
      if (wanted.has(txt)) { nextHidden.delete(`${planWeek}:${key}`); wanted.delete(txt) } else nextHidden.add(`${planWeek}:${key}`)
    }
    // Matches the item in any of its languages, in case its translation arrived while she was typing.
    const keep = shopping.extras.filter((e) => {
      const k = [exName(e), e.name, ...Object.values(e.tr ?? {})].map((n) => lineText(e.amount, n ?? '').toLowerCase()).find((x) => wanted.has(x))
      if (k) { wanted.delete(k); return true }
      return false
    })
    const added = [...wanted.values()].map((l) => {
      const ing = parseIngredient(l)
      const amount = ing.amount === null ? '' : [formatAmount(ing.amount), ing.unit].filter(Boolean).join(['g', 'kg', 'ml', 'l'].includes(ing.unit) ? '' : ' ')
      return { id: uid(), name: ing.name || l, amount }
    })
    // Her own items aren't in the text while she's only looking at some meals, so they stay as they are.
    setShopping({ hidden: [...nextHidden], extras: [...(showExtras ? [] : shopping.extras), ...added, ...keep] })
  }
  // Take everything in the basket off the list (planned items are hidden for this week, added ones deleted), with Undo.
  const [finishOpen, setFinishOpen] = useState(false)
  const clearBought = (finish = false) => {
    const before = { hidden: shopping.hidden ?? [], extras: shopping.extras, ticked: shopping.ticked, shoppingMode: shopping.shoppingMode }
    const keys = inBasket.map((i) => i.key)
    const ticked = { ...shopping.ticked }
    for (const k of keys) delete ticked[tk(k)]
    const nextHidden = new Set(shopping.hidden ?? [])
    for (const k of keys) if (!k.startsWith('extra:')) nextHidden.add(`${planWeek}:${k}`)
    setShopping({
      ticked,
      hidden: [...nextHidden],
      extras: shopping.extras.filter((e) => !keys.includes(`extra:${e.id}`)),
      ...(finish ? { shoppingMode: false } : {}),
    })
    setFinishOpen(false)
    window.scrollTo(0, 0)
    toast(t('clearedN', { n: keys.length }), { label: t('undo'), run: () => setShopping(before) })
  }
  const basketOpen = useUI((u) => u.basketOpen)
  const setBasketOpen = useUI((u) => u.setBasketOpen)
  const setBasketCount = useUI((u) => u.setBasketCount)
  useEffect(() => { setBasketCount(done) }, [done, setBasketCount])


  const row = (key: string, name: string, amount: string, caption: string, last: boolean) => {
    const on = isTicked(key)
    return (
      <button key={key} aria-pressed={on} onClick={(e) => { if (!on) flyToBasket(e.currentTarget, cap(plBasic(name))); toggle(key) }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', background: 'transparent', border: 'none', borderBottom: last ? 'none' : '1px solid var(--line)', textAlign: 'left', width: '100%' }}>
        <span className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={16} sw={2.5} />}</span>
        <span className="grow stack" style={{ gap: 2 }}>
          <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600, color: on ? 'var(--ink-muted)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{cap(plBasic(name))}</span>
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
          {shoppingNow
            ? <button className="text-back" style={{ color: 'var(--cherry)', gap: 6 }} onClick={() => setShopping({ shoppingMode: false })}><Icon name="arrow-left" size={18} />{t('editList')}</button>
            : <button className="text-back" onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav('/plan'))}><Icon name="back" size={16} />{t('back')}</button>}
          <h1 className="display">{t('shopping')}</h1>
        </div>
      </div>
      {!shoppingNow && text.trim() !== '' && (
        <button className="btn primary block sticky-start" onClick={() => { commit(); noteTrip(); setShopping({ shoppingMode: true }); window.scrollTo(0, 0) }}>
          <Icon name="bag" size={20} />{t('startShopping')}
        </button>
      )}
      {cookable.length + (shopping.extras.length ? 1 : 0) > 1 && (
        <div className="chips" role="group" aria-label={t('shopFor')}>
          <button className="chip" aria-pressed={!someMeals} onClick={() => setShopping({ onlyFor: undefined })}>{t('allMeals')}</button>
          <button className="chip" aria-pressed={someMeals} onClick={() => setChoosing(true)}>
            {!someMeals ? t('chooseMeals') : [chosen.length ? t(chosen.length === 1 ? 'mealN' : 'mealsN', { n: chosen.length }) : '', extrasPicked ? t('yourItems') : ''].filter(Boolean).join(' + ').replace(/^./, (c) => c.toUpperCase())}<Icon name="forward" size={14} />
          </button>
        </div>
      )}
      <Sheet open={choosing} onClose={() => setChoosing(false)} title={t('chooseMealsTitle')}>
        <span className="small muted">{t('chooseMealsHint')}</span>
        <div className="card" style={{ padding: '4px 12px' }}>
          {shopping.extras.length > 0 && (
            <button className="check-row" aria-pressed={extrasPicked} 
              onClick={() => setShopping({ onlyFor: extrasPicked ? pickedIds.filter((x) => x !== 'extras') : [...pickedIds, 'extras'] })}>
              <span className={`check ${extrasPicked ? 'on' : ''}`}>{extrasPicked && <Icon name="check" size={14} sw={2.5} />}</span>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--peach-soft)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="edit" size={18} /></span>
              <span className="stack grow" style={{ gap: 0, minWidth: 0, textAlign: 'left' }}>
                <span style={{ fontWeight: 600 }}>{t('yourItemsLong')}</span>
                <span className="caption">{shopping.extras.slice(0, 3).map(exName).join(', ')}{shopping.extras.length > 3 ? ` +${shopping.extras.length - 3}` : ''}</span>
              </span>
            </button>
          )}
          {cookable.map((p, i) => {
            const r = recipes.find((x) => x.id === p.recipeId)!
            const on = chosen.includes(p.id)
            return (
              <button key={p.id} className="check-row" aria-pressed={on} style={{ borderTop: i || shopping.extras.length ? '1px solid var(--line)' : 'none' }}
                onClick={() => setShopping({ onlyFor: on ? pickedIds.filter((x) => x !== p.id) : [...pickedIds, p.id] })}>
                <span className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={14} sw={2.5} />}</span>
                <Thumb photo={r.photo} size={40} cat={r.category} name={r.title} />
                <span className="stack grow" style={{ gap: 0, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ fontWeight: 600 }}>{r.title}</span>
                  <span className="caption">{fmt(p.date, t.lang, { weekday: 'short', day: 'numeric' })} · {t(p.meal)}</span>
                </span>
              </button>
            )
          })}
        </div>
        <button className="btn primary block" onClick={() => { if (!pickedIds.length) setShopping({ onlyFor: undefined }); setChoosing(false) }}>
          {pickedIds.length ? t('showPicked') : t('allMeals')}
        </button>
      </Sheet>
      {family.length > 0 && (
        <div className="chips" role="group" aria-label={t('includeFamily')}>
          {family.map((f) => (
            <button key={f.person.id} className="chip" aria-pressed={!skip[f.person.id]} onClick={() => setSkip({ ...skip, [f.person.id]: !skip[f.person.id] })}>
              {t('includeMeals', { name: f.person.name, n: f.plan.filter((p) => !p.leftoverOf).length })}
            </button>
          ))}
        </div>
      )}

      {!shoppingNow && (
        <section className="stack" style={{ gap: 8 }}>
          <span className="small muted">{t(hint)}</span>
          {hint === 'listHintNoPlan' && <button className="btn secondary small" style={{ alignSelf: 'flex-start' }} onClick={() => nav('/plan')}>{t('planMeals')}</button>}
          <LineEditor value={text} onChange={setText} onFocus={() => { editing.current = true }} onDone={commit}
            struck={(l) => bought.has(l)} placeholder={t('listPh')} label={t('shopping')} addOnTop />
          {inBasket.length > 0 && (
            <div className="between" style={{ gap: 12 }}>
              <span className="caption">{t('boughtHint', { n: inBasket.length })}</span>
              <button className="btn ghost small" style={{ border: 'none', padding: '0 4px', flex: 'none' }} onClick={() => clearBought()}>{t('clearBoughtN', { n: inBasket.length })}</button>
            </div>
          )}
        </section>
      )}


      {shoppingNow && allKeys.length > 0 && done === allKeys.length && (
        <div className="empty"><img src="/icons/cat-fruitveg.png" alt="" /><p style={{ margin: 0 }}>{t('allInBasket')}</p>
          <button className="btn primary" onClick={() => setFinishOpen(true)}>{t('clearBasket')}</button></div>
      )}

      {allPlan.length > 0 && items.length === 0 && probably.length === 0 && !shoppingNow && text.trim() === '' && (
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-muted)' }}>{cap(plBasic(l.name))}</span>
                  <span className="caption">{[displayAmount(l, t.lang), t(l.reason === 'staple' ? 'reasonStaple' : l.reason === 'small' ? 'reasonSmall' : 'reasonRecent')].filter(Boolean).join(' · ')}</span>
                </span>
                <button className="chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }} onClick={() => setShopping({ out: [...shopping.out, l.key] })}>{t('imOut')}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title={t('doneShoppingQ')}>
        <p style={{ margin: 0 }}>{t('finishBody', { n: done })} {allKeys.length - done > 0 && t('stillToGet', { n: allKeys.length - done })}</p>
        <button className="btn primary block" onClick={() => clearBought(true)}>{t('clearAndFinish')}</button>
        <button className="btn ghost block" style={{ border: 'none' }} onClick={() => { setFinishOpen(false); setShopping({ shoppingMode: false }) }}>{t('keepCrossed')}</button>
      </Sheet>
      <Sheet open={basketOpen} onClose={() => setBasketOpen(false)} title={t('basketTitle')}>
        {inBasket.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('basketEmpty')}</p> : (
          <>
            <span className="small muted">{t('basketHint')}</span>
            <div className="card" style={{ padding: '4px 16px' }}>
              {inBasket.map((l, i) => row(l.key, l.name, l.amount, '', i === inBasket.length - 1))}
            </div>
            <button className="btn primary block" onClick={() => { setBasketOpen(false); setFinishOpen(true) }}>{t('clearBasket')}</button>
          </>
        )}
      </Sheet>
    </main>
  )
}

// Names already sent for translation in this session (so a failure doesn't retry on every render).
const asked = new Set<string>()
/** Fill in the reader's language for things typed onto the list, a batch at a time. */
function useTranslatedExtras(extras: ShoppingExtra[], lang: 'en' | 'pl', setShopping: (p: { extras: ShoppingExtra[] }) => void) {
  const missing = extras.filter((e) => !e.tr?.[lang] && !asked.has(`${lang}:${e.id}`))
  const key = missing.map((e) => e.id).join()
  useEffect(() => {
    if (!missing.length) return
    for (const e of missing) asked.add(`${lang}:${e.id}`)
    // Everyday things come from our dictionary; only the rest go to the AI (which uses a daily credit).
    // Anything with Polish letters is already Polish; plain letters with no Polish word we know, already English.
    const polishLetters = /[ąćęłńóśźż]/i
    const sameLang = (n: string) => (lang === 'pl' ? polishLetters.test(n) : !polishLetters.test(n))
    const known = new Map(missing.flatMap((e) => { const d = dictTranslate(e.name, lang) ?? (sameLang(e.name) ? e.name : undefined); return d ? [[e.id, d] as const] : [] }))
    const unknown = missing.filter((e) => !known.has(e.id))
    if (known.size) {
      const now = useStore.getState().shopping.extras
      setShopping({ extras: now.map((e) => (known.has(e.id) ? { ...e, tr: { ...e.tr, [lang]: known.get(e.id)! } } : e)) })
    }
    if (!unknown.length) return
    translateRecipe({ title: 'Shopping list', ingredients: unknown.map((e) => e.name), steps: [], equipment: [] }, lang).then(({ data }) => {
      const out = data?.translation?.ingredients
      if (!out || out.length !== unknown.length) return
      const byId = new Map(unknown.map((e, i) => [e.id, out[i].trim()]))
      const now = useStore.getState().shopping.extras
      setShopping({ extras: now.map((e) => (byId.get(e.id) ? { ...e, tr: { ...e.tr, [lang]: lang === 'pl' ? plBasic(byId.get(e.id)!.toLowerCase()) : byId.get(e.id)! } } : e)) })
    })
  }, [key, lang]) // eslint-disable-line react-hooks/exhaustive-deps
}
