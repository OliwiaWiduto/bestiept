// Looks a barcode up: our own food database first, then Open Food Facts (and saves what it finds).
import type { Lang, Macros } from '../types'
import { foodByBarcode, rememberFood } from './foodDb'

export type BarcodeFood = { name: string; per: Macros; portion: number; mine: boolean }

export async function lookupBarcode(code: string, lang: Lang): Promise<BarcodeFood | null> {
  const c = code.trim()
  const mine = await foodByBarcode(c)
  if (mine) {
    rememberFood({ name: mine.name, per: mine.per, portion: mine.portion, barcode: c, source: mine.source }, lang)
    return { name: mine.name, per: mine.per, portion: mine.portion, mine: true }
  }
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=product_name,brands,nutriments,serving_quantity`)
    const data = await res.json()
    const n = data?.product?.nutriments
    if (!data?.product || !n || n['energy-kcal_100g'] === undefined) return null
    const name = [data.product.brands?.split(',')[0], data.product.product_name].filter(Boolean).join(' ') || c
    const per = { kcal: +n['energy-kcal_100g'] || 0, protein: +n.proteins_100g || 0, carbs: +n.carbohydrates_100g || 0, fat: +n.fat_100g || 0, fibre: +n.fiber_100g || 0, sugar: +n.sugars_100g || 0 }
    const portion = +data.product.serving_quantity || 100
    rememberFood({ name, per, portion, barcode: c, source: 'barcode' }, lang)
    return { name, per, portion, mine: false }
  } catch {
    return null
  }
}
