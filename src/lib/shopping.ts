import type { PlanItem, Recipe, ShoppingState } from '../types'
import { daysBetween } from './dates'
import { plBasic } from './plNames'

export type Category = 'fruitveg' | 'meatfish' | 'dairy' | 'bakery' | 'cupboard' | 'frozen' | 'drinks' | 'household' | 'other'
export const CATEGORIES: Category[] = ['fruitveg', 'meatfish', 'dairy', 'bakery', 'cupboard', 'frozen', 'drinks', 'household', 'other']
export const CATEGORY_ICON: Partial<Record<Category, string>> = {
  fruitveg: '/icons/cat-fruitveg.png',
  meatfish: '/icons/cat-meatfish.png',
  dairy: '/icons/cat-dairy.png',
  bakery: '/icons/cat-bakery.png',
  cupboard: '/icons/cat-cupboard.png',
  frozen: '/icons/cat-frozen.png',
  drinks: '/icons/cat-drinks.png',
  household: '/icons/cat-extras.png',
  other: '/icons/cat-extras.png',
}
/** Fresh food is never assumed to be in the cupboard. */
const PERISHABLE: Category[] = ['fruitveg', 'meatfish', 'dairy', 'bakery']

const KEYWORDS: [Category, string[]][] = [
  ['cupboard', ['chopped tomatoes', 'passata', 'tinned', 'canned', 'tin of', 'z puszki', 'koncentrat', 'stock', 'bulion', 'sesame oil', 'olej sezamowy', 'soy sauce', 'sos sojowy']],
  ['frozen', ['frozen', 'mrożon', 'ice cream', 'lody']],
  ['meatfish', ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp', 'fish', 'chorizo', 'kurczak', 'kurczaka', 'wołow', 'wieprz', 'mielon', 'boczek', 'kiełbas', 'szynk', 'indyk', 'łosoś', 'tuńczyk', 'dorsz', 'krewet', 'ryba']],
  ['dairy', ['milk', 'cheese', 'cheddar', 'parmesan', 'feta', 'mozzarella', 'halloumi', 'yoghurt', 'yogurt', 'cream', 'butter', 'egg', 'mleko', 'ser ', 'serek', 'parmezan', 'jogurt', 'śmietan', 'masło', 'jaj']],
  ['bakery', ['bread', 'wrap', 'tortilla', 'bagel', 'pitta', 'roll', 'chleb', 'bułk', 'tortill', 'bajgiel']],
  ['drinks', ['juice', 'coffee', 'tea ', 'sok', 'kawa', 'herbata']],
  ['household', ['toilet', 'kitchen roll', 'foil', 'bin bag', 'washing', 'soap', 'papier toaletowy', 'folia', 'worki', 'mydło', 'płyn']],
  ['fruitveg', ['onion', 'garlic', 'tomato', 'pepper', 'spinach', 'lettuce', 'carrot', 'potato', 'courgette', 'aubergine', 'mushroom', 'broccoli', 'cucumber', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berries', 'berry', 'ginger', 'chilli', 'herb', 'basil', 'coriander', 'parsley', 'leek', 'celery', 'kale', 'cabbage', 'spring onion', 'edamame', 'cebul', 'czosn', 'pomidor', 'papryk', 'szpinak', 'sałat', 'marchew', 'ziemniak', 'cukinia', 'bakłażan', 'grzyb', 'pieczark', 'brokuł', 'ogórek', 'awokado', 'cytryn', 'limonk', 'jabłk', 'banan', 'borówk', 'truskawk', 'imbir', 'bazyli', 'kolendr', 'pietruszk', 'por ', 'seler', 'jarmuż', 'kapust']],
  ['cupboard', ['rice', 'pasta', 'orzo', 'noodle', 'oats', 'flour', 'sugar', 'oil', 'vinegar', 'stock', 'tin', 'chopped tomatoes', 'passata', 'beans', 'lentil', 'chickpea', 'sauce', 'soy', 'honey', 'salt', 'spice', 'cumin', 'paprika', 'oregano', 'cinnamon', 'seeds', 'nuts', 'peanut', 'coconut milk', 'stock cube', 'ryż', 'makaron', 'płatki', 'mąka', 'cukier', 'olej', 'oliw', 'ocet', 'bulion', 'fasol', 'soczewic', 'ciecierzyc', 'sos', 'miód', 'sól', 'przypraw', 'kmin', 'cynamon', 'nasion', 'orzech', 'mleko kokos']],
]

export function categorise(name: string): Category {
  const n = ` ${name.toLowerCase()} `
  for (const [cat, words] of KEYWORDS) if (words.some((w) => n.includes(w))) return cat
  return 'other'
}

export const DEFAULT_STAPLES = ['salt', 'pepper', 'olive oil', 'vegetable oil', 'soy sauce', 'stock', 'cumin', 'paprika', 'oregano', 'chilli flakes', 'garlic', 'flour', 'sugar', 'honey', 'vinegar']
export const DEFAULT_STAPLES_PL = ['sól', 'pieprz', 'oliwa', 'olej', 'sos sojowy', 'bulion', 'kmin', 'papryka słodka', 'oregano', 'płatki chili', 'czosnek', 'mąka', 'cukier', 'miód', 'ocet']

/** A default staple in the other language ("salt" ↔ "sól"); anything she typed herself stays as it is. */
function swapStaple(s: string): string | undefined {
  const k = s.trim().toLowerCase()
  const i = DEFAULT_STAPLES.indexOf(k)
  if (i >= 0) return DEFAULT_STAPLES_PL[i]
  const j = DEFAULT_STAPLES_PL.indexOf(k)
  return j >= 0 ? DEFAULT_STAPLES[j] : undefined
}

/** Polish ingredient names change their endings ("czosnek" → "czosnku"), so the default staples match on these too. */
const PL_FORMS: Record<string, string[]> = {
  'sól': ['soli'], 'pieprz': ['pieprzu'], 'oliwa': ['oliwy', 'oliwę', 'oliwą'], 'olej': ['oleju', 'olejem'], 'sos sojowy': ['sosu sojowego', 'sosem sojowym'],
  'bulion': ['bulionu', 'bulionem'], 'kmin': ['kminu', 'kminku'], 'papryka słodka': ['papryki słodkiej', 'słodkiej papryki', 'słodka papryka'], 'płatki chili': ['płatków chili'],
  'czosnek': ['czosnku', 'czosnkiem'], 'mąka': ['mąki', 'mąkę'], 'cukier': ['cukru'], 'miód': ['miodu', 'miodem'], 'ocet': ['octu', 'octem'],
}
const forms = (s: string) => { const k = s.toLowerCase(); return [k, ...(PL_FORMS[k] ?? [])] }

/** Her staples shown in the app's language, without duplicates. */
export function staplesIn(staples: string[], lang: 'en' | 'pl'): string[] {
  const own = lang === 'pl' ? DEFAULT_STAPLES_PL : DEFAULT_STAPLES
  return Array.from(new Set(staples.map((s) => {
    const k = s.trim().toLowerCase()
    return own.includes(k) ? k : swapStaple(k) ?? s.trim()
  })))
}

export type ShoppingLine = {
  key: string
  name: string
  amount: number | null
  unit: string
  category: Category
  recipes: string[]
  reason?: 'staple' | 'small' | 'recent'
  /** The same line's key as worked out from the recipe in other languages (older ticks were saved under these). */
  alts?: string[]
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').trim()

function baseUnit(amount: number | null, unit: string): [number | null, string] {
  if (amount === null) return [null, unit]
  if (unit === 'kg') return [amount * 1000, 'g']
  if (unit === 'l') return [amount * 1000, 'ml']
  if (unit === 'łyżka' || unit === 'łyżki') return [amount, 'tbsp']
  if (unit === 'łyżeczka' || unit === 'łyżeczki') return [amount, 'tsp']
  return [amount, unit]
}

// Words that describe how an ingredient is bought or used, not what it is.
const NOT_THE_THING = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'big', 'ripe', 'extra', 'virgin', 'extra-virgin', 'good', 'quality', 'good-quality', 'light', 'mild', 'plain',
  'boneless', 'skinless', 'finely', 'roughly', 'thinly', 'chopped', 'grated', 'sliced', 'diced', 'crushed', 'minced', 'peeled', 'cooked', 'raw', 'organic', 'free-range', 'a', 'of', 'some', 'little', 'drizzle', 'splash', 'glug', 'handful', 'clove', 'cloves', 'tin', 'tins', 'can', 'cans', 'tinned', 'canned', 'leaf', 'leaves', 'sprig', 'sprigs', 'bunch',
  'świeży', 'świeża', 'świeże', 'świeżo', 'duży', 'duża', 'duże', 'mały', 'mała', 'małe', 'średni', 'średnia', 'średnie', 'drobno', 'grubo', 'posiekany', 'posiekana', 'posiekane', 'starty', 'starta', 'starte', 'pokrojony', 'pokrojona', 'pokrojone', 'ząbki', 'ząbek', 'ząbków', 'z', 'puszki', 'puszka', 'odrobina', 'garść', 'oliwek', 'listki', 'listków', 'pęczek', 'gałązka'])
/** One key for every way a recipe can name the same thing ("extra virgin olive oil, for frying" = "olive oil"). */
export function ingredientKey(name: string): string {
  const words = name.toLowerCase().replace(/\(.*?\)/g, '').split(/,|;| for | to | do | na /)[0]
    .replace(/[^a-ząęółśżźćń\s-]/g, ' ').split(/\s+/).filter((w) => w && !NOT_THE_THING.has(w))
  return plBasic(words.join(' ')).split(' ')
    .map((w) => (w.length > 4 && /[^s]s$/.test(w) ? w.replace(/(oes|ies|s)$/, (m) => (m === 'ies' ? 'y' : m === 'oes' ? 'o' : '')) : w)).join(' ').trim()
}

// Spoons and cups add up with ml; everything is kept in the smallest unit it came in.
const ML: Record<string, number> = { tsp: 5, tbsp: 15, cup: 240, cups: 240, ml: 1 }
function addAmounts(a: { amount: number | null; unit: string }, amt: number | null, unit: string): boolean {
  if (amt === null) return true // "a drizzle of olive oil" just joins the line
  if (a.unit === unit) { a.amount = (a.amount ?? 0) + amt; return true }
  if (ML[a.unit] && ML[unit]) {
    const total = (a.amount ?? 0) * ML[a.unit] + amt * ML[unit]
    const into = ML[a.unit] <= ML[unit] ? a.unit : unit
    a.amount = total / ML[into]; a.unit = into
    if (a.unit === 'tsp' && a.amount >= 3) { a.amount /= 3; a.unit = 'tbsp' }
    return true
  }
  return false
}

/**
 * Combine every planned (non-leftover) meal's ingredients into one list.
 * recipes are shown in the reader's language; keyFrom (the recipes as saved) gives every line the same key on every phone,
 * so a household list ticked in Polish is ticked in English too. alts: the recipes in each language, for older ticks.
 */
export function buildList(plan: PlanItem[], recipes: Recipe[], shop: ShoppingState, todayKey: string, keyFrom?: { raw: Recipe[]; alts: Recipe[][] }) {
  const map = new Map<string, ShoppingLine>()
  for (const p of plan) {
    if (p.leftoverOf) continue
    const r = recipes.find((x) => x.id === p.recipeId)
    if (!r) continue
    const factor = p.servings / (r.servings || 1)
    const raw = keyFrom?.raw.find((x) => x.id === r.id)
    for (const [n0, ing] of r.ingredients.entries()) {
      const name = norm(ing.name)
      const k = ingredientKey(raw?.ingredients[n0]?.name ?? ing.name)
      if (!name || !k) continue
      const alts = [ing.name, ...(keyFrom?.alts ?? []).map((list) => list.find((x) => x.id === r.id)?.ingredients[n0]?.name ?? '')].map(ingredientKey).filter((a) => a && a !== k)
      const [amt, unit] = baseUnit(ing.amount === null ? null : ing.amount * factor, ing.unit)
      // Same thing in units that add up (tsp + tbsp, ml + tbsp) goes on one line; otherwise a second line.
      let key = k
      for (let n = 2; ; n++) {
        const cur = map.get(key)
        const suffix = key.slice(k.length)
        if (!cur) { map.set(key, { key, name, amount: amt, unit, category: categorise(name), recipes: [r.title], alts: alts.map((a) => a + suffix) }); break }
        if (addAmounts(cur, amt, unit)) {
          for (const a of alts) if (!cur.alts!.includes(a + suffix)) cur.alts!.push(a + suffix)
          if (name.length < cur.name.length) cur.name = name // show the plainest wording
          if (!cur.recipes.includes(r.title)) cur.recipes.push(r.title)
          break
        }
        key = `${k}|${n}`
      }
    }
  }
  const need: ShoppingLine[] = []
  const probably: ShoppingLine[] = []
  for (const line of map.values()) {
    const out = shop.out.includes(line.key)
    const isStaple = shop.staples.flatMap((s) => [...forms(s), ...forms(swapStaple(s) ?? '')]).some((s) => s && line.name.includes(s))
    const small = ['tsp', 'tbsp', 'pinch', 'łyżeczka', 'łyżeczki', 'łyżka', 'łyżki', 'szczypta'].includes(line.unit) && !PERISHABLE.includes(line.category)
    const last = shop.lastBought[line.key]
    const recent = !!last && !PERISHABLE.includes(line.category) && daysBetween(last, todayKey) <= 28
    if (!out && (isStaple || small || recent)) probably.push({ ...line, reason: isStaple ? 'staple' : small ? 'small' : 'recent' })
    else need.push(line)
  }
  if (map.size === 0) return { need, probably }
  return { need, probably }
}

export function displayAmount(l: { amount: number | null; unit: string }, lang: 'en' | 'pl' = 'en'): string {
  if (l.amount === null) return ''
  let a = l.amount
  let u = l.unit
  if (u === 'g' && a >= 1000) { a = a / 1000; u = 'kg' }
  if (u === 'ml' && a >= 1000) { a = a / 1000; u = 'l' }
  const n = a >= 10 ? Math.round(a) : Math.round(a * 4) / 4
  const glue = ['g', 'kg', 'ml', 'l'].includes(u)
  const num = lang === 'pl' ? String(n).replace('.', ',') : String(n)
  return glue ? `${num}${u}` : `${num}${u ? ' ' + u : ''}`
}
