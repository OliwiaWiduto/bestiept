import type { Macros } from '../types'

/**
 * A starter list of common foods, per 100g. Values are approximate typical figures.
 * Phase 2 replaces this with CoFID (generic foods) and Open Food Facts (branded/barcodes).
 */
export type Food = { en: string; pl: string; per: Macros; portion: number }
const f = (en: string, pl: string, kcal: number, protein: number, carbs: number, fat: number, fibre: number, sugar: number, portion: number): Food =>
  ({ en, pl, per: { kcal, protein, carbs, fat, fibre, sugar }, portion })

export const FOODS: Food[] = [
  f('Apple', 'Jabłko', 52, 0.3, 14, 0.2, 2.4, 10, 150),
  f('Banana', 'Banan', 89, 1.1, 23, 0.3, 2.6, 12, 120),
  f('Strawberries', 'Truskawki', 32, 0.7, 7.7, 0.3, 2, 4.9, 100),
  f('Blueberries', 'Borówki', 57, 0.7, 14, 0.3, 2.4, 10, 80),
  f('Orange', 'Pomarańcza', 47, 0.9, 12, 0.1, 2.4, 9, 160),
  f('Avocado', 'Awokado', 160, 2, 8.5, 15, 6.7, 0.7, 70),
  f('Broccoli', 'Brokuły', 34, 2.8, 7, 0.4, 2.6, 1.7, 90),
  f('Carrot', 'Marchew', 41, 0.9, 10, 0.2, 2.8, 4.7, 80),
  f('Cucumber', 'Ogórek', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 80),
  f('Tomato', 'Pomidor', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 90),
  f('Spinach', 'Szpinak', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 60),
  f('Sweet potato, baked', 'Batat pieczony', 90, 2, 21, 0.2, 3.3, 6.5, 150),
  f('Potato, boiled', 'Ziemniaki gotowane', 87, 1.9, 20, 0.1, 1.8, 0.9, 175),
  f('White rice, cooked', 'Ryż biały gotowany', 130, 2.7, 28, 0.3, 0.4, 0.1, 180),
  f('Brown rice, cooked', 'Ryż brązowy gotowany', 123, 2.7, 26, 1, 1.6, 0.4, 180),
  f('Pasta, cooked', 'Makaron gotowany', 158, 5.8, 31, 0.9, 1.8, 0.6, 200),
  f('Porridge oats', 'Płatki owsiane', 379, 13, 68, 6.5, 10, 1, 40),
  f('Wholemeal bread', 'Chleb pełnoziarnisty', 247, 13, 41, 3.4, 7, 6, 40),
  f('White bread', 'Chleb biały', 265, 9, 49, 3.2, 2.7, 5, 40),
  f('Egg', 'Jajko', 143, 13, 0.7, 9.5, 0, 0.4, 50),
  f('Chicken breast, cooked', 'Pierś z kurczaka gotowana', 165, 31, 0, 3.6, 0, 0, 120),
  f('Salmon, cooked', 'Łosoś gotowany', 206, 22, 0, 13, 0, 0, 120),
  f('Tuna, tinned in water', 'Tuńczyk w wodzie', 116, 26, 0, 1, 0, 0, 100),
  f('Beef mince 5% fat, cooked', 'Mielona wołowina 5%, gotowana', 175, 26, 0, 8, 0, 0, 125),
  f('Tofu', 'Tofu', 144, 15, 3, 8.7, 2.3, 0.6, 100),
  f('Greek yoghurt 0%', 'Jogurt grecki 0%', 59, 10, 3.6, 0.4, 0, 3.2, 150),
  f('Greek yoghurt, full fat', 'Jogurt grecki pełnotłusty', 133, 5.7, 4.5, 10, 0, 4.5, 150),
  f('Milk, semi-skimmed', 'Mleko 2%', 47, 3.5, 4.8, 1.7, 0, 4.8, 200),
  f('Oat drink', 'Napój owsiany', 46, 1, 6.7, 1.5, 0.8, 4, 200),
  f('Cheddar', 'Ser cheddar', 403, 25, 1.3, 33, 0, 0.5, 30),
  f('Feta', 'Feta', 264, 14, 4, 21, 0, 4, 30),
  f('Cottage cheese', 'Serek wiejski', 98, 11, 3.4, 4.3, 0, 2.7, 100),
  f('Peanut butter', 'Masło orzechowe', 588, 25, 20, 50, 6, 9, 15),
  f('Almonds', 'Migdały', 579, 21, 22, 50, 12.5, 4.4, 25),
  f('Hummus', 'Hummus', 166, 7.9, 14, 9.6, 6, 0.3, 50),
  f('Olive oil', 'Oliwa z oliwek', 884, 0, 0, 100, 0, 0, 10),
  f('Butter', 'Masło', 717, 0.9, 0.1, 81, 0, 0.1, 10),
  f('Chickpeas, tinned', 'Ciecierzyca z puszki', 139, 7, 18, 2.9, 7.6, 0.8, 120),
  f('Lentils, cooked', 'Soczewica gotowana', 116, 9, 20, 0.4, 7.9, 1.8, 150),
  f('Dark chocolate 70%', 'Gorzka czekolada 70%', 598, 7.8, 46, 43, 11, 24, 20),
  f('Protein bar', 'Baton proteinowy', 380, 33, 37, 12, 6, 4, 60),
  f('Croissant', 'Croissant', 406, 8.2, 46, 21, 2.6, 11, 60),
  f('Granola', 'Granola', 471, 10, 64, 20, 7, 20, 45),
  f('Honey', 'Miód', 304, 0.3, 82, 0, 0.2, 82, 15),
  f('Latte, semi-skimmed', 'Latte na mleku 2%', 42, 2.9, 4.2, 1.5, 0, 4.2, 350),
]
