import { supabase } from './supabase'
import type { Macros } from '../types'

/** AI features run as Supabase Edge Functions (supabase/functions). They need ai.sql and an Anthropic API key. */

export type RecipeDraft = {
  title: string; category: 'breakfast' | 'lunch' | 'dinner' | 'snack'; servings: number; minutes?: number
  ingredients: string[]; equipment: string[]; steps: string[]; nutrition: Macros; photo?: string; source?: string
}
export type ScannedItem = { name: string; grams: number; per100: Macros }
export type AiError = 'not_set_up' | 'daily_limit' | 'no_recipe' | 'no_food' | 'page_unreachable' | 'offline' | 'failed' | 'signed_out'

async function call<T>(fn: string, body: object): Promise<{ data?: T; error?: AiError }> {
  if (!navigator.onLine) return { error: 'offline' }
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (!error) return { data: data as T }
  // Function not deployed yet -> 404 with no JSON body
  const ctx = (error as { context?: Response }).context
  // Not deployed: the browser blocks the 404 (no CORS headers), so there's no Response at all
  if (!(ctx instanceof Response) || ctx.status === 404) return { error: 'not_set_up' }
  try {
    const b = await ctx.json()
    if (typeof b?.error === 'string') return { error: b.error as AiError }
  } catch { /* not JSON */ }
  return { error: 'failed' }
}

export const importRecipe = (input: { url?: string; image?: string; text?: string }, lang: string) =>
  call<{ recipe: RecipeDraft }>('import-recipe', { ...input, lang })

export const scanMeal = (image: string, lang: string) =>
  call<{ meal: { name: string; items: ScannedItem[] } }>('scan-meal', { image, lang })

export const scanMealText = (text: string, lang: string) =>
  call<{ meal: { name: string; items: ScannedItem[] } }>('scan-meal', { text, lang })
