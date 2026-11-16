// POST { image: dataUrl } or { text: "what I ate" }, plus lang -> what's on the plate, with grams and per-100g macros, for the user to edit.
import { askClaude, checkUser, cors, imageBlock, json, MACROS_SCHEMA } from '../_shared/ai.ts'

const TOOL = {
  name: 'log_meal',
  description: 'Log the foods in the photo or description.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'false if there is no food in the photo or description' },
      name: { type: 'string', description: 'short name for the meal, e.g. "Chicken salad"' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            grams: { type: 'number', description: 'estimated amount on the plate' },
            per100: { ...MACROS_SCHEMA, description: 'typical values per 100g of this food as served' },
          },
          required: ['name', 'grams', 'per100'],
        },
      },
    },
    required: ['found', 'name', 'items'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const user = await checkUser(req, 'scan')
    if (!user.ok) return user.res
    const { image, text, lang = 'en' } = await req.json()
    const said = typeof text === 'string' ? text.trim().slice(0, 1500) : ''
    if (!image && !said) return json({ error: 'nothing_to_scan' }, 400)
    const r = await askClaude<{ found: boolean; name: string; items: unknown[] }>({
      system: `You estimate what's in a meal for a food diary, from a photo or from a spoken description. List each separate food or ingredient (include obvious oils, sauces and dressings), with a realistic portion in grams and standard nutrition per 100g. Be honest about portion size; don't lowball. Names in ${lang === 'pl' ? 'Polish' : 'British English'}.`,
      content: image ? [imageBlock(String(image)), { type: 'text', text: 'What is in this meal?' }] : [{ type: 'text', text: `Here is what I ate, dictated by voice (may contain speech-recognition slips): ${said}` }],
      tool: TOOL,
      maxTokens: 2000,
    })
    if (!r.found || !r.items?.length) return json({ error: 'no_food' }, 422)
    return json({ meal: { name: r.name, items: r.items } })
  } catch (e) {
    const msg = String((e as Error).message ?? e)
    console.error(msg)
    return json({ error: msg === 'no_api_key' ? 'not_set_up' : 'failed' }, 500)
  }
})
