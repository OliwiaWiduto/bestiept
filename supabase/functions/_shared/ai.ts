// Shared bits for BestiePT's AI functions (Supabase Edge Functions, Deno).
import { createClient } from 'npm:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Signed-in user + a per-day limit, so a leaked link can't run up the AI bill. */
export async function checkUser(req: Request, kind: string): Promise<{ ok: true } | { ok: false; res: Response }> {
  const auth = req.headers.get('Authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, res: json({ error: 'signed_out' }, 401) }
  const { data: allowed, error } = await sb.rpc('use_ai', { ai_kind: kind })
  if (error) return { ok: false, res: json({ error: 'not_set_up' }, 500) }
  if (!allowed) return { ok: false, res: json({ error: 'daily_limit' }, 429) }
  return { ok: true }
}

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

/** Ask Claude and force the answer into a fixed JSON shape (via a tool). */
export async function askClaude<T>(opts: { system: string; content: Block[]; tool: { name: string; description: string; input_schema: unknown }; maxTokens?: number }): Promise<T> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('no_api_key')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: opts.maxTokens ?? 4000,
      system: `${opts.system}\n\nAlways give your answer by calling the ${opts.tool.name} tool, and never reply with plain text.`,
      tools: [opts.tool],
      tool_choice: { type: 'auto' }, // newer models reject forced tool use
      messages: [{ role: 'user', content: opts.content }],
    }),
  })
  if (!res.ok) throw new Error(`ai_${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const use = data.content?.find((c: { type: string }) => c.type === 'tool_use')
  if (!use) throw new Error('ai_no_answer')
  return use.input as T
}

/** "data:image/jpeg;base64,...." -> Claude image block */
export function imageBlock(dataUrl: string): Block {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/)
  if (!m) throw new Error('bad_image')
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }
}

export const MACROS_SCHEMA = {
  type: 'object',
  properties: { kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, fibre: { type: 'number' }, sugar: { type: 'number' } },
  required: ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar'],
}
