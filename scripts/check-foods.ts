import { COMMON } from '../src/lib/commonFoods'
import fs from 'fs'
const d = JSON.parse(fs.readFileSync(new URL('../public/cofid.json', import.meta.url),'utf8'))
const rows: any[] = Object.values(d).find((v: any) => Array.isArray(v) && Array.isArray(v[0])) as any
const names = new Map(rows.map((r: any) => [r[0], r[1]]))
const tests: [string, number, number][] = [
 ['coconut milk',150,240],['light coconut milk',50,110],['tinned coconut milk',150,240],['coconut cream',250,400],
 ['sugar snap peas',30,60],['mangetout',30,60],['peas',50,90],['caster sugar',380,410],['brown sugar',350,410],
 ['chicken stock',0,30],['beef stock cube',0,30],['vegetable broth',0,30],['chicken breast',100,130],['chicken thighs',110,220],
 ['peanut butter',550,650],['butter',700,760],['unsalted butter',700,760],['buttermilk',30,60],['butter beans',60,120],
 ['egg noodles',330,400],['eggs',130,160],['egg whites',40,60],['egg yolk',300,340],['rice vinegar',0,40],['apple cider vinegar',0,40],
 ['rice',340,370],['rice noodles',340,380],['rice paper',300,360],['watercress',-1,-1],['watermelon',-1,-1],['water',0,0],['ice',0,0],
 ['ice cream',150,260],['milk chocolate',480,560],['dark chocolate',480,600],['milk',40,70],['oat milk',35,60],['almond milk',10,30],
 ['sour cream',150,300],['double cream',400,500],['single cream',150,220],['greek yogurt',90,140],['sweet chilli sauce',150,260],
 ['ketchup',90,130],['tomatoes',15,25],['chopped tomatoes',15,30],['lime juice',20,40],['lemon',20,40],['spring onions',15,40],
 ['red onion',30,45],['soy sauce',40,80],['sesame oil',880,900],['olive oil',880,900],['honey',280,330],['peppercorns',-1,600],
 ['popcorn',-1,-1],['sweetcorn',60,130],['salted peanuts',-1,-1],['salmon fillet',150,240],['tofu',70,150],['feta',250,280],
 ['basmati rice',340,370],['orzo',340,370],['spaghetti',340,370],['plain flour',330,370],['rolled oats',350,400],['banana',80,100],
]
let bad = 0
for (const [n, lo, hi] of tests) {
  const row = COMMON.find(([re]) => re.test(n.toLowerCase()))
  const kcal = !row ? -1 : typeof row[1] === 'string' ? (names.get(row[1]) ?? 'MISSING ' + row[1]) : row[1][0]
  const ok = lo === -1 && hi === -1 ? kcal === -1 : typeof kcal === 'number' && kcal >= lo && kcal <= hi || (lo === -1 && kcal === -1)
  if (!ok) { bad++; console.log('BAD', n, '->', kcal, row ? String(row[0]).slice(0,40) : '') }
}
console.log(bad ? 'FAILED ' + bad : 'ok', 'of', tests.length); if (bad) process.exit(1)

// How many grams a recipe line comes to, roughly.
import { parseIngredient } from '../src/lib/util'
import { ingredientGrams } from '../src/lib/grams'
const grams: [string, number, number][] = [
  ['2 tablespoons olive oil', 25, 35], ['1 teaspoon salt', 4, 6], ['8 oz cream cheese', 220, 235], ['1 lb chicken thighs', 440, 470], ['2-3 garlic cloves', 10, 15],
  ['1 1/2 cups flour', 170, 200], ['1 cup rolled oats', 80, 100], ['1 cup milk', 230, 250], ['2 cups spinach', 50, 70], ['1 eggplant', 250, 350], ['3 spring onions', 30, 60],
  ['1 onion', 120, 180], ['2 x 400g tins chickpeas', 800, 800], ['2 eggs', 90, 110], ['1 stick butter', 110, 116], ['2 szklanki mąki', 240, 260], ['3 łyżek oliwy', 40, 50],
]
let badG = 0
for (const [l, lo, hi] of grams) { const g = ingredientGrams(parseIngredient(l)); if (g < lo || g > hi) { badG++; console.log('BAD grams', l, '->', g) } }
console.log(badG ? 'FAILED ' + badG : 'ok', 'of', grams.length, 'amounts'); if (badG) process.exit(1)
// An old recipe line saved before the unit was known
if (ingredientGrams({ id: 'x', amount: 2, unit: '', name: 'tablespoons olive oil' }) !== 30) { console.log('FAILED old unit line'); process.exit(1) }
