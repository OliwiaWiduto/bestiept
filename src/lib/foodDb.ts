// BestiePT's own food database (supabase/foods.sql): foods people scan, type in or correct.
// Checked before anything else, and quietly grown as people log. Everything here fails soft:
// if the table isn't set up yet, the app just falls back to the other sources.
import { supabase } from './supabase'
import type { Lang, Macros } from '../types'
import type { FoodHit } from './foodSearch'

type Row = { id: string; name: string; name_key: string; barcode: string | null; per: Macros; portion: number; source: 'barcode' | 'user' | 'ai'; uses: number }
export type Source = Row['source']

const key = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const RANK: Record<Source, number> = { barcode: 3, user: 2, ai: 1 }
const toHit = (r: Row): FoodHit & { source: Source } => ({ key: 'db:' + r.id, name: r.name, per: r.per, portion: Number(r.portion) || 100, source: r.source })

const byName = new Map<string, Row | null>()
let offline = false

/** Look several names up at once and keep the answers for this session. */
export async function prefetchFoods(names: string[]): Promise<void> {
  if (offline) return
  const keys = [...new Set(names.map(key))].filter((k) => k && !byName.has(k))
  if (!keys.length) return
  const { data, error } = await supabase.from('foods').select('id, name, name_key, barcode, per, portion, source, uses').in('name_key', keys).is('barcode', null)
  if (error) { if (/relation|does not exist|schema cache/i.test(error.message)) offline = true; return }
  for (const k of keys) byName.set(k, null)
  for (const r of (data ?? []) as Row[]) {
    const had = byName.get(r.name_key)
    if (!had || RANK[r.source] > RANK[had.source] || (RANK[r.source] === RANK[had.source] && r.uses > had.uses)) byName.set(r.name_key, r)
  }
}

/** A food someone has saved under exactly this name. AI estimates only when allowed. */
export async function savedFood(name: string, allowAi = false): Promise<(FoodHit & { source: Source }) | null> {
  const k = key(name)
  if (!byName.has(k)) await prefetchFoods([name])
  const r = byName.get(k)
  if (!r || (r.source === 'ai' && !allowAi)) return null
  return toHit(r)
}

export async function foodByBarcode(code: string): Promise<(FoodHit & { source: Source }) | null> {
  if (offline) return null
  const { data, error } = await supabase.from('foods').select('id, name, name_key, barcode, per, portion, source, uses').eq('barcode', code.trim()).maybeSingle()
  if (error || !data) return null
  return toHit(data as Row)
}

/** Foods in our database whose name contains the search, most used first. */
export async function searchSavedFoods(q: string, limit = 8): Promise<FoodHit[]> {
  const k = key(q)
  if (offline || k.length < 2) return []
  const { data, error } = await supabase.from('foods').select('id, name, name_key, barcode, per, portion, source, uses')
    .ilike('name_key', `%${k.replace(/[%_]/g, '')}%`).neq('source', 'ai').order('uses', { ascending: false }).limit(limit)
  if (error) return []
  return (data as Row[]).map(toHit)
}

/** Save a food for everyone (counts another use if we already have it). Never blocks logging. */
export function rememberFood(f: { name: string; per: Macros; portion?: number; barcode?: string; source: Source }, lang: Lang) {
  if (offline || !f.name.trim() || !(f.per.kcal >= 0)) return
  const per = Object.fromEntries(Object.entries(f.per).map(([k, v]) => [k, Math.round((Number(v) || 0) * 10) / 10]))
  supabase.rpc('remember_food', { p_name: f.name.trim().slice(0, 120), p_barcode: f.barcode ?? null, p_lang: lang, p_per: per, p_portion: Math.round(f.portion ?? 100), p_source: f.source })
    .then(({ error }) => { if (error && /function|does not exist|schema cache/i.test(error.message)) offline = true })
  if (!f.barcode) byName.delete(key(f.name))
}
