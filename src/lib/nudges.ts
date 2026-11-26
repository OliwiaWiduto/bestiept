import type { LogEntry, Macros, Meal, Profile } from '../types'
import { ZERO } from '../types'
import { add, calorieZone, sumItems } from './nutrition'
import { addDays, fromKey, toKey } from './dates'
import { LIBRARY, libById, type LibRecipe } from './library'

// Healthy choices: kind, specific nudges built on what she already logs. No AI, so they cost nothing.
// A main meal is "light on protein" under 70% of its share of the day's protein (a quarter each).
// A habit is the same miss on 4 or more of the last 7 days. At most one meal tip a day.

export const MAIN: Meal[] = ['breakfast', 'lunch', 'dinner']
export const proteinShare = (targets: Macros) => targets.protein / 4
export const isLow = (protein: number, targets: Macros) => protein < proteinShare(targets) * 0.7
/** Something worth suggesting a swap for: 200 kcal or more, with under 15% of its calories from protein. A 50 kcal coffee never is. */
export const worthSwapping = (m: Macros) => m.kcal >= 200 && m.protein * 4 < m.kcal * 0.15
/** The biggest thing at a meal that's worth swapping (the croissant, not the coffee next to it). */
export function swapTarget(entries: LogEntry[]): LogEntry | null {
  return entries.map((e) => ({ e, m: sumItems(e.items) })).filter((x) => worthSwapping(x.m)).sort((a, b) => b.m.kcal - a.m.kcal)[0]?.e ?? null
}
/** A heavy snack: 300 kcal or more. A 100 kcal Kit Kat is never called out. */
export const heavySnack = (e: LogEntry) => e.meal === 'snack' && sumItems(e.items).kcal >= 300

export type Nudges = NonNullable<Profile['nudges']>
export const nudgesOf = (p: Profile | null | undefined): Nudges => p?.nudges ?? {}

/** What kind of food something is, from its name (English or Polish), and the Bestie picks that feel like it. First match wins. */
const TYPES: { re: RegExp; swaps: string[] }[] = [
  { re: /hot choc|gorąc\S* czekolad|kakao do picia/, swaps: ['bp-hot-chocolate', 'bp-choc-mousse'] },
  { re: /pancake|waffle|naleśnik|gofr|placuszk|placki|racuch/, swaps: ['bp-cottage-pancakes', 'bp-choc-oats'] },
  { re: /bagel|bajgiel/, swaps: ['bp-salmon-bagel', 'bp-eggs-avo'] },
  { re: /toastie|grilled cheese|zapiekank|tost\S* z serem/, swaps: ['bp-turkey-toastie', 'bp-caesar-wrap'] },
  { re: /croissant|pain au|danish|cinnamon (roll|bun)|pastr|rogal|drożdżówk|cynamonk|pączek|pączk|donut|doughnut|brioche/, swaps: ['bp-choc-oats', 'bp-cottage-pancakes', 'bp-banana-muffins', 'bp-berry-bowl'] },
  { re: /cereal|cornflakes|coco pops|frosties|crunchy nut|granola|muesli|musli|płatk\S* śniadaniow|płatk\S* czekoladow|płatk\S* z mlekiem/, swaps: ['bp-berry-bowl', 'bp-choc-oats'] },
  { re: /muffin|banana bread|cake|brownie|cookie|biscuit|ciast|babeczk|herbatnik|bułk\S* słodk/, swaps: ['bp-banana-muffins', 'bp-nutella-cakes', 'bp-choc-mousse', 'bp-pb-dip'] },
  { re: /frapp|latte|mocha|iced coffee|caramel|macchiato|cappuccino|flat white|mrożon\S* kaw|kaw\S* mrożon/, swaps: ['bp-iced-latte'] }, // after food types: a coffee alongside a croissant shouldn't decide the swap
  { re: /chocolate|\bchoc\b|sweets|candy|haribo|kit ?kat|snickers|twix|dairy milk|\bbar\b|baton|czekolad|cukierk|żelk/, swaps: ['bp-nutella-cakes', 'bp-choc-mousse', 'bp-hot-chocolate', 'bp-pb-dip'] },
  { re: /ice cream|lody|lodów|dessert|pudding|deser|tiramisu|cheesecake|sernik/, swaps: ['bp-yoghurt-bark', 'bp-choc-mousse'] },
  { re: /noodle|ramen|zupk\S* chińsk|makaron instant/, swaps: ['bp-prawn-noodles'] },
  { re: /pizza/, swaps: ['bp-gnocchi-traybake', 'bp-turkey-bolognese'] },
  { re: /curry|tikka|korma|masala|biryani/, swaps: ['bp-chicken-curry'] },
  { re: /burrito|fajita|taco|kebab|quesadilla|nachos/, swaps: ['bp-beef-tacos'] },
  { re: /sushi|sweet and sour|chinese|chow mein|teriyaki|fried rice|chińsk|ryż smażon/, swaps: ['bp-salmon-teriyaki', 'bp-prawn-noodles'] },
  { re: /pasta|spaghetti|carbonara|macaroni|mac (and|n|&) cheese|penne|lasagn|lazani|makaron|orzo|gnocchi|kopytk|pierog/, swaps: ['bp-chicken-orzo', 'bp-turkey-bolognese', 'bp-mac-cheese'] },
  { re: /\bwrap|tortill/, swaps: ['bp-caesar-wrap'] },
  { re: /sandwich|meal deal|baguette|panini|\bsub\b|kanapk|bagietk/, swaps: ['bp-caesar-wrap', 'bp-turkey-toastie', 'bp-tuna-beans'] },
  { re: /crisps|chips|popcorn|chipsy|paluszk|pretzel|precl/, swaps: ['bp-edamame', 'bp-cottage-crackers'] },
  { re: /salad|sałat/, swaps: ['bp-tuna-beans', 'bp-halloumi-lentils'] },
  { re: /toast|jam\b|bread|tost|dżem|chleb|bułk|kromk/, swaps: ['bp-eggs-avo', 'bp-salmon-bagel'] },
]

