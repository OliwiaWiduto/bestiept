# BestiePT

A food app for saving recipes, cooking hands-free, planning the week and tracking what you eat. It's built as a web app (PWA) you can add to your iPhone's home screen, and it's set up to become an App Store / Play Store app later.

## What works in this version (phase 1)

- **Sign-up:** name, body details, activity and goal, with daily calorie, macro, fibre and sugar targets worked out for you (and editable).
- **Today:** day-by-day view with ‹ › arrows, calories left, macro bars, a friendly nudge, your meals, and weight logging.
- **Log food:** from a saved recipe, from a starter food list, by barcode number (looked up on Open Food Facts), or quick add. Every meal can be opened to change grams, add things (like cooking oil) or remove them.
- **Recipes:** library with categories, favourites and search; add or edit a recipe and check how the ingredients were read before saving; scale servings.
- **Cooking mode:** a checklist to gather everything, big step text, the ingredients for each step, tap-to-start timers, screen stays awake, voice commands ("next", "back", "repeat", "timer"; Polish too) and hand wave to move on (uses the front camera).
- **Meal plan:** this week and next, any number of meals a day, leftovers offered automatically.
- **Shopping list:** combined and grouped by aisle with category icons, tick off as you shop, add your own items, and a "probably in your cupboard" section with an "I'm out" button.
- **Trends:** week and month calories, average macros vs targets, and your weight line.
- **Settings:** English / Polish, your details and targets, cupboard staples, delete all data.

Everything is saved on your phone. Nothing is sent anywhere, except barcode numbers to Open Food Facts when you look one up.

## Coming in phase 2

Accounts and cloud sync, recipe import from links, screenshots and cookbook photos (AI), photo scanning of meals (AI), barcode scanning with the camera, the full UK food database, family sharing, and App Store / Play Store builds (Capacitor).

## Put it on your phone (free, about 5 minutes)

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New → Project**, choose the `bestiept` repo and click **Deploy**. The defaults are right (it detects Vite).
3. When it finishes, open the link it gives you **in Safari on your iPhone**.
4. Tap the **Share** button, then **Add to Home Screen**. It now opens like an app.

Every time new code is pushed to GitHub, Vercel updates the app automatically.

## For developers

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check and production build
```

- React + TypeScript + Vite, `vite-plugin-pwa` for the installable app.
- State in `src/store.ts` (Zustand, saved to IndexedDB).
- All text in `src/i18n.ts`, English and Polish. The Polish should be checked by a native speaker before public launch.
- Colours and type come from the BestiePT design system and live as CSS variables in `src/theme.css`.
- Starter food values in `src/lib/foods.ts` are typical figures, to be replaced by CoFID and Open Food Facts in phase 2.
