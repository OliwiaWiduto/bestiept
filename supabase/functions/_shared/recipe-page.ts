// Pure helpers for reading recipe web pages. No Deno or Node APIs, so they can be unit tested anywhere.

export type PageRecipe = {
  title?: string
  servings?: number
  minutes?: number
  ingredients: string[]
  steps: string[]
  image?: string
  nutrition?: Record<string, string | number>
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, ' ').trim()

const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, ' '))

/** "PT1H15M" -> 75 */
export function isoMinutes(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined
  const m = v.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!m) return undefined
  const total = (Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 60 + Number(m[3] || 0)
  return total || undefined
}

function firstNumber(v: unknown): number | undefined {
  const s = Array.isArray(v) ? v.find((x) => /\d/.test(String(x))) : v
  const m = String(s ?? '').match(/\d+/)
  return m ? Number(m[0]) : undefined
}

function imageOf(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return imageOf(v[0])
  if (typeof v === 'object') return (v as { url?: string }).url
  return undefined
}

function stepsOf(v: unknown): string[] {
  if (!v) return []
  if (typeof v === 'string') return v.split(/\n+|(?<=\.)\s+(?=[A-Z])/).map(stripTags).filter(Boolean)
  if (Array.isArray(v)) return v.flatMap((x) => {
    if (typeof x === 'string') return [stripTags(x)]
    const o = x as { '@type'?: string; text?: string; name?: string; itemListElement?: unknown }
    if (o.itemListElement) return stepsOf(o.itemListElement) // HowToSection
    return [stripTags(o.text ?? o.name ?? '')]
  }).filter(Boolean)
  return []
}

function isRecipe(o: unknown): boolean {
  const t = (o as { '@type'?: unknown })?.['@type']
  return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
}

function findRecipe(node: unknown): Record<string, unknown> | undefined {
  if (!node || typeof node !== 'object') return undefined
  if (isRecipe(node)) return node as Record<string, unknown>
  if (Array.isArray(node)) { for (const n of node) { const r = findRecipe(n); if (r) return r } return undefined }
  const o = node as Record<string, unknown>
  for (const k of ['@graph', 'mainEntity', 'itemListElement', 'item']) { const r = findRecipe(o[k]); if (r) return r }
  return undefined
}

/** Most recipe sites embed schema.org Recipe data. Read it if it's there. */
export function recipeFromJsonLd(html: string): PageRecipe | undefined {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  for (const b of blocks) {
    let data: unknown
    try { data = JSON.parse(b.trim()) } catch { continue }
    const r = findRecipe(data)
    if (!r) continue
    const ingredients = ((r.recipeIngredient ?? r.ingredients ?? []) as unknown[]).map((x) => stripTags(String(x))).filter(Boolean)
    return {
      title: r.name ? stripTags(String(r.name)) : undefined,
      servings: firstNumber(r.recipeYield),
      minutes: isoMinutes(r.totalTime) ?? ((isoMinutes(r.prepTime) ?? 0) + (isoMinutes(r.cookTime) ?? 0) || undefined),
      ingredients,
      steps: stepsOf(r.recipeInstructions),
      image: imageOf(r.image),
      nutrition: (r.nutrition && typeof r.nutrition === 'object') ? r.nutrition as Record<string, string | number> : undefined,
    }
  }
  return undefined
}

export function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1]
  return c ? decode(c) : undefined
}

/** Readable text of a page, for when there's no structured recipe data. */
export function pageText(html: string, limit = 14000): string {
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h\d|br|tr)>/gi, '\n')
  return stripTags(body.replace(/\n/g, ' ¶ ')).replace(/( ?¶ ?)+/g, '\n').trim().slice(0, limit)
}

/** A Pinterest pin usually points at the original recipe site. */
export function pinterestTarget(html: string): string | undefined {
  const candidates = [
    metaContent(html, 'og:see_also'),
    html.match(/"link"\s*:\s*"(https?:[^"]+)"/)?.[1]?.replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
  ]
  return candidates.find((u) => u && !/pinterest\.|pin\.it/.test(u))
}

export const isPinterest = (url: string) => /(^|\.)pinterest\.[a-z.]+$|^pin\.it$/i.test(new URL(url).hostname)
