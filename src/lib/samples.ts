import type { Lang, Recipe } from '../types'
import { parseIngredient, uid } from './util'

type Sample = Omit<Recipe, 'id' | 'createdAt' | 'ingredients'> & { ingredients: string[] }

const EN: Sample[] = [
  {
    title: 'Creamy tomato orzo', category: 'dinner', servings: 4, minutes: 25, favourite: true,
    ingredients: ['1 tbsp olive oil', '1 onion, finely chopped', '2 garlic cloves, crushed', '400g chopped tomatoes', '200g orzo', '600ml veg stock', '50g cream cheese', '60g spinach', '30g parmesan, grated'],
    equipment: ['Large pan', 'Wooden spoon', 'Grater'],
    steps: [
      'Heat the oil in a large pan. Cook the onion for 5 minutes until soft.',
      'Add the garlic and cook for 1 minute, then tip in the chopped tomatoes.',
      'Stir in the orzo and veg stock. Simmer for 10 minutes, stirring now and then, until the orzo is soft.',
      'Stir through the cream cheese until melted.',
      'Add the spinach and stir until it wilts.',
      'Take off the heat and stir in most of the parmesan.',
      'Taste and season with salt and pepper.',
      'Serve topped with the rest of the parmesan.',
    ],
    nutrition: { kcal: 380, protein: 13, carbs: 56, fat: 11, fibre: 5, sugar: 8 },
  },
  {
    title: 'Overnight oats with berries', category: 'breakfast', servings: 1, minutes: 5, favourite: false,
    ingredients: ['40g porridge oats', '100ml oat drink', '100g greek yoghurt', '80g blueberries', '1 tsp honey'],
    equipment: ['Jar with a lid'],
    steps: ['Stir the oats, oat drink and yoghurt together in a jar.', 'Cover and leave in the fridge overnight.', 'In the morning, top with the berries and honey.'],
    nutrition: { kcal: 420, protein: 18, carbs: 60, fat: 11, fibre: 7, sugar: 22 },
  },
  {
    title: 'Salmon poke bowl', category: 'lunch', servings: 2, minutes: 20, favourite: true,
    ingredients: ['180g sushi rice', '240g salmon fillets', '1 avocado', '80g edamame', '1 cucumber', '2 tbsp soy sauce', '1 tsp sesame oil'],
    equipment: ['Saucepan', 'Sharp knife'],
    steps: ['Cook the rice following the packet instructions, about 15 minutes.', 'Slice the salmon, avocado and cucumber.', 'Mix the soy sauce and sesame oil.', 'Pile the rice into bowls, add the toppings and drizzle with the dressing.'],
    nutrition: { kcal: 640, protein: 34, carbs: 66, fat: 26, fibre: 7, sugar: 6 },
  },
]

const PL: Sample[] = [
  {
    title: 'Kremowe orzo pomidorowe', category: 'dinner', servings: 4, minutes: 25, favourite: true,
    ingredients: ['1 łyżka oliwy', '1 cebula, drobno posiekana', '2 ząbki czosnku, przeciśnięte', '400g pomidorów z puszki', '200g makaronu orzo', '600ml bulionu warzywnego', '50g serka śmietankowego', '60g szpinaku', '30g parmezanu, startego'],
    equipment: ['Duży garnek', 'Drewniana łyżka', 'Tarka'],
    steps: [
      'Rozgrzej oliwę w dużym garnku. Smaż cebulę przez 5 minut, aż zmięknie.',
      'Dodaj czosnek i smaż 1 minutę, potem wlej pomidory.',
      'Wsyp orzo i wlej bulion. Gotuj na małym ogniu 10 minut, od czasu do czasu mieszając, aż orzo zmięknie.',
      'Wmieszaj serek, aż się rozpuści.',
      'Dodaj szpinak i mieszaj, aż zwiędnie.',
      'Zdejmij z ognia i wmieszaj większość parmezanu.',
      'Dopraw solą i pieprzem.',
      'Podawaj posypane resztą parmezanu.',
    ],
    nutrition: { kcal: 380, protein: 13, carbs: 56, fat: 11, fibre: 5, sugar: 8 },
  },
  {
    title: 'Owsianka na noc z owocami', category: 'breakfast', servings: 1, minutes: 5, favourite: false,
    ingredients: ['40g płatków owsianych', '100ml napoju owsianego', '100g jogurtu greckiego', '80g borówek', '1 łyżeczka miodu'],
    equipment: ['Słoik z pokrywką'],
    steps: ['Wymieszaj płatki, napój owsiany i jogurt w słoiku.', 'Przykryj i odstaw do lodówki na noc.', 'Rano dodaj borówki i miód.'],
    nutrition: { kcal: 420, protein: 18, carbs: 60, fat: 11, fibre: 7, sugar: 22 },
  },
  {
    title: 'Poke bowl z łososiem', category: 'lunch', servings: 2, minutes: 20, favourite: true,
    ingredients: ['180g ryżu do sushi', '240g filetów z łososia', '1 awokado', '80g edamame', '1 ogórek', '2 łyżki sosu sojowego', '1 łyżeczka oleju sezamowego'],
    equipment: ['Rondel', 'Ostry nóż'],
    steps: ['Ugotuj ryż według instrukcji na opakowaniu, około 15 minut.', 'Pokrój łososia, awokado i ogórka.', 'Wymieszaj sos sojowy z olejem sezamowym.', 'Włóż ryż do misek, dodaj dodatki i polej sosem.'],
    nutrition: { kcal: 640, protein: 34, carbs: 66, fat: 26, fibre: 7, sugar: 6 },
  },
]

const asText = (s: Sample) => ({ title: s.title, ingredients: s.ingredients.map((l) => parseIngredient(l).name), steps: s.steps, equipment: s.equipment })

export function sampleRecipes(lang: Lang): Recipe[] {
  const other: Lang = lang === 'pl' ? 'en' : 'pl'
  const mine = lang === 'pl' ? PL : EN
  const theirs = lang === 'pl' ? EN : PL
  return mine.map((s, i) => ({
    ...s,
    id: uid(),
    createdAt: Date.now() - i * 1000,
    ingredients: s.ingredients.map(parseIngredient),
    lang,
    tr: theirs[i] ? { [other]: asText(theirs[i]) } : undefined,
  }))
}

/** Our sample recipes in the other language, found by title (for accounts made before translations were stored). */
export function sampleText(title: string, lang: Lang): ReturnType<typeof asText> | undefined {
  const t = title.trim().toLowerCase()
  const i = EN.findIndex((s) => s.title.toLowerCase() === t)
  const j = PL.findIndex((s) => s.title.toLowerCase() === t)
  const k = i >= 0 ? i : j
  if (k < 0) return undefined
  const s = (lang === 'pl' ? PL : EN)[k]
  return s ? asText(s) : undefined
}

/** Our starter recipes she no longer has (in either language), ready to add back. */
export function missingSamples(have: { title: string }[], lang: Lang): Recipe[] {
  const titles = new Set(have.map((r) => r.title.trim().toLowerCase()))
  const all = sampleRecipes(lang)
  return all.filter((_, i) => !titles.has(EN[i]?.title.toLowerCase() ?? '') && !titles.has(PL[i]?.title.toLowerCase() ?? ''))
}