const textOf = (entries: Pick<LogEntry, 'name' | 'items'>[]) => entries.map((e) => [e.name, ...e.items.map((i) => i.name)].join(' ')).join(' ').toLowerCase()

/** Bestie picks that would be a nice swap for what she ate, best first. */
export function swapsFor(meal: Meal, eaten: Pick<LogEntry, 'name' | 'items'>[], opts: { dismissed?: Record<string, string>; today: string; roomKcal?: number }): LibRecipe[] {
  const text = textOf(eaten)
  const got = eaten.reduce((a, e) => add(a, sumItems(e.items)), { ...ZERO })
  const typed = TYPES.filter((t) => t.re.test(text)).flatMap((t) => t.swaps)
  const sameMeal = LIBRARY.filter((l) => l.category === meal).sort((a, b) => b.nutrition.protein / b.nutrition.kcal - a.nutrition.protein / a.nutrition.kcal)
  const order = [...new Set([...typed.map(libById).filter((l): l is LibRecipe => !!l && l.category === meal), ...sameMeal])]
  return order.filter((l) => {
    const when = opts.dismissed?.[l.id]
    if (when && addDays(when, 14) > opts.today) return false
    if (l.nutrition.protein < got.protein + 10 && l.nutrition.fibre < got.fibre + 5) return false
    return l.nutrition.kcal <= got.kcal + 100 || (opts.roomKcal !== undefined && l.nutrition.kcal <= opts.roomKcal)
  })
}

export type MealTip = { meal: Meal; protein: number; kcal: number; swap: LibRecipe; targetId: string }

/** Today's one meal tip: a main meal light on protein, aimed at its biggest calorie-heavy, low-protein item. */
export function mealTip(logs: LogEntry[], date: string, targets: Macros, nudges: Nudges): MealTip | null {
  if (nudges.off || nudges.hiddenOn === date) return null
  const day = logs.filter((l) => l.date === date)
  const dayKcal = day.reduce((a, l) => a + sumItems(l.items).kcal, 0)
  for (const meal of MAIN) {
    const here = day.filter((l) => l.meal === meal)
    if (!here.length) continue
    const m = here.reduce((a, e) => add(a, sumItems(e.items)), { ...ZERO })
    const target = swapTarget(here)
    if (!isLow(m.protein, targets) || !target) continue
    const t = sumItems(target.items)
    const swap = swapsFor(meal, [target], { dismissed: nudges.dismissed, today: date, roomKcal: targets.kcal - dayKcal + t.kcal })[0]
    if (swap) return { meal, protein: Math.round(t.protein), kcal: Math.round(t.kcal), swap, targetId: target.id }
  }
  return null
}

/** A main meal that hit its protein share today, to celebrate (only when there's no tip). */
export function mealWin(logs: LogEntry[], date: string, targets: Macros): { meal: Meal; protein: number; afterId: string } | null {
  for (const meal of MAIN) {
    const here = logs.filter((l) => l.date === date && l.meal === meal)
    if (!here.length) continue
    const p = here.reduce((a, e) => a + sumItems(e.items).protein, 0)
    if (p >= proteinShare(targets)) return { meal, protein: Math.round(p), afterId: [...here].sort((a, b) => a.createdAt - b.createdAt).at(-1)!.id }
  }
  return null
}

