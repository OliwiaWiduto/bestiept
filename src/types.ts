export type Lang = 'en' | 'pl'
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number }
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 }

export type Sex = 'female' | 'male'
export type Activity = 'low' | 'light' | 'moderate' | 'high'
/** build: body recomposition, i.e. build muscle at about the same weight */
export type Goal = 'lose' | 'maintain' | 'gain' | 'build'

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
  /** Chosen profile picture, e.g. 'strawberry' */
  avatar?: string
  /** How many people she usually cooks for (plans and leftovers use it) */
  household?: number
  /** The weight she's aiming for (lose or gain goals) */
  goalWeightKg?: number
  /** How fast: slower (300 kcal under maintenance, or 5% over) or faster (500 under, or 10% over) */
  pace?: Pace
  /** Build muscle: does she do strength training? */
  strength?: boolean
  /** Healthy choices tips: off switch, today's tip hidden, swaps she said no to (id → date), and the week recap she's opened (that Sunday) */
  /** Sounds when logging food and hitting goals. Unset = on. */
  sounds?: boolean
  nudges?: { off?: boolean; hiddenOn?: string; dismissed?: Record<string, string>; weekSeen?: string }
}
export type Pace = 'slower' | 'faster'

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
  /** Set on her copy of one of our Bestie picks (the library recipe's id) */
  libId?: string
  /** Minutes she's actually busy (Bestie picks), when the total includes oven or fridge time */
  handsOn?: number
  /** Translations, line for line with the original. Dropped whenever the recipe is edited. */
  tr?: Partial<Record<Lang, RecipeText>>
}

export type RecipeText = { title: string; ingredients: string[]; steps: string[]; equipment: string[] }

/** A food in a logged meal. `per` is per 100g when unit is 'g', or per 1 serving when unit is 'serving'. */
/** src: where the figures came from: 'uk' food data, the 'recipe' itself, or an 'ai' estimate */
export type FoodItem = { id: string; name: string; amount: number; unit: 'g' | 'serving'; per: Macros; src?: string }

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
  /** Set when the meal is in the plan of the person I plan and shop with (not stored) */
  ownerId?: string
}

/** Something typed onto the list by hand. tr: the name in each app language, filled in for whoever reads it. */
export type ShoppingExtra = { id: string; name: string; amount: string; tr?: Partial<Record<'en' | 'pl', string>> }

export type ShoppingState = {
  ticked: Record<string, boolean>
  extras: ShoppingExtra[]
  staples: string[]
  staplesAsked: boolean
  out: string[]
  lastBought: Record<string, string> // key -> YYYY-MM-DD
  /** Planned items she deleted from the list text, as week:key */
  hidden?: string[]
  /** True while she's in the shop working through the list */
  shoppingMode?: boolean
  /** Only shop for these planned meals (plan item ids); not set = every meal. Kept on this phone only. */
  onlyFor?: string[]
}

export type WeightEntry = { date: string; kg: number }
