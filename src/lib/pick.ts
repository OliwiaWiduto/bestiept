import type { PlanItem, Recipe } from '../types'

/** Rough "how good for you" score per serving: more protein and fibre per calorie is better, very big portions lose points. */
export function healthScore(r: Recipe): number {
  const n = r.nutrition
  if (!n || !(n.kcal > 0)) return -1
  const proteinShare = (n.protein * 4) / n.kcal
  const fibrePer100 = (n.fibre / n.kcal) * 100
  return proteinShare * 100 + fibrePer100 * 6 - Math.max(0, n.kcal - 650) / 15
}

/** Recipes picked before but not in this week yet (latest first), then everything else, healthiest first. */
export function rankRecipes(recipes: Recipe[], plan: PlanItem[], weekDays: string[]) {
  const inWeek = new Set(plan.filter((p) => weekDays.includes(p.date)).map((p) => p.recipeId))
  const last = new Map<string, string>()
  for (const p of plan) if (!p.leftoverOf && !inWeek.has(p.recipeId) && (last.get(p.recipeId) ?? '') < p.date) last.set(p.recipeId, p.date)
  const recent = recipes.filter((r) => last.has(r.id)).sort((a, b) => (last.get(b.id)! < last.get(a.id)! ? -1 : 1)).slice(0, 6)
  const recentIds = new Set(recent.map((r) => r.id))
  const rest = recipes.filter((r) => !recentIds.has(r.id)).sort((a, b) => healthScore(b) - healthScore(a))
  return { recent, rest }
}
