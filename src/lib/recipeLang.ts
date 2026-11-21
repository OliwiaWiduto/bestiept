import { useEffect, useMemo } from 'react'
import { useStore } from '../store'
import type { Lang, Recipe, RecipeText } from '../types'
import { sampleText } from './samples'
import { translateRecipe } from './ai'

const PL_HINT = /[ąćęłńóśźż]|\b(i|w|na|do|z|oraz|minut|łyżk|szklank|dodaj|wymieszaj|pokrój|gotuj)\b/i

/** The language a recipe is written in: stored, or guessed from its text. */
export function recipeLang(r: Recipe): Lang {
  if (r.lang) return r.lang
  const sample = [r.title, ...r.steps.slice(0, 3), ...r.ingredients.slice(0, 5).map((i) => i.name)].join(' ')
  const hits = (sample.match(new RegExp(PL_HINT.source, 'gi')) ?? []).length
  return hits >= 3 ? 'pl' : 'en'
}

const TO_PL: Record<string, string> = { tsp: 'łyżecz.', tbsp: 'łyż.', cup: 'szkl.', cups: 'szkl.', tin: 'pusz.', tins: 'pusz.', can: 'pusz.', cans: 'pusz.', clove: 'ząb.', cloves: 'ząb.', pinch: 'szczypta', handful: 'garść' }
const TO_EN: [RegExp, string][] = [[/^łyżecz/, 'tsp'], [/^łyż/, 'tbsp'], [/^szkl/, 'cup'], [/^pusz/, 'tin'], [/^ząb/, 'clove'], [/^szczypt/, 'pinch'], [/^garś/, 'handful']]
/** Kitchen units in the app's language (grams and millilitres stay as they are). */
export function unitFor(unit: string, lang: Lang): string {
  const u = unit.toLowerCase()
  if (lang === 'pl') return TO_PL[u] ?? unit
  return TO_EN.find(([re]) => re.test(u))?.[1] ?? unit
}

function textFor(r: Recipe, lang: Lang): RecipeText | undefined {
  // Our starter text is only a fallback for recipes that never had translations stored (an edited one has tr: {}).
  const t = r.tr ? r.tr[lang] : sampleText(r.title, lang)
  if (!t || t.ingredients.length !== r.ingredients.length || t.steps.length !== r.steps.length) return undefined
  return t
}

/** The recipe as it should read in this language (the original if there's no translation yet). */
export function localise(r: Recipe, lang: Lang): Recipe {
  if (recipeLang(r) === lang) return r
  const t = textFor(r, lang)
  const units = r.ingredients.map((i) => ({ ...i, unit: unitFor(i.unit, lang) }))
  if (!t) return { ...r, ingredients: units }
  return {
    ...r,
    title: t.title || r.title,
    ingredients: units.map((i, n) => ({ ...i, name: t.ingredients[n] || i.name })),
    steps: r.steps.map((s, n) => t.steps[n] || s),
    equipment: t.equipment.length === r.equipment.length ? t.equipment : r.equipment,
  }
}

/** All recipes, in the language the app is in. Use for showing, never for saving. */
export function useRecipes(): Recipe[] {
  const recipes = useStore((s) => s.recipes)
  const lang = useStore((s) => s.lang)
  return useMemo(() => recipes.map((r) => localise(r, lang)), [recipes, lang])
}

const tried = new Set<string>()
let running = false

/** Quietly translates recipes that aren't in the app's language yet, one at a time, and keeps the result. */
export function useRecipeTranslator() {
  const recipes = useStore((s) => s.recipes)
  const lang = useStore((s) => s.lang)
  useEffect(() => {
    if (running) return
    const todo = recipes.filter((r) => recipeLang(r) !== lang && !textFor(r, lang) && !tried.has(`${r.id}:${lang}`))
    if (!todo.length) return
    running = true
    ;(async () => {
      for (const r of todo) {
        if (useStore.getState().lang !== lang) break
        tried.add(`${r.id}:${lang}`)
        const { data, error } = await translateRecipe({ title: r.title, ingredients: r.ingredients.map((i) => i.name), steps: r.steps, equipment: r.equipment }, lang)
        if (!data) { if (error === 'not_set_up' || error === 'daily_limit' || error === 'signed_out' || error === 'offline') break; continue }
        const fresh = useStore.getState().recipes.find((x) => x.id === r.id)
        if (!fresh || fresh.title !== r.title || fresh.steps.length !== r.steps.length) continue
        useStore.getState().saveRecipe({ ...fresh, lang: fresh.lang ?? recipeLang(fresh), tr: { ...fresh.tr, [lang]: data.translation } })
      }
      running = false
    })()
  }, [recipes, lang])
}
