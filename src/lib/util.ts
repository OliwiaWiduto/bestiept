import type { Ingredient } from '../types'
import { plBasic } from './plNames'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }
const UNITS = ['kg', 'g', 'ml', 'l', 'oz', 'lb', 'stick', 'sticks', 'bunch', 'sprig', 'sprigs', 'dash', 'splash', 'knob', 'tsp', 'tbsp', 'cups', 'cup', 'tins', 'tin', 'cans', 'can', 'cloves', 'clove', 'pinch', 'handful', 'łyżeczki', 'łyżeczka', 'łyżki', 'łyżka', 'szczypta', 'puszki', 'puszka', 'ząbki', 'ząbek', 'szklanka', 'garść']

// Recipes spell units many ways; we keep one short form of each.
const ALIASES: Record<string, string> = {
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', tbsps: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
  ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', gram: 'g', grams: 'g', gr: 'g', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml', litre: 'l', litres: 'l', liter: 'l', liters: 'l', handfuls: 'handful', pinches: 'pinch',
  łyżek: 'łyżki', łyżeczek: 'łyżeczki', szklanki: 'szklanka', szklanek: 'szklanka', puszek: 'puszki', ząbków: 'ząbki', szczypty: 'szczypta', garści: 'garść',
}

function parseAmount(s: string): number | null {
  s = s.trim().replace(',', '.')
  if (!s) return null
  // "2-3" or "2 to 3": somewhere in the middle
  const range = s.match(/^([\d.]+)\s*(?:-|–|to|do)\s*([\d.]+)$/)
  if (range) return (Number(range[1]) + Number(range[2])) / 2
  let total = 0
  for (const part of s.split(/\s+/)) {
    if (FRACTIONS[part]) total += FRACTIONS[part]
    else if (part.includes('/')) {
      const [a, b] = part.split('/').map(Number)
      if (b) total += a / b
    } else if (/[½¼¾⅓⅔]$/.test(part)) total += Number(part.slice(0, -1)) + FRACTIONS[part.slice(-1)]
    else total += Number(part)
  }
  return Number.isFinite(total) && total > 0 ? total : null
}

/** "200g orzo", "2 garlic cloves", "1 tbsp olive oil" → structured ingredient. */
export function parseIngredient(line: string): Ingredient {
  const text = line.trim().replace(/^[-•*]\s*/, '')
  const m = text.replace(/^([\d.,]+)\s*(?:-|–|to|do)\s*([\d.,]+)/, '$1-$2').match(/^([\d.,/½¼¾⅓⅔ -]+)?\s*([a-ząęółśżźćń]+)?\.?\s+(.*)$/i)
  let amount: number | null = null
  let unit = ''
  let name = text
  if (m) {
    const a = m[1] ? parseAmount(m[1]) : null
    const raw = (m[2] || '').toLowerCase()
    const u = ALIASES[raw] ?? raw
    if (a !== null && UNITS.includes(u)) {
      amount = a; unit = u; name = m[3]
    } else if (a !== null) {
      amount = a; name = [m[2], m[3]].filter(Boolean).join(' ')
    }
  }
  const times = text.match(/^(\d+)\s*[x×]\s*([\d.,]+)\s*(kg|g|ml|l)\s+(?:(?:tins?|cans?|packs?|jars?|bags?|puszk[ia]|opakowania?)\s+)?(?:of\s+)?(.*)$/i)
  if (times) return { id: uid(), amount: Number(times[1]) * (parseAmount(times[2]) ?? 0), unit: times[3].toLowerCase(), name: times[4].trim() }
  const glued = text.match(/^([\d.,]+)(kg|g|ml|l)\s+(.*)$/i)
  if (glued) {
    amount = parseAmount(glued[1]); unit = glued[2].toLowerCase(); name = glued[3]
  }
  return { id: uid(), amount, unit, name: name.trim() }
}

export function formatAmount(n: number | null): string {
  if (n === null) return ''
  if (n >= 10) return String(Math.round(n))
  const r = Math.round(n * 4) / 4
  const whole = Math.floor(r)
  const frac = r - whole
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : ''
  return whole ? `${whole}${f}` : f || String(Math.round(n * 10) / 10)
}

export function ingredientText(i: Ingredient, factor = 1): string {
  const amt = i.amount === null ? '' : formatAmount(i.amount * factor)
  const glue = ['g', 'kg', 'ml', 'l'].includes(i.unit)
  return amt ? (glue ? `${amt}${i.unit}` : `${amt}${i.unit ? ' ' + i.unit : ''}`) : ''
}

/** Resize a picked photo so it fits comfortably in storage. */
export function fileToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

const FILLER = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'big', 'ripe', 'dried', 'frozen', 'whole', 'extra', 'virgin', 'boneless', 'skinless', 'finely', 'roughly', 'thinly', 'chopped', 'grated', 'sliced', 'diced', 'crushed', 'minced', 'peeled', 'cooked', 'raw', 'unsalted', 'salted', 'heaped', 'level', 'good', 'quality', 'of',
  'świeży', 'świeża', 'świeże', 'świeżo', 'duży', 'duża', 'duże', 'mały', 'mała', 'małe', 'średni', 'średnia', 'średnie', 'drobno', 'grubo', 'cienko', 'posiekany', 'posiekana', 'posiekane', 'starty', 'starta', 'starte', 'pokrojony', 'pokrojona', 'pokrojone', 'obrany', 'obrana', 'obrane', 'mrożony', 'mrożona', 'mrożone', 'suszony', 'suszona', 'suszone'])
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** "potatoes, chopped into cubes" → main "Potatoes", note "chopped into cubes". */
export function splitName(name: string): { main: string; note: string } {
  const m = name.trim().match(/^([^,(;]+)[,(;]?\s*(.*)$/)
  // Shown on its own, so Polish names go back to their basic form ("oliwy" → "Oliwa").
  if (!m) return { main: cap(plBasic(name)), note: '' }
  return { main: cap(plBasic(m[1])), note: m[2].replace(/\)\s*$/, '').replace(/\)\s*,?\s*/g, ', ').replace(/\(/g, '').trim() }
}

/** The shortest useful name for an ingredient: "large aubergines, halved lengthways" → "Aubergines". */
export function shortName(name: string): string {
  const words = splitName(name).main.split(/\s+/)
  while (words.length > 1 && FILLER.has(words[0].toLowerCase())) words.shift()
  return cap(words.join(' '))
}

/** A web address shown as just its site name. */
export function siteName(source: string): { label: string; href?: string } {
  try {
    const u = new URL(/^https?:\/\//i.test(source) ? source : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(source) ? `https://${source}` : 'x:')
    if (u.protocol.startsWith('http')) return { label: u.hostname.replace(/^www\./, ''), href: u.href }
  } catch { /* not a link */ }
  return { label: source }
}
