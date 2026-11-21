import type { Ingredient } from '../types'
import { parseIngredient } from './util'

const PIECE: [RegExp, number][] = [
  [/aubergine|eggplant|bakłażan/, 300], [/egg|jajk|jaj/, 50], [/spring onion|scallion|dymk/, 15], [/onion|cebul/, 150], [/shallot|szalotk/, 30], [/garlic|czosn/, 5], [/lemongrass|trawa cytrynowa/, 20], [/lemon|cytryn/, 100], [/lime|limonk/, 70],
  [/sweet potato|batat/, 200], [/potato|ziemniak/, 170], [/carrot|marchew/, 80], [/cherry tomato|pomidork/, 15], [/tomato|pomidor/, 85], [/banana|banan/, 120], [/apple|jabłk/, 150],
  [/chilli|chili|papryczk|jalape/, 15], [/pepper|papryk/, 160], [/courgette|zucchini|cukini/, 200], [/avocado|awokado/, 150], [/chicken breast|pierś/, 150], [/chicken thigh|udk/, 120], [/tortilla|wrap/, 60],
  [/slice|kromk|plast/, 30], [/bagel|bun|bułk/, 85], [/pitta|pita/, 60], [/cucumber|ogór/, 300], [/salmon|łosoś/, 120], [/stock cube|kostk/, 10],
]
// A cup weighs very different amounts: liquids ~240g, flour ~125g, leaves ~30g.
const CUP: [RegExp, number][] = [
  [/flour|mąk|cocoa|kakao|icing|powdered sugar|cukier puder/, 125], [/oat|płatk|granola|cereal/, 90], [/brown sugar|cukier brązowy/, 220], [/sugar|cukier|cukru/, 200],
  [/rice|ryż|quinoa|komos|couscous|kuskus|lentil|soczewic/, 185], [/pasta|makaron|orzo/, 100], [/spinach|szpinak|rocket|rukol|lettuce|sałat|kale|jarmuż|basil|bazyl|coriander|kolendr|parsley|pietruszk|herbs|zioł/, 30],
  [/cheese|ser\b|parmesan|parmezan|cheddar|mozzarell/, 100], [/nuts|orzech|almond|migdał|cashew|nerkow|walnut|peanut|seeds|nasion|pestk/, 140], [/chocolate chip|czekolad/, 170],
  [/berr|borówk|truskaw|malin|jagod|grape|winogr/, 150], [/peas|groszek|sweetcorn|corn\b|kukurydz|edamame/, 145], [/butter|masło|masła/, 227], [/honey|miód|miodu|syrup|syrop/, 340],
  [/oil|olej|oliw/, 218], [/yog|jogurt|cream|śmietan/, 240], [/chopped|diced|sliced|onion|cebul|carrot|marchew|pepper|papryk|mushroom|pieczark|broccoli|brokuł|tomato|pomidor/, 150],
]
const UNIT_G: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 240, cups: 240, oz: 28.35, lb: 453.6, stick: 113, sticks: 113, bunch: 30, sprig: 1, sprigs: 1, dash: 1, splash: 10, knob: 15, tin: 400, tins: 400, can: 400, cans: 400, clove: 5, cloves: 5, pinch: 0.5, handful: 30,
  'łyżeczka': 5, 'łyżeczki': 5, 'łyżecz.': 5, 'łyżka': 15, 'łyżki': 15, 'łyż.': 15, 'szklanka': 240, 'szkl.': 240, 'puszka': 400, 'puszki': 400, 'pusz.': 400, 'ząbek': 5, 'ząbki': 5, 'ząb.': 5, 'szczypta': 0.5, 'garść': 30 }

/** How many grams an ingredient line is, roughly. */
export function ingredientGrams(i: Ingredient): number {
  // Recipes saved before we knew a unit ("2 tablespoons olive oil" kept as 2 × "tablespoons olive oil") are read again.
  if (!i.unit && i.amount !== null) { const again = parseIngredient(`${i.amount} ${i.name}`); if (again.unit) i = { ...i, unit: again.unit, amount: again.amount, name: again.name } }
  const unit = i.unit.toLowerCase()
  if (i.amount === null) return /salt|sól|pepper|pieprz|spice|przypraw|herb|zioł/i.test(i.name) ? 1 : 10
  const n = i.name.toLowerCase()
  if (/^(cups?|szklank[ai]|szkl\.)$/.test(unit)) return i.amount * (CUP.find(([re]) => re.test(n))?.[1] ?? 240)
  if (UNIT_G[unit]) return i.amount * UNIT_G[unit]
  return i.amount * (PIECE.find(([re]) => re.test(n))?.[1] ?? 100)
}

