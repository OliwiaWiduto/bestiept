import type { PlanItem, Recipe, ShoppingState } from '../types'
import { daysBetween } from './dates'

export type Category = 'fruitveg' | 'meatfish' | 'dairy' | 'bakery' | 'cupboard' | 'frozen' | 'drinks' | 'household' | 'other'
export const CATEGORIES: Category[] = ['fruitveg', 'meatfish', 'dairy', 'bakery', 'cupboard', 'frozen', 'drinks', 'household', 'other']
export const CATEGORY_ICON: Partial<Record<Category, string>> = {
  fruitveg: '/icons/cat-fruitveg.png',
  meatfish: '/icons/cat-meatfish.png',
  dairy: '/icons/cat-dairy.png',
  cupboard: '/icons/cat-cupboard.png',
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

export type ShoppingLine = {
  key: string
  name: string
  amount: number | null
  unit: string
  category: Category
  recipes: string[]
  reason?: 'staple' | 'small' | 'recent'
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').trim()

function baseUnit(amount: number | null, unit: string): [number | null, string] {
  if (amount === null) return [null, unit]
  if (unit === 'kg') return [amount * 1000, 'g']
  if (unit === 'l') return [amount * 1000, 'ml']
  return [amount, unit]
}

/** Combine every planned (non-leftover) meal's ingredients into one list. */
export function buildList(plan: PlanItem[], recipes: Recipe[], shop: ShoppingState, todayKey: string) {
  const map = new Map<string, ShoppingLine>()
  for (const p of plan) {
    if (p.leftoverOf) continue
    const r = recipes.find((x) => x.id === p.recipeId)
    if (!r) continue
    const factor = p.servings / (r.servings || 1)
    for (const ing of r.ingredients) {
      const name = norm(ing.name)
      if (!name) continue
      const [amt, unit] = baseUnit(ing.amount === null ? null : ing.amount * factor, ing.unit)
      const key = `${name}|${unit}`
      const cur = map.get(key)
      if (cur) {
        cur.amount = cur.amount === null || amt === null ? cur.amount ?? amt : cur.amount + amt
        if (!cur.recipes.includes(r.title)) cur.recipes.push(r.title)
      } else {
        map.set(key, { key, name, amount: amt, unit, category: categorise(name), recipes: [r.title] })
      }
    }
  }
  const need: ShoppingLine[] = []
  const probably: ShoppingLine[] = []
  for (const line of map.values()) {
    const out = shop.out.includes(line.key)
    const isStaple = shop.staples.some((s) => line.name.includes(s.toLowerCase()))
    const small = ['tsp', 'tbsp', 'pinch', 'łyżeczka', 'łyżeczki', 'łyżka', 'łyżki', 'szczypta'].includes(line.unit) && !PERISHABLE.includes(line.category)
    const last = shop.lastBought[line.key]
    const recent = !!last && !PERISHABLE.includes(line.category) && daysBetween(last, todayKey) <= 28
    if (!out && (isStaple || small || recent)) probably.push({ ...line, reason: isStaple ? 'staple' : small ? 'small' : 'recent' })
    else need.push(line)
  }
  if (map.size === 0) return { need, probably }
  return { need, probably }
}

export function displayAmount(l: { amount: number | null; unit: string }): string {
  if (l.amount === null) return ''
  let a = l.amount
  let u = l.unit
  if (u === 'g' && a >= 1000) { a = a / 1000; u = 'kg' }
  if (u === 'ml' && a >= 1000) { a = a / 1000; u = 'l' }
  const n = a >= 10 ? Math.round(a) : Math.round(a * 4) / 4
  const glue = ['g', 'kg', 'ml', 'l'].includes(u)
  return glue ? `${n}${u}` : `${n}${u ? ' ' + u : ''}`
}
