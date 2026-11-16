// POST { url } | { image: dataUrl } | { images: dataUrl[] } | { text }  ->  a recipe draft the app shows for review.
// POST { translate: { title, ingredients, steps, equipment }, lang }  ->  the same recipe text in another language, line for line.
import { askClaude, checkUser, cors, imageBlock, json, MACROS_SCHEMA } from '../_shared/ai.ts'
import { isPinterest, metaContent, pageText, pinterestTarget, recipeFromJsonLd } from '../_shared/recipe-page.ts'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-GB,en;q=0.9,pl;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`page_${res.status}`)
  return (await res.text()).slice(0, 2_000_000)
}

async function imageAsDataUrl(url: string | undefined, base: string): Promise<string | undefined> {
  if (!url) return undefined
  try {
    const res = await fetch(new URL(url, base), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) return undefined
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.length > 1_500_000) return undefined
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return `data:${type.split(';')[0]};base64,${btoa(bin)}`
  } catch { return undefined }
}

const TOOL = {
  name: 'save_recipe',
  description: 'Save the recipe so the user can review it.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'false if there is no recipe in the input' },
      title: { type: 'string' },
      category: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      servings: { type: 'integer' },
      minutes: { type: 'integer', description: 'total time, if known' },
      ingredients: { type: 'array', items: { type: 'string' }, description: 'one per line, metric where possible, e.g. "200g orzo", "2 garlic cloves, crushed"' },
      equipment: { type: 'array', items: { type: 'string' } },
      steps: { type: 'array', items: { type: 'string' }, description: 'short, clear steps a person can follow on their phone while cooking' },
      nutrition: { ...MACROS_SCHEMA, description: 'per serving; use the source figures if given, otherwise your best estimate' },
    },
    required: ['found', 'title', 'category', 'servings', 'ingredients', 'steps', 'equipment', 'nutrition'],
  },
}

const system = (lang: string) => `You turn recipes into clean, structured data for a cooking app.
Keep the original recipe; don't invent ingredients or steps. Fix obvious OCR mistakes in photos.
Write ingredients and steps in ${lang === 'pl' ? 'Polish' : 'British English'} (translate if needed). Use metric units.
Split long method paragraphs into separate short steps. List equipment that's needed (pans, trays, blender...).
If nutrition isn't given, estimate it per serving from the ingredients.`

const TRANSLATE_TOOL = {
  name: 'save_translation',
  description: 'Save the translated recipe text.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      ingredients: { type: 'array', items: { type: 'string' }, description: 'same number and order as the input' },
      steps: { type: 'array', items: { type: 'string' }, description: 'same number and order as the input' },
      equipment: { type: 'array', items: { type: 'string' }, description: 'same number and order as the input' },
    },
    required: ['title', 'ingredients', 'steps', 'equipment'],
  },
}

async function translate(input: { title?: unknown; ingredients?: unknown; steps?: unknown; equipment?: unknown }, lang: string) {
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 600)).slice(0, 80) : [])
  const src = { title: String(input.title ?? '').slice(0, 200), ingredients: list(input.ingredients), steps: list(input.steps), equipment: list(input.equipment) }
  const target = lang === 'pl' ? 'Polish' : 'British English'
  const r = await askClaude<{ title: string; ingredients: string[]; steps: string[]; equipment: string[] }>({
    system: `You translate recipes for a cooking app into natural, friendly ${target}, the way a home cook would write it. Translate every line; keep the same number of lines in the same order. Ingredient lines are ingredient names with any preparation notes (no amounts): translate them as names, e.g. "garlic cloves, crushed". Keep numbers, temperatures and times exactly. Use ingredient names people in ${lang === 'pl' ? 'Poland' : 'the UK'} would find in shops.`,
    content: [{ type: 'text', text: JSON.stringify(src) }],
    tool: TRANSLATE_TOOL,
    maxTokens: 4000,
  })
  const same = (a: unknown, b: string[]) => Array.isArray(a) && a.length === b.length
  if (!r.title || !same(r.ingredients, src.ingredients) || !same(r.steps, src.steps) || !same(r.equipment, src.equipment)) throw new Error('bad_translation')
  return r
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const user = await checkUser(req, 'import')
    if (!user.ok) return user.res
    const { url, image, images, text, translate: toTranslate, lang = 'en' } = await req.json()
    if (toTranslate) return json({ translation: await translate(toTranslate, lang) })
    const pics: string[] = (Array.isArray(images) ? images : image ? [image] : []).map(String).slice(0, 6)

    let content
    let photo: string | undefined
    let source: string | undefined
    if (url) {
      let target = String(url).trim()
      if (!/^https?:\/\//i.test(target)) target = 'https://' + target
      let html = await getHtml(target)
      if (isPinterest(target)) {
        const out = pinterestTarget(html)
        if (out) { target = out; html = await getHtml(out) }
      }
      source = target
      const structured = recipeFromJsonLd(html)
      photo = await imageAsDataUrl(structured?.image ?? metaContent(html, 'og:image'), target)
      content = [{ type: 'text' as const, text: structured
        ? `Structured recipe data from ${target}:\n${JSON.stringify(structured)}`
        : `Web page ${target}, title "${metaContent(html, 'og:title') ?? ''}":\n\n${pageText(html)}` }]
    } else if (pics.length) {
      content = [...pics.map(imageBlock), { type: 'text' as const, text: pics.length > 1
        ? `These ${pics.length} photos or screenshots, in order, are parts of ONE recipe (for example ingredients on one, method on the next). Read them all and combine them into a single recipe. Where they overlap, don't repeat anything.`
        : 'This is a photo or screenshot of a recipe (maybe a cookbook page). Read it.' }]
    } else if (text) {
      content = [{ type: 'text' as const, text: String(text).slice(0, 14000) }]
    } else {
      return json({ error: 'nothing_to_import' }, 400)
    }

    const r = await askClaude<Record<string, unknown> & { found: boolean }>({ system: system(lang), content, tool: TOOL })
    if (!r.found) return json({ error: 'no_recipe' }, 422)
    return json({ recipe: { ...r, photo, source } })
  } catch (e) {
    const msg = String((e as Error).message ?? e)
    console.error(msg)
    if (msg === 'no_api_key') return json({ error: 'not_set_up' }, 500)
    if (msg.startsWith('page_') || msg.includes('timed out') || msg.includes('abort')) return json({ error: 'page_unreachable' }, 502)
    return json({ error: 'failed' }, 500)
  }
})
