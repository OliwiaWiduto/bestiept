// Looks foods up in our food data (starter list + the UK CoFID table) so logged macros
// come from real figures rather than guesses, and turns recipe ingredients into loggable items.
import type { FoodItem, Ingredient, Lang, Macros, Recipe } from '../types'
import { FOODS } from './foods'
import { loadUkFoods, type FoodHit } from './foodSearch'
import { recipeLang } from './recipeLang'
import { uid } from './util'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const FILLER = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'big', 'ripe', 'whole', 'extra', 'virgin', 'finely', 'roughly', 'thinly', 'chopped', 'grated', 'sliced', 'diced', 'crushed', 'minced', 'peeled', 'halved', 'of', 'a', 'an', 'the', 'and', 'with', 'some', 'little', 'bit', 'handful', 'pinch', 'good', 'quality', 'to', 'taste', 'optional', 'heaped', 'level'])
const ALIASES: Record<string, string> = { hummus: 'houmous', zucchini: 'courgette', eggplant: 'aubergine', cilantro: 'coriander', yoghurt: 'yogurt', fries: 'chips', mayo: 'mayonnaise', scallion: 'spring', scallions: 'spring' }

function tokensOf(name: string): string[] {
  const main = norm(name).split(/[,(;]/)[0]
  return main.split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !FILLER.has(w)).map((w) => ALIASES[w] ?? w)
}

function fits(foodName: string, tokens: string[]): number | null {
  const n = norm(foodName)
  const words = n.split(/[^a-z0-9]+/).filter(Boolean)
  for (const tk of tokens) {
    const stem = tk.length > 4 && tk.endsWith('s') ? tk.slice(0, -1) : tk
    if (!words.some((w) => w.startsWith(stem))) return null
  }
  const first = n.split(',')[0]
  let s = 0
  if (first.startsWith(tokens[0])) s += 40
  if (/\braw\b|\bboiled\b|\bplain\b/.test(n)) s += 4
  if (/\bdried\b|\bpowder\b|\bcanned in syrup\b|\bfried in\b/.test(n)) s -= 6
  return s - n.split(',').length * 3 - n.length / 20
}

/** Best food for a name, or null when nothing fits well enough to trust. */
export async function bestFood(name: string, lang: Lang): Promise<FoodHit | null> {
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
    if (ranked.length) return ranked[0][1]
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
  const rows = await Promise.all(r.ingredients.map(async (ing, n) => {
    const grams = Math.max(0, ingredientGrams(ing) * share)
    const hit = (await bestFood(english?.[n] ?? ing.name, lang)) ?? (english ? await bestFood(ing.name, lang) : null)
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
  return Promise.all(items.map(async ({ search, ...i }) => {
    const hit = (search ? await bestFood(search, lang) : null) ?? (lang === 'en' ? await bestFood(i.name, lang) : null)
    return hit ? { ...i, per: hit.per, src: 'uk' } : { ...i, src: 'ai' }
  }))
}

/** Nutrition per serving for a recipe, from our food data. Ingredients we can't find are left out. */
export async function recipeNutrition(ings: Ingredient[], servings: number, lang: Lang): Promise<{ per: Macros; found: number }> {
  const total = { ...ZERO }
  let found = 0
  for (const ing of ings) {
    const hit = await bestFood(ing.name, lang)
    if (!hit) continue
    found++
    const g = ingredientGrams(ing)
    for (const k of Object.keys(ZERO) as (keyof Macros)[]) total[k] += (hit.per[k] * g) / 100
  }
  const per = { ...ZERO }
  for (const k of Object.keys(ZERO) as (keyof Macros)[]) per[k] = Math.round(total[k] / (servings || 1))
  return { per, found }
}
