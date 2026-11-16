# AI features (recipe import + photo scan)

Two Supabase Edge Functions that call Claude:

- `import-recipe`: a link (Pinterest or any recipe site), a screenshot, or a photo of a cookbook page, turned into a recipe draft the user reviews before saving. Recipe sites with schema.org data are read directly, so the AI only tidies them up.
- `scan-meal`: a photo of a plate, turned into a list of foods with estimated grams and macros, which the user edits before logging.

## Switching it on (about 10 minutes)

1. Run `supabase/ai.sql` in Supabase > SQL Editor. This sets a limit of 30 imports and 30 scans per person per day.
2. Get an API key at console.anthropic.com (Settings > API keys) and add some credit.
3. In Supabase, go to Edge Functions > Secrets and add `ANTHROPIC_API_KEY`. Optional: add `AI_MODEL` to choose a different Claude model.
4. Deploy both functions. Either:
   - Dashboard: Edge Functions > Deploy a new function > "Via editor". Paste each `index.ts`, plus the `_shared` files.
   - Supabase CLI: `supabase functions deploy import-recipe scan-meal --project-ref nxixvwvdbhbsijmhtjyw`

Until then, the app says "This isn't switched on yet" and everything else works as normal.

Rough cost: a few pence per import or scan.
