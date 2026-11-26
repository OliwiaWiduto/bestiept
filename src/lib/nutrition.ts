import type { FoodItem, Macros, Profile } from '../types'
import { ZERO } from '../types'

const ACTIVITY = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }

/** Calories that keep her weight the same: Mifflin-St Jeor BMR × activity. */
export function maintenance(p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex' | 'activity'>): number {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  return Math.round((bmr * ACTIVITY[p.activity]) / 10) * 10
}

/** The daily calorie target. Losing (NHS): slower 300 under maintenance, faster 500 under. Gaining: 5% or 10% over. Never under 1,200 (women) / 1,500 (men). */
export function calorieTarget(p: Profile): number {
  const m = maintenance(p)
  const pace = p.pace ?? 'slower'
  let kcal = m
  if (p.goal === 'lose') kcal = m - (pace === 'faster' ? 500 : 300)
  if (p.goal === 'gain') kcal = m * (pace === 'faster' ? 1.1 : 1.05)
  return Math.max(p.sex === 'male' ? 1500 : 1200, Math.round(kcal / 10) * 10)
}

/** The range shown on Today. Losing: slower 300–500 under maintenance, faster 500–600 under (the target is the top). Keeping: ±5%. Gaining: from the target up 5%. */
export function calorieZone(kcal: number, goal: Profile['goal'], pace?: Profile['pace']): [number, number] {
  if (goal === 'lose') return [kcal - (pace === 'faster' ? 100 : 200), kcal]
  if (goal === 'gain') return [kcal, Math.round((kcal * 1.05) / 10) * 10]
  return [Math.round((kcal * 0.95) / 10) * 10, Math.round((kcal * 1.05) / 10) * 10]
}

/** Weeks to reach the goal weight at the daily target (7,700 kcal ≈ 1 kg). null when there's no goal or no change. */
export function weeksToGoal(p: Profile): number | null {
  if (p.goal === 'maintain' || !p.goalWeightKg) return null
  const kg = p.goal === 'lose' ? p.weightKg - p.goalWeightKg : p.goalWeightKg - p.weightKg
  const perDay = Math.abs(calorieTarget(p) - maintenance(p))
  if (kg <= 0 || perDay < 50) return null
  return Math.ceil((kg * 7700) / (perDay * 7))
}

/** A sensible starting goal weight: losing, to the top of a healthy BMI (or 10% off, whichever is less); gaining, 3 kg more. */
export function suggestedGoalWeight(p: Profile): number {
  const h = p.heightCm / 100
  const r = (n: number) => Math.round(n * 2) / 2
  if (p.goal === 'gain') return r(p.weightKg + 3)
  const healthyTop = 24.9 * h * h
  const target = p.weightKg > healthyTop ? Math.max(healthyTop, p.weightKg * 0.9) : p.weightKg - 3
  return r(Math.max(target, lowestHealthy(p)))
}
/** The weight at a BMI of 18.5: we don't suggest or accept a goal below it. */
export const lowestHealthy = (p: Pick<Profile, 'heightCm'>) => Math.ceil(18.5 * (p.heightCm / 100) ** 2 * 2) / 2

/** Daily targets from body details, rounded to friendly numbers. */
export function calcTargets(p: Profile): Macros {
  const kcal = calorieTarget(p)
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
