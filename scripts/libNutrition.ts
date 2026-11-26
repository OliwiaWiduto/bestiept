// Works out a Bestie pick's nutrition per serving from its ingredients with our food data (no network).
import fs from 'fs'
import { COMMON } from '../src/lib/commonFoods'
import { parseIngredient } from '../src/lib/util'
import { ingredientGrams } from '../src/lib/grams'
import type { LibRecipe } from '../src/lib/library'
import type { Lang, Macros } from '../src/types'

const d = JSON.parse(fs.readFileSync(new URL('../public/cofid.json', import.meta.url), 'utf8'))
const byName = new Map<string, number[]>((d.foods as any[]).map((r) => [r[0], r.slice(1)]))
const K = ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar'] as const

export function per100(name: string): number[] | null {
  const row = COMMON.find(([re]) => re.test(name.toLowerCase()))
  if (!row) return null
  return typeof row[1] === 'string' ? byName.get(row[1]) ?? null : row[1]
}

export function libNutrition(l: LibRecipe, lang: Lang): { per: Macros; missing: string[] } {
  const total = [0, 0, 0, 0, 0, 0]
  const missing: string[] = []
  for (const line of l[lang].ingredients) {
    const ing = parseIngredient(line)
    const p = per100(ing.name)
    if (!p) { missing.push(line); continue }
    const g = ingredientGrams(ing)
    p.forEach((v, i) => (total[i] += ((v || 0) * g) / 100))
  }
  const per = Object.fromEntries(K.map((k, i) => [k, Math.round(total[i] / l.servings)])) as Macros
  return { per, missing }
}