export type Habit =
  | { kind: 'protein'; meal: Meal; low: boolean[]; swaps: LibRecipe[] }
  | { kind: 'fibre'; low: boolean[] }
  | { kind: 'over'; low: boolean[] }
  | { kind: 'snack'; meal: Meal; name: string; kcal: number; low: boolean[]; swaps: LibRecipe[] }

/** Repeated misses over the 7 days before `date` (today isn't finished, so it doesn't count). */
export function habits(logs: LogEntry[], date: string, targets: Macros, goal: Profile['goal'], pace: Profile['pace'], nudges: Nudges): Habit[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 7))
  const out: Habit[] = []
  for (const meal of MAIN) {
    const per = days.map((d) => logs.filter((l) => l.date === d && l.meal === meal))
    const low = per.map((e) => e.length > 0 && isLow(e.reduce((a, l) => a + sumItems(l.items).protein, 0), targets) && !!swapTarget(e))
    if (low.filter(Boolean).length < 4) continue
    // Compare against one typical meal (the latest low one), and use every low day's food to work out what she likes.
    const lowDays = per.filter((_, i) => low[i])
    const typical = [swapTarget(lowDays.at(-1)!)!]
    const liked = lowDays.flat().map((e) => ({ ...e, items: [] }))
    const swaps = swapsFor(meal, [...typical, ...liked], { dismissed: nudges.dismissed, today: date, roomKcal: targets.kcal / 3 }).slice(0, 3)
    out.push({ kind: 'protein', meal, low, swaps })
  }
  // Whole-day checks only count days that look fully logged (60% of her calories or more).
  const totals = days.map((d) => logs.filter((l) => l.date === d).reduce((a, l) => add(a, sumItems(l.items)), { ...ZERO }))
  const full = totals.map((m) => m.kcal >= targets.kcal * 0.6)
  const fibre = totals.map((m, i) => full[i] && m.fibre < targets.fibre)
  if (fibre.filter(Boolean).length >= 4) out.push({ kind: 'fibre', low: fibre })
  const top = calorieZone(targets.kcal, goal, pace)[1]
  const over = totals.map((m, i) => full[i] && m.kcal > top)
  // Snacks are allowed to be treats. Only a heavy one (300 kcal+) that keeps tipping the day over the zone gets a lighter idea.
  const heavy = days.map((d) => logs.filter((l) => l.date === d && heavySnack(l)).sort((a, b) => sumItems(b.items).kcal - sumItems(a.items).kcal)[0])
  const snackDays = over.map((o, i) => o && !!heavy[i])
  if (snackDays.filter(Boolean).length >= 4) {
    const last = heavy.filter((h, i) => h && snackDays[i]).at(-1)!
    const k = sumItems(last.items).kcal
    const text = textOf([last])
    const savoury = /crisps|chips|popcorn|chipsy|paluszk|pretzel|precl|nachos|cheese|ser\b/.test(text)
    const typed = TYPES.filter((t) => t.re.test(text)).flatMap((t) => t.swaps)
    const lighter = [...new Set([...typed.map(libById), ...LIBRARY])]
      .filter((l): l is LibRecipe => !!l && l.category === 'snack' && l.nutrition.kcal <= k * 0.6 && l.feel === (savoury ? 'savoury' : 'sweet'))
      .filter((l) => { const w = nudges.dismissed?.[l.id]; return !w || addDays(w, 14) <= date })
    out.push({ kind: 'snack', meal: 'snack', name: last.name, kcal: Math.round(k), low: snackDays, swaps: lighter.slice(0, 3) })
  } else if (over.filter(Boolean).length >= 4) out.push({ kind: 'over', low: over })
  return out
}

/** Sunday of the week containing k: her weeks start on Sunday. */
export const sundayOf = (k: string) => { const d = fromKey(k); d.setDate(d.getDate() - d.getDay()); return toKey(d) }

/** The "Your week" bar: shows from Sunday for the week just gone, and stays until she taps it. */
export function weekRecap(logs: LogEntry[], date: string, targets: Macros, goal: Profile['goal'], pace: Profile['pace'], nudges: Nudges) {
  const start = sundayOf(date)
  if (nudges.weekSeen === start) return null
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i - 7))
  const totals = days.map((d) => logs.filter((l) => l.date === d).reduce((a, l) => a + sumItems(l.items).kcal, 0))
  const logged = totals.filter((k) => k > 0).length
  if (logged < 2) return null
  const [lo, hi] = calorieZone(targets.kcal, goal, pace)
  const inZone = totals.filter((k) => k >= lo && k <= hi).length
  const n = habits(logs, start, targets, goal, pace, nudges).length
  return { start, logged, inZone, habits: n }
}
