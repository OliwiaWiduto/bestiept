import { useEffect, useMemo, useState } from 'react'
import type { Macros } from '../types'
import { FOODS } from './foods'
import { searchSavedFoods } from './foodDb'

/** One searchable food, per 100g. */
export type FoodHit = { key: string; name: string; per: Macros; portion: number; uk?: boolean }

type Row = [string, number, number, number, number, number, number]
let cache: FoodHit[] | null = null
let loading: Promise<FoodHit[]> | null = null

/** The UK food table (CoFID, about 2,850 foods) is loaded the first time someone searches. */
export function loadUkFoods(): Promise<FoodHit[]> {
  if (cache) return Promise.resolve(cache)
  loading ??= fetch(`${import.meta.env.BASE_URL}cofid.json`)
    .then((r) => r.json())
    .then((d: { foods: Row[] }) => (cache = d.foods.map(([name, kcal, protein, carbs, fat, fibre, sugar]) =>
      ({ key: 'uk:' + name, name, per: { kcal, protein, carbs, fat, fibre, sugar }, portion: 100, uk: true }))))
    .catch(() => { loading = null; return [] })
  return loading
}

// UK table spellings people won't type
const ALIASES: Record<string, string> = { hummus: 'houmous', zucchini: 'courgette', eggplant: 'aubergine', cilantro: 'coriander', yoghurt: 'yogurt', fries: 'chips' }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

function score(name: string, tokens: string[]): number | null {
  const n = norm(name)
  const words = n.split(/[^a-z0-9]+/).filter(Boolean)
  for (const tk of tokens) if (!words.some((w) => w.startsWith(tk)) && !n.includes(tk)) return null
  const first = n.split(',')[0]
  let s = 0
  if (first.startsWith(tokens[0])) s += 40
  if (first.split(/\s+/).some((w) => w.startsWith(tokens[0]))) s += 15
  if (/\braw\b|\bboiled\b|\bcooked\b|\bplain\b/.test(n)) s += 4
  s -= n.split(',').length * 3 + n.length / 20
  return s
}

/** Starter foods (in the user's language) first, then matches from the UK food table. */
export function useFoodSearch(query: string, lang: 'en' | 'pl', limit = 30): FoodHit[] {
  const [uk, setUk] = useState<FoodHit[]>(cache ?? [])
  const [saved, setSaved] = useState<FoodHit[]>([])
  const q = query.trim()
  useEffect(() => { if (q && !cache) loadUkFoods().then(setUk) }, [q])
  // Foods people have scanned or corrected, from our own database (looked up a moment after typing stops)
  useEffect(() => {
    if (q.length < 2) { setSaved([]); return }
    let live = true
    const h = setTimeout(() => { searchSavedFoods(q).then((r) => { if (live) setSaved(r) }) }, 250)
    return () => { live = false; clearTimeout(h) }
  }, [q])
  return useMemo(() => {
    const starter: FoodHit[] = FOODS.map((f) => ({ key: 'b:' + f.en, name: f[lang], per: f.per, portion: f.portion }))
    if (!q) return starter.slice(0, limit)
    const raw = norm(q).split(/\s+/).filter(Boolean)
    const tokens = raw.map((t) => ALIASES[t] ?? t)
    const mine = FOODS.filter((f) => [f.en, f.pl].some((n) => raw.every((t) => norm(n).includes(t)) || tokens.every((t) => norm(n).includes(t))))
      .map((f) => ({ key: 'b:' + f.en, name: f[lang], per: f.per, portion: f.portion }))
    const ranked = uk.map((f) => [score(f.name, tokens), f] as const).filter((x): x is readonly [number, FoodHit] => x[0] !== null)
      .sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, f]) => f)
    const seen = new Set<string>()
    return [...saved, ...mine, ...ranked].filter((f) => { const k = f.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, limit)
  }, [q, lang, uk, limit, saved])
}
