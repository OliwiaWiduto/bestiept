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

# Reminders (send-reminders)

Push reminders to plan, shop and log, sent at the right time for each person. The app signs a phone up (Today card or
Settings > Reminders) and saves it in `push_subscriptions`; this function runs every half hour and sends what's due.
The rules are in `send-reminders/rules.ts`:

- **Planning**: at the time she usually plans (learned from when she adds meals; until then Sunday 6pm), if the week she's planning has fewer than 3 meals. Not sent to people who only log.
- **Tonight's dinner**: 4:30pm when a dinner is planned today; tapping opens the recipe.
- **Shopping**: at the time she usually shops (learned from her shopping trips; until then Monday 5pm), if the week has meals planned and nothing is ticked yet. Once more the next day if still untouched.
- **Logging** (people who logged on 2+ of the last 7 days): 2:30pm if nothing logged today (and she logged yesterday), 8:30pm if no dinner logged.
- **Missed you**: 7pm, at most weekly, when someone who logs hasn't for two days.
- At most 2 a day, never between 9pm and 9am in her time zone, the same one never twice in a day.

## Switching it on

1. Supabase > Edge Functions > Secrets: add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `CRON_SECRET` (values from Claude; the public key must match `VAPID_PUBLIC` in `src/lib/push.ts`).
2. Deploy the function: Edge Functions > Deploy a new function > Via editor, name it `send-reminders`, paste `index.ts` and add a second file `rules.ts`. In its settings, turn **Verify JWT** off (it checks `CRON_SECRET` instead).
3. Run `supabase/push.sql` in the SQL Editor, with `PASTE_CRON_SECRET` replaced by the same secret.
