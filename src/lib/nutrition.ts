import type { FoodItem, Macros, Profile } from '../types'
import { ZERO } from '../types'

const ACTIVITY = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }

/** Daily targets from body details (Mifflin-St Jeor), rounded to friendly numbers. */
export function calcTargets(p: Profile): Macros {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  let kcal = bmr * ACTIVITY[p.activity]
  if (p.goal === 'lose') kcal -= 400
  if (p.goal === 'gain') kcal += 300
  kcal = Math.max(p.sex === 'male' ? 1500 : 1200, Math.round(kcal / 10) * 10)
  const protein = Math.round(p.weightKg * (p.goal === 'maintain' ? 1.6 : 1.8))
  const fat = Math.round((kcal * 0.28) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat, fibre: p.sex === 'male' ? 30 : 25, sugar: Math.round((kcal * 0.1) / 4) }
}

export function add(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat, fibre: a.fibre + b.fibre, sugar: a.sugar + b.sugar }
}
export function scale(m: Macros, f: number): Macros {
  return { kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f, fibre: m.fibre * f, sugar: m.sugar * f }
}
export function itemMacros(i: FoodItem): Macros {
  return scale(i.per, i.unit === 'g' ? i.amount / 100 : i.amount)
}
export function sumItems(items: FoodItem[]): Macros {
  return items.reduce((acc, i) => add(acc, itemMacros(i)), { ...ZERO })
}
export const r0 = (n: number) => Math.round(n)
