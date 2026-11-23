// English ↔ Polish names for everyday shopping, so items typed onto the list can be shown in the
// other language without an AI call. Polish in its basic form, as you'd write it on a list.
const PAIRS: [string, string][] = [
  // Fruit & veg
  ['apple', 'jabłko'], ['apples', 'jabłka'], ['banana', 'banan'], ['bananas', 'banany'], ['orange', 'pomarańcza'], ['oranges', 'pomarańcze'],
  ['lemon', 'cytryna'], ['lemons', 'cytryny'], ['lime', 'limonka'], ['limes', 'limonki'], ['pear', 'gruszka'], ['pears', 'gruszki'],
  ['grapes', 'winogrona'], ['strawberries', 'truskawki'], ['raspberries', 'maliny'], ['blueberries', 'borówki'], ['blackberries', 'jeżyny'],
  ['cherries', 'czereśnie'], ['plums', 'śliwki'], ['peaches', 'brzoskwinie'], ['nectarines', 'nektarynki'], ['apricots', 'morele'],
  ['kiwi', 'kiwi'], ['mango', 'mango'], ['pineapple', 'ananas'], ['melon', 'melon'], ['watermelon', 'arbuz'], ['avocado', 'awokado'], ['avocados', 'awokado'],
  ['pomegranate', 'granat'], ['grapefruit', 'grejpfrut'], ['tangerines', 'mandarynki'], ['clementines', 'klementynki'], ['dates', 'daktyle'], ['raisins', 'rodzynki'],
  ['tomato', 'pomidor'], ['tomatoes', 'pomidory'], ['cherry tomatoes', 'pomidorki koktajlowe'], ['cucumber', 'ogórek'], ['cucumbers', 'ogórki'],
  ['potato', 'ziemniak'], ['potatoes', 'ziemniaki'], ['sweet potato', 'batat'], ['sweet potatoes', 'bataty'], ['carrot', 'marchewka'], ['carrots', 'marchewki'],
  ['onion', 'cebula'], ['onions', 'cebule'], ['red onion', 'czerwona cebula'], ['spring onions', 'dymka'], ['shallots', 'szalotki'], ['garlic', 'czosnek'], ['ginger', 'imbir'],
  ['pepper', 'papryka'], ['peppers', 'papryki'], ['red pepper', 'czerwona papryka'], ['bell pepper', 'papryka'], ['chilli', 'papryczka chili'], ['chillies', 'papryczki chili'],
  ['broccoli', 'brokuł'], ['cauliflower', 'kalafior'], ['cabbage', 'kapusta'], ['red cabbage', 'czerwona kapusta'], ['brussels sprouts', 'brukselka'], ['kale', 'jarmuż'],
  ['spinach', 'szpinak'], ['lettuce', 'sałata'], ['rocket', 'rukola'], ['salad', 'sałata'], ['mixed salad', 'mix sałat'], ['celery', 'seler naciowy'], ['celeriac', 'seler'],
  ['courgette', 'cukinia'], ['zucchini', 'cukinia'], ['aubergine', 'bakłażan'], ['eggplant', 'bakłażan'], ['mushrooms', 'pieczarki'], ['mushroom', 'pieczarka'],
  ['leek', 'por'], ['leeks', 'pory'], ['beetroot', 'burak'], ['beetroots', 'buraki'], ['radishes', 'rzodkiewki'], ['parsnip', 'pasternak'], ['pumpkin', 'dynia'], ['squash', 'dynia'],
  ['peas', 'groszek'], ['green beans', 'fasolka szparagowa'], ['sweetcorn', 'kukurydza'], ['corn', 'kukurydza'], ['asparagus', 'szparagi'], ['fennel', 'koper włoski'],
  ['parsley', 'natka pietruszki'], ['coriander', 'kolendra'], ['cilantro', 'kolendra'], ['basil', 'bazylia'], ['mint', 'mięta'], ['dill', 'koperek'], ['chives', 'szczypiorek'],
  ['rosemary', 'rozmaryn'], ['thyme', 'tymianek'], ['herbs', 'zioła'], ['fruit', 'owoce'], ['vegetables', 'warzywa'], ['veg', 'warzywa'],
  // Meat & fish
  ['chicken', 'kurczak'], ['chicken breast', 'pierś z kurczaka'], ['chicken breasts', 'piersi z kurczaka'], ['chicken thighs', 'udka z kurczaka'], ['chicken wings', 'skrzydełka z kurczaka'],
  ['turkey', 'indyk'], ['beef', 'wołowina'], ['minced beef', 'mielona wołowina'], ['beef mince', 'mielona wołowina'], ['mince', 'mięso mielone'], ['steak', 'stek'],
  ['pork', 'wieprzowina'], ['pork chops', 'kotlety schabowe'], ['bacon', 'boczek'], ['ham', 'szynka'], ['sausages', 'kiełbaski'], ['sausage', 'kiełbasa'], ['salami', 'salami'], ['lamb', 'jagnięcina'],
  ['salmon', 'łosoś'], ['cod', 'dorsz'], ['tuna', 'tuńczyk'], ['tinned tuna', 'tuńczyk w puszce'], ['prawns', 'krewetki'], ['shrimp', 'krewetki'], ['fish', 'ryba'], ['mackerel', 'makrela'], ['smoked salmon', 'łosoś wędzony'],
  // Dairy & eggs
  ['milk', 'mleko'], ['oat milk', 'napój owsiany'], ['almond milk', 'napój migdałowy'], ['soy milk', 'napój sojowy'], ['butter', 'masło'], ['eggs', 'jajka'], ['egg', 'jajko'],
  ['cheese', 'ser'], ['cheddar', 'cheddar'], ['mozzarella', 'mozzarella'], ['parmesan', 'parmezan'], ['feta', 'feta'], ['halloumi', 'halloumi'], ['cream cheese', 'serek śmietankowy'],
  ['cottage cheese', 'serek wiejski'], ['yoghurt', 'jogurt'], ['yogurt', 'jogurt'], ['greek yoghurt', 'jogurt grecki'], ['greek yogurt', 'jogurt grecki'], ['natural yoghurt', 'jogurt naturalny'],
  ['cream', 'śmietana'], ['double cream', 'śmietanka 30%'], ['single cream', 'śmietanka 18%'], ['sour cream', 'kwaśna śmietana'], ['creme fraiche', 'crème fraîche'], ['quark', 'twaróg'],
  // Bakery
  ['bread', 'chleb'], ['wholemeal bread', 'chleb pełnoziarnisty'], ['rolls', 'bułki'], ['bread rolls', 'bułki'], ['bagels', 'bajgle'], ['wraps', 'tortille'], ['tortillas', 'tortille'],
  ['pitta', 'pita'], ['croissants', 'rogaliki'], ['crumpets', 'crumpety'], ['cake', 'ciasto'],
  // Cupboard
  ['rice', 'ryż'], ['basmati rice', 'ryż basmati'], ['pasta', 'makaron'], ['spaghetti', 'spaghetti'], ['penne', 'penne'], ['noodles', 'makaron azjatycki'], ['couscous', 'kuskus'], ['quinoa', 'komosa ryżowa'],
  ['oats', 'płatki owsiane'], ['porridge oats', 'płatki owsiane'], ['cereal', 'płatki śniadaniowe'], ['granola', 'granola'], ['muesli', 'musli'], ['flour', 'mąka'], ['sugar', 'cukier'], ['brown sugar', 'cukier brązowy'],
  ['salt', 'sól'], ['pepper grinder', 'pieprz'], ['black pepper', 'pieprz czarny'], ['olive oil', 'oliwa'], ['oil', 'olej'], ['vegetable oil', 'olej'], ['sunflower oil', 'olej słonecznikowy'], ['coconut oil', 'olej kokosowy'],
  ['vinegar', 'ocet'], ['balsamic vinegar', 'ocet balsamiczny'], ['soy sauce', 'sos sojowy'], ['ketchup', 'ketchup'], ['mayonnaise', 'majonez'], ['mayo', 'majonez'], ['mustard', 'musztarda'],
  ['honey', 'miód'], ['jam', 'dżem'], ['peanut butter', 'masło orzechowe'], ['nutella', 'nutella'], ['maple syrup', 'syrop klonowy'], ['stock', 'bulion'], ['stock cubes', 'kostki rosołowe'],
  ['chopped tomatoes', 'pomidory z puszki'], ['tinned tomatoes', 'pomidory z puszki'], ['passata', 'passata'], ['tomato puree', 'koncentrat pomidorowy'], ['tomato paste', 'koncentrat pomidorowy'],
  ['chickpeas', 'ciecierzyca'], ['lentils', 'soczewica'], ['red lentils', 'czerwona soczewica'], ['beans', 'fasola'], ['kidney beans', 'czerwona fasola'], ['baked beans', 'fasolka w sosie pomidorowym'], ['black beans', 'czarna fasola'],
  ['coconut milk', 'mleczko kokosowe'], ['nuts', 'orzechy'], ['walnuts', 'orzechy włoskie'], ['almonds', 'migdały'], ['cashews', 'nerkowce'], ['peanuts', 'orzeszki ziemne'], ['seeds', 'nasiona'], ['chia seeds', 'nasiona chia'],
  ['crisps', 'chipsy'], ['chips', 'frytki'], ['chocolate', 'czekolada'], ['dark chocolate', 'gorzka czekolada'], ['biscuits', 'herbatniki'], ['cookies', 'ciastka'], ['crackers', 'krakersy'], ['popcorn', 'popcorn'],
  ['cinnamon', 'cynamon'], ['paprika', 'papryka słodka'], ['cumin', 'kmin rzymski'], ['oregano', 'oregano'], ['curry powder', 'curry'], ['chilli flakes', 'płatki chili'], ['baking powder', 'proszek do pieczenia'], ['yeast', 'drożdże'],
  // Frozen & drinks
  ['frozen peas', 'mrożony groszek'], ['frozen berries', 'mrożone owoce leśne'], ['frozen vegetables', 'mrożone warzywa'], ['ice cream', 'lody'], ['ice', 'lód'], ['fish fingers', 'paluszki rybne'], ['pizza', 'pizza'],
  ['water', 'woda'], ['sparkling water', 'woda gazowana'], ['still water', 'woda niegazowana'], ['juice', 'sok'], ['orange juice', 'sok pomarańczowy'], ['apple juice', 'sok jabłkowy'],
  ['coffee', 'kawa'], ['tea', 'herbata'], ['green tea', 'zielona herbata'], ['wine', 'wino'], ['red wine', 'czerwone wino'], ['white wine', 'białe wino'], ['beer', 'piwo'], ['cola', 'cola'], ['lemonade', 'lemoniada'],
  // Household
  ['toilet paper', 'papier toaletowy'], ['toilet roll', 'papier toaletowy'], ['kitchen roll', 'ręczniki papierowe'], ['paper towels', 'ręczniki papierowe'], ['bin bags', 'worki na śmieci'],
  ['washing up liquid', 'płyn do naczyń'], ['dish soap', 'płyn do naczyń'], ['dishwasher tablets', 'tabletki do zmywarki'], ['laundry detergent', 'proszek do prania'], ['washing powder', 'proszek do prania'],
  ['fabric softener', 'płyn do płukania'], ['sponges', 'gąbki'], ['foil', 'folia aluminiowa'], ['cling film', 'folia spożywcza'], ['baking paper', 'papier do pieczenia'],
  ['shampoo', 'szampon'], ['conditioner', 'odżywka'], ['shower gel', 'żel pod prysznic'], ['soap', 'mydło'], ['toothpaste', 'pasta do zębów'], ['deodorant', 'dezodorant'], ['tissues', 'chusteczki'],
  ['nappies', 'pieluchy'], ['wipes', 'chusteczki nawilżane'], ['batteries', 'baterie'], ['light bulbs', 'żarówki'], ['cat food', 'karma dla kota'], ['dog food', 'karma dla psa'],
]

const EN = new Map<string, string>()
const PL = new Map<string, string>()
for (const [en, pl] of PAIRS) {
  if (!EN.has(en)) EN.set(en, pl)
  if (!PL.has(pl)) PL.set(pl, en)
}
// Polish words as they often get typed: without the Polish letters ("jablka", "maslo")
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const PL_PLAIN = new Map([...PL].map(([pl, en]) => [plain(pl), en]))

/** The name in `lang` if it's an everyday item we know, otherwise undefined (then the AI is asked). */
export function dictTranslate(name: string, lang: 'en' | 'pl'): string | undefined {
  const k = name.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!k) return undefined
  if (lang === 'pl') {
    if (PL.has(k)) return k // already Polish
    return EN.get(k) ?? EN.get(k.replace(/s$/, '')) ?? EN.get(k.replace(/es$/, '')) ?? (PL_PLAIN.has(plain(k)) ? PAIRS.find(([, pl]) => plain(pl) === plain(k))?.[1] : undefined)
  }
  if (EN.has(k) || EN.has(k.replace(/s$/, ''))) return k // already English
  return PL.get(k) ?? PL_PLAIN.get(plain(k))
}
