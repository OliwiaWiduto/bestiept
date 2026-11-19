// Looks foods up in our food data (starter list + the UK CoFID table) so logged macros
// come from real figures rather than guesses, and turns recipe ingredients into loggable items.
import type { FoodItem, Ingredient, Lang, Macros, Recipe } from '../types'
import { FOODS } from './foods'
import { loadUkFoods, type FoodHit } from './foodSearch'
import { recipeLang } from './recipeLang'
import { uid } from './util'
import { COMMON } from './commonFoods'
import { prefetchFoods, rememberFood, savedFood } from './foodDb'
import { scanMealText } from './ai'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const FILLER = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'big', 'ripe', 'whole', 'extra', 'virgin', 'finely', 'roughly', 'thinly', 'chopped', 'grated', 'sliced', 'diced', 'crushed', 'minced', 'peeled', 'halved', 'of', 'a', 'an', 'the', 'and', 'with', 'some', 'little', 'bit', 'handful', 'pinch', 'good', 'quality', 'to', 'taste', 'optional', 'heaped', 'level'])
const ALIASES: Record<string, string> = { hummus: 'houmous', zucchini: 'courgette', eggplant: 'aubergine', cilantro: 'coriander', yoghurt: 'yogurt', fries: 'chips', mayo: 'mayonnaise', scallion: 'spring', scallions: 'spring' }

function tokensOf(name: string): string[] {
  const main = norm(name).split(/[,(;]/)[0]
  return main.split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !FILLER.has(w)).map((w) => ALIASES[w] ?? w)
}

// Whole words only (with simple plurals), so "lemon" never matches "lemonade" or "bread" "breadfruit".
const same = (w: string, t: string) => w === t || w === t + 's' || w === t + 'es' || w + 's' === t || w + 'es' === t || (t.endsWith('ies') && w === t.slice(0, -3) + 'y') || (w.endsWith('ies') && t === w.slice(0, -3) + 'y')
const DISH = /\b(homemade|retail|with|in|sauce|pie|curry|bake|soup|stew|casserole|burger|sandwich|salad|pudding|cake|chips|crisps|cordial|juice|bread|biscuits?)\b/

function fits(foodName: string, tokens: string[]): number | null {
  const n = norm(foodName)
  const words = n.split(/[^a-z0-9]+/).filter(Boolean)
  for (const tk of tokens) if (!words.some((w) => same(w, tk))) return null
  const first = n.split(',')[0].trim()
  let s = 0
  if (same(first, tokens[0]) || first === tokens.join(' ')) s += 50
  else if (first.split(/\s+/).some((w) => same(w, tokens[0]))) s += 25
  if (/\braw\b|\bplain\b|\baverage\b/.test(n)) s += 6
  const dish = n.match(DISH)
  if (dish && !tokens.includes(dish[1])) s -= 25
  if (/\bdried\b|\bpowder\b|\bcanned in syrup\b|\bfried in\b|\bweighed with\b/.test(n)) s -= 8
  return s - n.split(',').length * 2 - n.length / 25
}

