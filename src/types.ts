export type Lang = 'en' | 'pl'
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number }
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 }

export type Sex = 'female' | 'male'
export type Activity = 'low' | 'light' | 'moderate' | 'high'
export type Goal = 'lose' | 'maintain' | 'gain'

export type Profile = {
  name: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  goal: Goal
  /** First-use tips this person has already seen (travels with their account) */
  tips?: string[]
}

export type Ingredient = { id: string; amount: number | null; unit: string; name: string }

export type Recipe = {
  id: string
  title: string
  category: Meal
  servings: number
  minutes?: number
  photo?: string
  source?: string
  favourite: boolean
  ingredients: Ingredient[]
  equipment: string[]
  steps: string[]
  nutrition: Macros // per serving
  createdAt: number
  /** Set when the recipe belongs to a linked family member (not stored in the cloud copy). */
  ownerId?: string
  /** Language the recipe was written in. Older recipes don't have it, so it's guessed. */
  lang?: Lang
  /** Translations, line for line with the original. Dropped whenever the recipe is edited. */
  tr?: Partial<Record<Lang, RecipeText>>
}

export type RecipeText = { title: string; ingredients: string[]; steps: string[]; equipment: string[] }

/** A food in a logged meal. `per` is per 100g when unit is 'g', or per 1 serving when unit is 'serving'. */
export type FoodItem = { id: string; name: string; amount: number; unit: 'g' | 'serving'; per: Macros }

export type LogEntry = {
  id: string
  date: string // YYYY-MM-DD
  meal: Meal
  name: string
  photo?: string
  recipeId?: string
  items: FoodItem[]
  createdAt: number
}

export type PlanItem = {
  id: string
  date: string
  meal: Meal
  recipeId: string
  servings: number
  leftoverOf?: string
}

export type ShoppingExtra = { id: string; name: string; amount: string }

export type ShoppingState = {
  ticked: Record<string, boolean>
  extras: ShoppingExtra[]
  staples: string[]
  staplesAsked: boolean
  out: string[]
  lastBought: Record<string, string> // key -> YYYY-MM-DD
}

export type WeightEntry = { date: string; kg: number }
