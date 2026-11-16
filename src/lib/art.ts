// Picks one of our hand-drawn food pictures for anything without a photo:
// by dish type from the name (English or Polish), otherwise by meal type, rotating so lists don't repeat.
const DISH: [RegExp, string][] = [
  [/smoothie|shake|juice|latte|frapp|drink|koktajl|sok\b|napój|kawa/, 'dish-smoothie'],
  [/pizza/, 'dish-pizza'],
  [/taco|burrito|fajita|wrap\b|wraps|quesadilla|tortilla|kebab|gyros|enchilada/, 'dish-taco'],
  [/lasagn|lazani|bake\b|baked|casserole|\bpie\b|gratin|moussaka|zapiekan|tarta|enchiladas/, 'dish-bake'],
  [/cake|brownie|cookie|muffin|dessert|pudding|cheesecake|\btart\b|crumble|pancake|waffle|tiramisu|ciast|deser|sernik|babeczk|naleśnik|gofr|pączk|szarlotk/, 'dish-cake'],
  [/soup|stew|chowder|broth|chilli|chili|goulash|zupa|zupy|gulasz|rosół|barszcz|krem z|żurek|kapuśniak/, 'dish-soup'],
  [/curry|stir.?fry|risotto|paella|biryani|rice\b|\bdal\b|dhal|teriyaki|pad thai|katsu|ryż|risotto|potrawk/, 'dish-curry'],
  [/pasta|spaghetti|orzo|noodle|penne|linguine|tagliatelle|fusilli|rigatoni|ramen|udon|gnocchi|carbonara|bolognese|mac.?n|makaron|kluski|pierog|łazanki/, 'meal-dinner'],
  [/salad|poke|slaw|buddha|grain bowl|sałat|surówk/, 'dish-salad'],
  [/egg|omelette|omelet|frittata|shakshuka|benedict|jajk|jajecz|omlet|szakszuk/, 'dish-eggs'],
  [/oat|porridge|granola|muesli|yoghurt|yogurt|chia|owsian|jogurt|musli|płatk/, 'meal-breakfast'],
  [/sandwich|toastie|bagel|panini|sub\b|kanapk|tost|bułk|burger/, 'meal-lunch'],
  [/chicken|salmon|fish|steak|beef|pork|lamb|\bcod\b|tuna|prawn|shrimp|turkey|sausage|tofu|halloumi|kurczak|kurczę|łosoś|ryb|wołow|wieprz|schab|indyk|kotlet|krewetk|dorsz|stek/, 'dish-plate'],
  [/apple|banana|berries|grapes|orange|fruit|hummus|cracker|nuts|energy ball|bliss|protein bar|flapjack|jabłk|owoc|orzech|batonik/, 'meal-snack'],
]
const POOL: Record<string, string[]> = {
  breakfast: ['meal-breakfast', 'dish-eggs', 'dish-smoothie'],
  lunch: ['meal-lunch', 'dish-salad', 'dish-soup'],
  dinner: ['dish-cutlery', 'dish-plate', 'dish-curry'],
  snack: ['meal-snack', 'dish-smoothie'],
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }

export function foodArt(name?: string, cat?: string): string {
  const n = (name ?? '').toLowerCase()
  const hit = n && DISH.find(([re]) => re.test(n))
  if (hit) return `/icons/${hit[1]}.png`
  const pool = POOL[cat ?? ''] ?? POOL.dinner
  return `/icons/${pool[hash(n || cat || '') % pool.length]}.png`
}