const ukByName = new Map<string, FoodHit>()
async function common(name: string): Promise<FoodHit | null> {
  const n = name.toLowerCase().split(/[,(]/)[0]
  const row = COMMON.find(([re]) => re.test(n))
  if (!row) return null
  const v = row[1]
  if (typeof v !== 'string') return { key: 'c:' + n, name: n, per: { kcal: v[0], protein: v[1], carbs: v[2], fat: v[3], fibre: v[4], sugar: v[5] }, portion: 100 }
  if (!ukByName.size) for (const f of await loadUkFoods()) ukByName.set(f.name, f)
  return ukByName.get(v) ?? null
}

/** Best food for a name, or null when nothing fits well enough to trust. Raw = as bought, for recipe ingredients. */
export async function bestFood(name: string, lang: Lang, raw = false, allowAi = false): Promise<FoodHit | null> {
  const saved = await savedFood(name)
  if (saved) return saved
  const fromTables = await tableFood(name, lang, raw)
  if (fromTables) return fromTables
  return allowAi ? savedFood(name, true) : null
}

async function tableFood(name: string, lang: Lang, raw: boolean): Promise<FoodHit | null> {
  if (raw) { const c = await common(name); if (c) return c }
  const n = norm(name.split(/[,(]/)[0].trim())
  const starter = FOODS.find((f) => norm(f.en) === n || norm(f.pl) === n)
    ?? FOODS.find((f) => [f.en, f.pl].some((x) => { const xn = norm(x); return n.includes(xn) && xn.length >= 4 }))
  if (starter) return { key: 'b:' + starter.en, name: starter[lang], per: starter.per, portion: starter.portion }
  let tokens = tokensOf(name)
  if (!tokens.length) return null
  const uk = await loadUkFoods()
  // Try the full name, then drop words from the end (but keep at least two if there were two or more).
  const minLen = tokens.length >= 2 ? 2 : 1
  while (tokens.length >= minLen) {
    const ranked = uk.map((f) => [fits(f.name, tokens), f] as const).filter((x): x is readonly [number, FoodHit] => x[0] !== null).sort((a, b) => b[0] - a[0])
    if (ranked.length && ranked[0][0] > 0) return ranked[0][1]
    tokens = tokens.slice(0, -1)
  }
  return null
}

// Rough weights for things counted rather than weighed
const PIECE: [RegExp, number][] = [
  [/egg|jajk|jaj/, 50], [/aubergine|eggplant|bakłażan/, 300], [/onion|cebul/, 150], [/shallot|szalotk/, 30], [/garlic|czosn/, 5], [/lemon|cytryn/, 100], [/lime|limonk/, 70],
  [/sweet potato|batat/, 200], [/potato|ziemniak/, 170], [/carrot|marchew/, 80], [/cherry tomato|pomidork/, 15], [/tomato|pomidor/, 85], [/banana|banan/, 120], [/apple|jabłk/, 150],
  [/pepper|papryk/, 160], [/courgette|zucchini|cukini/, 200], [/avocado|awokado/, 150], [/chicken breast|pierś/, 150], [/chicken thigh|udk/, 120], [/tortilla|wrap/, 60],
  [/slice|kromk/, 40], [/bagel|bun|bułk/, 85], [/pitta|pita/, 60], [/spring onion|dymk/, 15], [/chilli|chili/, 15], [/cucumber|ogór/, 300], [/salmon|łosoś/, 120], [/stock cube|kostk/, 10],
]
const UNIT_G: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 240, cups: 240, tin: 400, tins: 400, can: 400, cans: 400, clove: 5, cloves: 5, pinch: 0.5, handful: 30,
  'łyżeczka': 5, 'łyżeczki': 5, 'łyżecz.': 5, 'łyżka': 15, 'łyżki': 15, 'łyż.': 15, 'szklanka': 240, 'szkl.': 240, 'puszka': 400, 'puszki': 400, 'pusz.': 400, 'ząbek': 5, 'ząbki': 5, 'ząb.': 5, 'szczypta': 0.5, 'garść': 30 }

/** How many grams an ingredient line is, roughly. */
export function ingredientGrams(i: Ingredient): number {
  const unit = i.unit.toLowerCase()
  if (i.amount === null) return /salt|sól|pepper|pieprz|spice|przypraw|herb|zioł/i.test(i.name) ? 1 : 10
  if (UNIT_G[unit]) return i.amount * UNIT_G[unit]
  const n = i.name.toLowerCase()
  return i.amount * (PIECE.find(([re]) => re.test(n))?.[1] ?? 100)
}

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 }
const per100 = (m: Macros, grams: number): Macros => {
  const f = grams > 0 ? 100 / grams : 0
  return { kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f, fibre: m.fibre * f, sugar: m.sugar * f }
}

/**
 * A recipe portion as one item per ingredient, so she can change any of them.
 * Ingredients we can find use our food data; the rest share whatever the recipe's own
 * nutrition leaves over, so the total still matches the recipe.
 */
export async function recipeItems(r: Recipe, servingsEaten: number, lang: Lang): Promise<FoodItem[]> {
  const share = servingsEaten / (r.servings || 1)
  if (!r.ingredients.length) return [{ id: uid(), name: r.title, amount: servingsEaten, unit: 'serving', per: r.nutrition }]
  const english = recipeLang(r) === 'en' ? null : r.tr?.en?.ingredients
  await prefetchFoods([...r.ingredients.map((i) => i.name), ...(english ?? [])])
  const rows = await Promise.all(r.ingredients.map(async (ing, n) => {
    const grams = Math.max(0, ingredientGrams(ing) * share)
    const hit = (await bestFood(english?.[n] ?? ing.name, lang, true, true)) ?? (english ? await bestFood(ing.name, lang, true, true) : null)
    return { ing, grams, hit }
  }))
  const target = { ...ZERO }
  for (const k of Object.keys(ZERO) as (keyof Macros)[]) target[k] = (r.nutrition[k] || 0) * servingsEaten
  const matched = { ...ZERO }
  for (const { grams, hit } of rows) if (hit) for (const k of Object.keys(ZERO) as (keyof Macros)[]) matched[k] += (hit.per[k] * grams) / 100
  const unmatched = rows.filter((x) => !x.hit && x.grams > 0)
  const unmatchedGrams = unmatched.reduce((a, x) => a + x.grams, 0)
  const left = { ...ZERO }
  for (const k of Object.keys(ZERO) as (keyof Macros)[]) left[k] = Math.max(0, target[k] - matched[k])
  return rows.filter((x) => x.grams > 0).map(({ ing, grams, hit }) => {
    const g = Math.round(grams)
    if (hit) return { id: uid(), name: ing.name, amount: Math.max(1, g), unit: 'g' as const, per: hit.per, src: 'uk' }
    const portion = unmatchedGrams > 0 ? grams / unmatchedGrams : 0
    const mine = { ...ZERO }
    for (const k of Object.keys(ZERO) as (keyof Macros)[]) mine[k] = left[k] * portion
    return { id: uid(), name: ing.name, amount: Math.max(1, g), unit: 'g' as const, per: per100(mine, Math.max(1, g)), src: 'recipe' }
  })
}

/** Swap AI-estimated figures for our food data wherever we can find the food. */
export async function checkAgainstFoodData(items: (FoodItem & { search?: string })[], lang: Lang): Promise<FoodItem[]> {
  await prefetchFoods(items.flatMap((i) => [i.name, i.search ?? '']))
  return Promise.all(items.map(async ({ search, ...i }) => {
    const hit = (await savedFood(i.name)) ?? (search ? await bestFood(search, lang) : null) ?? (lang === 'en' ? await bestFood(i.name, lang) : null)
    if (hit) return { ...i, per: hit.per, src: 'uk' }
    rememberFood({ name: search || i.name, per: i.per, portion: i.amount, source: 'ai' }, lang)
    return { ...i, src: 'ai' }
  }))
}

/** Nutrition per serving for a recipe, from our food data. Ingredients we can't find are left out. */
export async function recipeNutrition(ings: Ingredient[], servings: number, lang: Lang): Promise<{ per: Macros; found: number; estimated: number }> {
  const total = { ...ZERO }
  const add = (per: Macros, g: number) => { for (const k of Object.keys(ZERO) as (keyof Macros)[]) total[k] += ((per[k] || 0) * g) / 100 }
  await prefetchFoods(ings.map((i) => i.name))
  let found = 0
  const missing: Ingredient[] = []
  for (const ing of ings) {
    const hit = await bestFood(ing.name, lang, true, true)
    if (!hit) { missing.push(ing); continue }
    found++
    add(hit.per, ingredientGrams(ing))
  }
  // Whatever our data doesn't know, the AI estimates, and we keep its answer so it's only asked once.
  let estimated = 0
  if (missing.length) {
    const list = missing.map((i) => [i.amount !== null ? `${i.amount}${i.unit ? ' ' + i.unit : ''}` : '', i.name].filter(Boolean).join(' ')).join('\n')
    const { data } = await scanMealText(`These are ingredients for a whole recipe (not one portion). Use exactly these amounts:\n${list}`, lang)
    for (const it of data?.meal.items ?? []) {
      add(it.per100, it.grams)
      rememberFood({ name: it.search || it.name, per: it.per100, portion: it.grams, source: 'ai' }, lang)
    }
    if (data) estimated = missing.length
  }
  const per = { ...ZERO }
  for (const k of Object.keys(ZERO) as (keyof Macros)[]) per[k] = Math.round(total[k] / (servings || 1))
  return { per, found, estimated }
}
