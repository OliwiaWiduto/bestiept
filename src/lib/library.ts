import type { Lang, Macros, Meal, Recipe, RecipeText } from '../types'
import { parseIngredient, uid } from './util'

// Bestie picks: our own high-protein recipes, quick and simple (10–15 minutes of hands-on time at most;
// oven or fridge time can be longer). They ship with the app, in English and Polish, and nobody has to save them.
// Nutrition per serving is worked out from the ingredients with our food data (scripts/check-foods.ts checks it).

export type Feel = 'sweet' | 'savoury'
type Text = { title: string; ingredients: string[]; steps: string[]; equipment: string[] }
export type LibRecipe = {
  id: string
  category: Meal
  servings: number
  /** Total time, oven or fridge included */
  minutes: number
  /** Time she's actually busy */
  handsOn: number
  feel: Feel
  nutrition: Macros
  en: Text
  pl: Text
}

const n = (kcal: number, protein: number, carbs: number, fat: number, fibre: number, sugar: number): Macros => ({ kcal, protein, carbs, fat, fibre, sugar })

export const LIBRARY: LibRecipe[] = [
  // Breakfast
  {
    id: 'bp-choc-oats', category: 'breakfast', servings: 1, minutes: 5, handsOn: 5, feel: 'sweet', nutrition: n(410, 40, 51, 8, 9, 15),
    en: {
      title: 'Chocolate protein overnight oats',
      ingredients: ['40g porridge oats', '150g skyr', '20g chocolate protein powder', '1 tsp cocoa powder', '100ml milk', '60g raspberries'],
      steps: ['Stir the oats, skyr, protein powder, cocoa and milk together in a jar until smooth.', 'Cover and leave in the fridge overnight, or for at least 2 hours.', "In the morning, give it a stir (add a splash of milk if it's thick) and top with the raspberries."],
      equipment: ['Jar with a lid'],
    },
    pl: {
      title: 'Czekoladowa owsianka proteinowa na noc',
      ingredients: ['40g płatków owsianych', '150g skyru', '20g czekoladowego białka w proszku', '1 łyżeczka kakao', '100ml mleka', '60g malin'],
      steps: ['Wymieszaj płatki, skyr, białko, kakao i mleko w słoiku na gładko.', 'Przykryj i odstaw do lodówki na noc albo przynajmniej na 2 godziny.', 'Rano zamieszaj (jeśli jest gęsta, dolej odrobinę mleka) i posyp malinami.'],
      equipment: ['Słoik z pokrywką'],
    },
  },
  {
    id: 'bp-berry-bowl', category: 'breakfast', servings: 1, minutes: 3, handsOn: 3, feel: 'sweet', nutrition: n(309, 25, 37, 6, 5, 23),
    en: {
      title: 'Berry skyr bowl with granola',
      ingredients: ['200g skyr', '80g mixed berries', '30g granola', '1 tsp honey'],
      steps: ['Spoon the skyr into a bowl.', 'Top with the berries and granola, then drizzle with the honey.', 'Using frozen berries? Put them in first and give them 10 minutes to soften.'],
      equipment: ['Bowl'],
    },
    pl: {
      title: 'Miska skyru z owocami i granolą',
      ingredients: ['200g skyru', '80g owoców leśnych', '30g granoli', '1 łyżeczka miodu'],
      steps: ['Przełóż skyr do miseczki.', 'Dodaj owoce i granolę, a na koniec polej miodem.', 'Owoce mrożone? Wrzuć je na początku i daj im 10 minut, żeby zmiękły.'],
      equipment: ['Miska'],
    },
  },
  {
    id: 'bp-cottage-pancakes', category: 'breakfast', servings: 1, minutes: 15, handsOn: 15, feel: 'sweet', nutrition: n(506, 34, 43, 23, 4, 13),
    en: {
      title: 'Cottage cheese pancakes',
      ingredients: ['150g cottage cheese', '2 eggs', '40g porridge oats', '½ tsp baking powder', '1 tsp butter', '60g blueberries', '1 tsp maple syrup'],
      steps: ['Blitz the cottage cheese, eggs, oats and baking powder in a blender until smooth.', 'Melt the butter in a non-stick frying pan over a medium heat.', 'Add 3 tablespoons of batter per pancake. Cook for 2 minutes until bubbles appear, flip and cook for 1 minute more.', 'Stack them up and top with the blueberries and maple syrup.'],
      equipment: ['Blender', 'Frying pan'],
    },
    pl: {
      title: 'Placuszki z serka wiejskiego',
      ingredients: ['150g serka wiejskiego', '2 jajka', '40g płatków owsianych', '½ łyżeczki proszku do pieczenia', '1 łyżeczka masła', '60g borówek', '1 łyżeczka syropu klonowego'],
      steps: ['Zmiksuj serek, jajka, płatki i proszek do pieczenia na gładko.', 'Rozpuść masło na patelni z powłoką nieprzywierającą na średnim ogniu.', 'Nakładaj po 3 łyżki ciasta na placuszek. Smaż 2 minuty, aż pojawią się bąbelki, przewróć i smaż jeszcze minutę.', 'Ułóż w stosik i dodaj borówki oraz syrop klonowy.'],
      equipment: ['Blender', 'Patelnia'],
    },
  },
  {
    id: 'bp-eggs-avo', category: 'breakfast', servings: 1, minutes: 10, handsOn: 10, feel: 'savoury', nutrition: n(484, 24, 30, 29, 4, 2),
    en: {
      title: 'Eggs and avocado on sourdough',
      ingredients: ['2 eggs', '60g sourdough bread', '½ avocado', '30g feta', '1 pinch chilli flakes'],
      steps: ['Toast the bread.', 'Meanwhile, poach the eggs, or fry them in a non-stick pan, for 2–3 minutes.', 'Mash the avocado onto the toast with a pinch of salt.', 'Top with the eggs, crumble over the feta and finish with the chilli flakes.'],
      equipment: ['Frying pan', 'Toaster'],
    },
    pl: {
      title: 'Jajka i awokado na chlebie na zakwasie',
      ingredients: ['2 jajka', '60g chleba na zakwasie', '½ awokado', '30g fety', '1 szczypta płatków chili'],
      steps: ['Opiecz chleb w tosterze.', 'W tym czasie ugotuj jajka w koszulkach albo usmaż je na patelni z powłoką nieprzywierającą, 2–3 minuty.', 'Rozgnieć awokado na grzance ze szczyptą soli.', 'Połóż jajka, pokrusz fetę i posyp płatkami chili.'],
      equipment: ['Patelnia', 'Toster'],
    },
  },
  {
    id: 'bp-salmon-bagel', category: 'breakfast', servings: 1, minutes: 5, handsOn: 5, feel: 'savoury', nutrition: n(381, 25, 45, 11, 2, 6),
    en: {
      title: 'Smoked salmon and cream cheese bagel',
      ingredients: ['1 bagel', '30g light cream cheese', '60g smoked salmon', '40g cucumber', '1 tsp lemon juice'],
      steps: ['Slice and toast the bagel.', 'Spread both halves with the cream cheese.', 'Add the salmon and sliced cucumber, squeeze over the lemon and finish with black pepper.'],
      equipment: ['Toaster', 'Knife'],
    },
    pl: {
      title: 'Bajgiel z wędzonym łososiem i serkiem',
      ingredients: ['1 bajgiel', '30g serka śmietankowego light', '60g wędzonego łososia', '40g ogórka', '1 łyżeczka soku z cytryny'],
      steps: ['Przekrój bajgiel i opiecz go w tosterze.', 'Posmaruj obie połówki serkiem.', 'Dodaj łososia i plasterki ogórka, skrop cytryną i oprósz pieprzem.'],
      equipment: ['Toster', 'Nóż'],
    },
  },
  {
    id: 'bp-banana-muffins', category: 'breakfast', servings: 3, minutes: 30, handsOn: 10, feel: 'sweet', nutrition: n(359, 22, 49, 9, 4, 22),
    en: {
      title: 'Banana bread protein muffins',
      ingredients: ['2 ripe bananas', '2 eggs', '150g skyr', '100g porridge oats', '30g vanilla protein powder', '1 tsp baking powder', '30g dark chocolate chips'],
      steps: ['Heat the oven to 180°C (160°C fan) and put 6 paper cases in a muffin tin.', 'Blitz everything except the chocolate in a blender until smooth.', 'Stir in most of the chocolate, spoon into the cases and scatter the rest on top.', 'Bake for 20 minutes until risen and golden. Makes 6 (2 per serving) and keeps in the fridge for 3 days.'],
      equipment: ['Blender', 'Muffin tin'],
    },
    pl: {
      title: 'Proteinowe muffinki bananowe',
      ingredients: ['2 dojrzałe banany', '2 jajka', '150g skyru', '100g płatków owsianych', '30g waniliowego białka w proszku', '1 łyżeczka proszku do pieczenia', '30g kropli czekoladowych'],
      steps: ['Rozgrzej piekarnik do 180°C (160°C z termoobiegiem) i włóż 6 papilotek do formy na muffinki.', 'Zmiksuj wszystko oprócz czekolady na gładko.', 'Wmieszaj większość czekolady, przełóż do papilotek i posyp resztą.', 'Piecz 20 minut, aż urosną i się zezłocą. Wychodzi 6 sztuk (2 na porcję), w lodówce wytrzymają 3 dni.'],
      equipment: ['Blender', 'Forma na muffinki'],
    },
  },
  {
    id: 'bp-iced-latte', category: 'breakfast', servings: 1, minutes: 3, handsOn: 3, feel: 'sweet', nutrition: n(169, 22, 11, 5, 1, 10),
    en: {
      title: 'Iced protein latte',
      ingredients: ['200ml milk', '20g vanilla protein powder', '30ml espresso', '1 handful ice'],
      steps: ['Shake or blend the milk and protein powder until smooth.', 'Fill a glass with ice, pour in the milk and top with the espresso.', 'No coffee machine? Stir 1 tsp instant coffee into 30ml hot water instead.'],
      equipment: ['Shaker or blender'],
    },
    pl: {
      title: 'Mrożona latte proteinowa',
      ingredients: ['200ml mleka', '20g waniliowego białka w proszku', '30ml espresso', '1 garść lodu'],
      steps: ['Wstrząśnij albo zmiksuj mleko z białkiem na gładko.', 'Wsyp lód do szklanki, wlej mleko i dolej espresso.', 'Nie masz ekspresu? Rozpuść łyżeczkę kawy rozpuszczalnej w 30 ml gorącej wody.'],
      equipment: ['Shaker albo blender'],
    },
  },
  // Lunch
  {
    id: 'bp-caesar-wrap', category: 'lunch', servings: 1, minutes: 5, handsOn: 5, feel: 'savoury', nutrition: n(431, 42, 35, 15, 3, 3),
    en: {
      title: 'Chicken caesar wrap',
      ingredients: ['1 tortilla wrap', '100g cooked chicken breast', '40g lettuce', '15g parmesan', '1 tbsp light mayo', '1 tsp lemon juice'],
      steps: ['Mix the mayo, lemon juice, most of the parmesan and a pinch of black pepper.', 'Slice the chicken and shred the lettuce.', 'Spread the dressing over the wrap, add the chicken, lettuce and the rest of the parmesan, then roll it up tightly.'],
      equipment: ['Bowl', 'Knife'],
    },
    pl: {
      title: 'Wrap z kurczakiem w stylu cezar',
      ingredients: ['1 tortilla', '100g pieczonego kurczaka', '40g sałaty', '15g parmezanu', '1 łyżka majonezu light', '1 łyżeczka soku z cytryny'],
      steps: ['Wymieszaj majonez, sok z cytryny, większość parmezanu i szczyptę pieprzu.', 'Pokrój kurczaka i porwij sałatę.', 'Posmaruj tortillę sosem, dodaj kurczaka, sałatę i resztę parmezanu, a potem ciasno zwiń.'],
      equipment: ['Miska', 'Nóż'],
    },
  },
  {
    id: 'bp-tuna-beans', category: 'lunch', servings: 2, minutes: 10, handsOn: 10, feel: 'savoury', nutrition: n(351, 38, 27, 10, 11, 7),
    en: {
      title: 'Tuna and white bean salad',
      ingredients: ['220g tinned tuna, drained', '240g cannellini beans, drained', '150g cherry tomatoes', '½ red onion', '1 tbsp olive oil', '1 lemon', '1 handful parsley'],
      steps: ['Drain the tuna and beans. Halve the tomatoes and finely slice the onion.', 'Mix the olive oil with the lemon juice, salt and pepper.', "Toss everything together with the parsley. It keeps in the fridge for 2 days, so it's perfect for lunch boxes."],
      equipment: ['Bowl', 'Knife'],
    },
    pl: {
      title: 'Sałatka z tuńczykiem i białą fasolą',
      ingredients: ['220g tuńczyka z puszki, odsączonego', '240g białej fasoli, odsączonej', '150g pomidorków koktajlowych', '½ czerwonej cebuli', '1 łyżka oliwy', '1 cytryna', '1 garść natki pietruszki'],
      steps: ['Odsącz tuńczyka i fasolę. Przekrój pomidorki na pół i drobno pokrój cebulę.', 'Wymieszaj oliwę z sokiem z cytryny, solą i pieprzem.', 'Połącz wszystko z natką. W lodówce wytrzyma 2 dni, więc idealnie nadaje się do pudełka na lunch.'],
      equipment: ['Miska', 'Nóż'],
    },
  },
  {
    id: 'bp-halloumi-lentils', category: 'lunch', servings: 2, minutes: 10, handsOn: 10, feel: 'savoury', nutrition: n(416, 24, 32, 21, 9, 8),
    en: {
      title: 'Halloumi and lentil bowl',
      ingredients: ['250g cooked lentils', '100g halloumi', '120g roasted red peppers from a jar', '60g rocket', '1 tbsp olive oil', '1 tsp honey', '1 lemon'],
      steps: ['Slice the halloumi and fry it in a dry non-stick pan for 2 minutes on each side until golden.', 'Warm the lentils in the microwave for 1 minute, or use them cold.', 'Mix the olive oil, honey, lemon juice, salt and pepper.', 'Pile the lentils, sliced peppers and rocket into bowls, top with the halloumi and drizzle with the dressing.'],
      equipment: ['Frying pan', 'Bowl'],
    },
    pl: {
      title: 'Miska z halloumi i soczewicą',
      ingredients: ['250g gotowanej soczewicy', '100g halloumi', '120g pieczonej papryki ze słoika', '60g rukoli', '1 łyżka oliwy', '1 łyżeczka miodu', '1 cytryna'],
      steps: ['Pokrój halloumi w plastry i smaż na suchej patelni po 2 minuty z każdej strony, aż się zezłoci.', 'Podgrzej soczewicę przez minutę w mikrofali albo podaj ją na zimno.', 'Wymieszaj oliwę, miód, sok z cytryny, sól i pieprz.', 'Ułóż w miskach soczewicę, paski papryki i rukolę, dodaj halloumi i polej sosem.'],
      equipment: ['Patelnia', 'Miska'],
    },
  },
  {
    id: 'bp-turkey-toastie', category: 'lunch', servings: 1, minutes: 8, handsOn: 8, feel: 'savoury', nutrition: n(361, 28, 30, 15, 5, 5),
    en: {
      title: 'Turkey pesto toastie',
      ingredients: ['2 slices wholemeal bread', '70g sliced turkey breast', '30g mozzarella', '1 tbsp pesto', '1 tomato'],
      steps: ['Spread the pesto on one slice of bread.', 'Layer on the turkey, sliced tomato and torn mozzarella, then top with the other slice.', 'Cook in a toastie maker, or in a dry frying pan pressed down with a spatula, for 3 minutes on each side until golden and melty.'],
      equipment: ['Frying pan'],
    },
    pl: {
      title: 'Tost z indykiem i pesto',
      ingredients: ['2 kromki chleba pełnoziarnistego', '70g polędwicy z indyka', '30g mozzarelli', '1 łyżka pesto', '1 pomidor'],
      steps: ['Posmaruj jedną kromkę pesto.', 'Ułóż indyka, plasterki pomidora i porwaną mozzarellę, a potem przykryj drugą kromką.', 'Opiekaj w opiekaczu albo na suchej patelni, dociskając łopatką, po 3 minuty z każdej strony, aż się zezłoci i ser się roztopi.'],
      equipment: ['Patelnia'],
    },
  },
  {
    id: 'bp-prawn-noodles', category: 'lunch', servings: 2, minutes: 10, handsOn: 10, feel: 'savoury', nutrition: n(453, 35, 59, 10, 9, 12),
    en: {
      title: 'Prawn and edamame noodles',
      ingredients: ['120g egg noodles', '200g raw king prawns', '150g frozen edamame', '1 red pepper', '2 tbsp soy sauce', '1 tbsp sweet chilli sauce', '1 tsp sesame oil'],
      steps: ['Cook the noodles following the packet, adding the edamame for the last 2 minutes. Drain.', 'Meanwhile, heat the sesame oil in a wok or large pan and stir-fry the sliced pepper and prawns for 3–4 minutes until the prawns turn pink.', 'Add the noodles, edamame, soy and sweet chilli sauce and toss for 1 minute.'],
      equipment: ['Wok', 'Saucepan'],
    },
    pl: {
      title: 'Makaron z krewetkami i edamame',
      ingredients: ['120g makaronu jajecznego', '200g surowych krewetek', '150g mrożonej edamame', '1 czerwona papryka', '2 łyżki sosu sojowego', '1 łyżka słodkiego sosu chili', '1 łyżeczka oleju sezamowego'],
      steps: ['Ugotuj makaron według opakowania, a na ostatnie 2 minuty dorzuć edamame. Odcedź.', 'W tym czasie rozgrzej olej w woku albo na dużej patelni i smaż paski papryki z krewetkami 3–4 minuty, aż krewetki się zaróżowią.', 'Dodaj makaron, edamame, sos sojowy i słodki sos chili i mieszaj jeszcze przez minutę.'],
      equipment: ['Wok', 'Garnek'],
    },
  },
  // Dinner
  {
    id: 'bp-chicken-orzo', category: 'dinner', servings: 2, minutes: 25, handsOn: 10, feel: 'savoury', nutrition: n(536, 51, 62, 11, 4, 5),
    en: {
      title: 'Creamy chicken orzo',
      ingredients: ['300g chicken breast', '1 tsp olive oil', '2 garlic cloves', '150g orzo', '500ml chicken stock', '80g light cream cheese', '60g spinach'],
      steps: ['Cut the chicken into bite-size pieces. Heat the oil in a large deep pan and fry the chicken for 5 minutes until golden.', 'Add the crushed garlic for 30 seconds, then stir in the orzo and stock.', 'Simmer for 10–12 minutes, stirring now and then, until the orzo is soft and most of the stock has gone.', 'Stir in the cream cheese and spinach until creamy and wilted. Season and serve.'],
      equipment: ['Large frying pan', 'Wooden spoon'],
    },
    pl: {
      title: 'Kremowe orzo z kurczakiem',
      ingredients: ['300g piersi z kurczaka', '1 łyżeczka oliwy', '2 ząbki czosnku', '150g makaronu orzo', '500ml bulionu drobiowego', '80g serka śmietankowego light', '60g szpinaku'],
      steps: ['Pokrój kurczaka w kostkę. Rozgrzej oliwę na dużej, głębokiej patelni i smaż kurczaka 5 minut, aż się zezłoci.', 'Dodaj przeciśnięty czosnek na 30 sekund, a potem wsyp orzo i wlej bulion.', 'Gotuj na małym ogniu 10–12 minut, od czasu do czasu mieszając, aż orzo zmięknie i wchłonie większość bulionu.', 'Wmieszaj serek i szpinak, aż sos będzie kremowy, a szpinak zwiędnie. Dopraw i podawaj.'],
      equipment: ['Duża patelnia', 'Drewniana łyżka'],
    },
  },
  {
    id: 'bp-turkey-bolognese', category: 'dinner', servings: 3, minutes: 25, handsOn: 10, feel: 'savoury', nutrition: n(496, 39, 59, 12, 6, 11),
    en: {
      title: 'Turkey bolognese',
      ingredients: ['400g turkey mince', '1 onion', '2 garlic cloves', '500g passata', '1 tsp dried oregano', '180g spaghetti', '20g parmesan'],
      steps: ['Put the spaghetti on to cook following the packet.', 'Meanwhile, fry the turkey mince and chopped onion in a large non-stick pan for 6–7 minutes until browned, breaking up the mince.', 'Add the garlic and oregano for 1 minute, then pour in the passata. Simmer for 10 minutes and season well.', 'Toss with the drained spaghetti and top with the parmesan.'],
      equipment: ['Large frying pan', 'Saucepan'],
    },
    pl: {
      title: 'Bolognese z indykiem',
      ingredients: ['400g mielonego mięsa z indyka', '1 cebula', '2 ząbki czosnku', '500g passaty', '1 łyżeczka suszonego oregano', '180g spaghetti', '20g parmezanu'],
      steps: ['Nastaw spaghetti według opakowania.', 'W tym czasie smaż mięso z posiekaną cebulą na dużej patelni 6–7 minut, aż się zrumieni, rozbijając grudki.', 'Dodaj czosnek i oregano na minutę, potem wlej passatę. Gotuj 10 minut i dobrze dopraw.', 'Wymieszaj z odcedzonym spaghetti i posyp parmezanem.'],
      equipment: ['Duża patelnia', 'Garnek'],
    },
  },
  {
    id: 'bp-salmon-teriyaki', category: 'dinner', servings: 2, minutes: 15, handsOn: 5, feel: 'savoury', nutrition: n(593, 38, 51, 26, 6, 8),
    en: {
      title: 'Salmon teriyaki rice bowl',
      ingredients: ['2 salmon fillets', '3 tbsp teriyaki sauce', '250g microwave rice', '150g frozen edamame', '½ cucumber', '2 spring onions'],
      steps: ['Heat the oven to 200°C (180°C fan), or an air fryer to 200°C. Brush the salmon with 2 tablespoons of the teriyaki sauce.', 'Cook for 12 minutes (9 in the air fryer) until it flakes easily.', 'Meanwhile, microwave the rice and edamame, and slice the cucumber and spring onions.', 'Pile into bowls, add the salmon and drizzle with the rest of the sauce.'],
      equipment: ['Baking tray or air fryer'],
    },
    pl: {
      title: 'Miska ryżowa z łososiem teriyaki',
      ingredients: ['2 filety z łososia', '3 łyżki sosu teriyaki', '250g ryżu do mikrofali', '150g mrożonej edamame', '½ ogórka', '2 dymki'],
      steps: ['Rozgrzej piekarnik do 200°C (180°C z termoobiegiem) albo frytkownicę beztłuszczową do 200°C. Posmaruj łososia 2 łyżkami sosu teriyaki.', 'Piecz 12 minut (we frytkownicy 9), aż zacznie się rozpadać na płatki.', 'W tym czasie podgrzej ryż i edamame w mikrofali, a ogórek i dymkę pokrój.', 'Ułóż wszystko w miskach, dodaj łososia i polej resztą sosu.'],
      equipment: ['Blacha albo frytkownica beztłuszczowa'],
    },
  },
  {
    id: 'bp-chicken-curry', category: 'dinner', servings: 3, minutes: 25, handsOn: 12, feel: 'savoury', nutrition: n(322, 33, 23, 10, 7, 10),
    en: {
      title: 'Chicken, chickpea and spinach curry',
      ingredients: ['300g chicken breast', '1 onion', '2 tbsp curry paste', '240g chickpeas (1 tin, drained)', '400g chopped tomatoes', '200ml light coconut milk', '100g spinach'],
      steps: ['Fry the chopped onion and bite-size pieces of chicken in a large non-stick pan for 5 minutes.', 'Stir in the curry paste for 1 minute, then add the chickpeas, tomatoes and coconut milk.', 'Simmer for 12 minutes until the chicken is cooked through and the sauce has thickened.', 'Stir in the spinach until it wilts. Lovely with rice or naan and a spoonful of yoghurt.'],
      equipment: ['Large frying pan'],
    },
    pl: {
      title: 'Curry z kurczakiem, ciecierzycą i szpinakiem',
      ingredients: ['300g piersi z kurczaka', '1 cebula', '2 łyżki pasty curry', '240g ciecierzycy (1 puszka, odsączona)', '400g pomidorów z puszki', '200ml mleczka kokosowego light', '100g szpinaku'],
      steps: ['Smaż posiekaną cebulę z kawałkami kurczaka na dużej patelni przez 5 minut.', 'Wmieszaj pastę curry na minutę, potem dodaj ciecierzycę, pomidory i mleczko kokosowe.', 'Gotuj na małym ogniu 12 minut, aż kurczak będzie gotowy, a sos zgęstnieje.', 'Wmieszaj szpinak, aż zwiędnie. Pyszne z ryżem albo naanem i łyżką jogurtu.'],
      equipment: ['Duża patelnia'],
    },
  },
  {
    id: 'bp-beef-tacos', category: 'dinner', servings: 2, minutes: 15, handsOn: 15, feel: 'savoury', nutrition: n(545, 42, 62, 14, 11, 4),
    en: {
      title: 'Beef and black bean tacos',
      ingredients: ['250g 5% fat beef mince', '200g black beans, drained', '1 tsp smoked paprika', '1 tsp ground cumin', '6 mini tortillas', '60g Greek yoghurt', '1 lime'],
      steps: ['Fry the mince in a dry non-stick pan for 5 minutes until browned, breaking it up.', 'Add the beans, spices, a pinch of salt and a splash of water. Cook for 3 minutes, roughly mashing some of the beans.', 'Warm the tortillas in the microwave for 20 seconds.', 'Fill with the beef and beans, add a spoonful of yoghurt and a squeeze of lime.'],
      equipment: ['Frying pan'],
    },
    pl: {
      title: 'Tacos z wołowiną i czarną fasolą',
      ingredients: ['250g chudej wołowiny mielonej (5%)', '200g czarnej fasoli, odsączonej', '1 łyżeczka wędzonej papryki', '1 łyżeczka mielonego kuminu', '6 małych tortilli', '60g jogurtu greckiego', '1 limonka'],
      steps: ['Smaż mięso na suchej patelni 5 minut, aż się zrumieni, rozbijając grudki.', 'Dodaj fasolę, przyprawy, szczyptę soli i odrobinę wody. Smaż 3 minuty, rozgniatając część fasoli.', 'Podgrzej tortille w mikrofali przez 20 sekund.', 'Nałóż mięso z fasolą, dodaj łyżkę jogurtu i skrop limonką.'],
      equipment: ['Patelnia'],
    },
  },
  {
    id: 'bp-gnocchi-traybake', category: 'dinner', servings: 3, minutes: 35, handsOn: 10, feel: 'savoury', nutrition: n(558, 30, 71, 16, 8, 13),
    en: {
      title: 'Chicken sausage and gnocchi traybake',
      ingredients: ['500g gnocchi', '400g chicken sausages', '2 peppers', '1 red onion', '250g cherry tomatoes', '1 tbsp olive oil', '1 tsp dried oregano'],
      steps: ['Heat the oven to 220°C (200°C fan).', 'Cut the sausages into chunks and the peppers and onion into wedges. Tip onto a large tray with the gnocchi and tomatoes.', 'Toss with the oil, oregano, salt and pepper.', 'Roast for 25 minutes, shaking halfway, until the gnocchi are crisp and the sausages are cooked.'],
      equipment: ['Large baking tray'],
    },
    pl: {
      title: 'Kopytka z kiełbaskami drobiowymi z piekarnika',
      ingredients: ['500g kopytek', '400g kiełbasek drobiowych', '2 papryki', '1 czerwona cebula', '250g pomidorków koktajlowych', '1 łyżka oliwy', '1 łyżeczka suszonego oregano'],
      steps: ['Rozgrzej piekarnik do 220°C (200°C z termoobiegiem).', 'Pokrój kiełbaski na kawałki, a paprykę i cebulę w łódeczki. Wyłóż na dużą blachę razem z kopytkami i pomidorkami.', 'Wymieszaj z oliwą, oregano, solą i pieprzem.', 'Piecz 25 minut, w połowie potrząsając blachą, aż kopytka będą chrupiące, a kiełbaski upieczone.'],
      equipment: ['Duża blacha'],
    },
  },
  {
    id: 'bp-mac-cheese', category: 'dinner', servings: 2, minutes: 15, handsOn: 15, feel: 'savoury', nutrition: n(477, 29, 71, 10, 6, 9),
    en: {
      title: 'High-protein mac and cheese',
      ingredients: ['160g macaroni', '100g frozen peas', '150g cottage cheese', '100ml milk', '1 tsp mustard', '50g reduced-fat cheddar'],
      steps: ['Cook the macaroni following the packet, adding the peas for the last 3 minutes.', 'Meanwhile, blitz the cottage cheese, milk and mustard until smooth.', 'Drain the pasta, put it back in the pan over a low heat and stir in the sauce and grated cheddar until melted and creamy. Season with black pepper.'],
      equipment: ['Saucepan', 'Blender', 'Grater'],
    },
    pl: {
      title: 'Proteinowy makaron z serem',
      ingredients: ['160g makaronu kolanka', '100g mrożonego groszku', '150g serka wiejskiego', '100ml mleka', '1 łyżeczka musztardy', '50g sera cheddar light'],
      steps: ['Ugotuj makaron według opakowania, a na ostatnie 3 minuty dorzuć groszek.', 'W tym czasie zmiksuj serek, mleko i musztardę na gładko.', 'Odcedź makaron, wróć z nim do garnka na mały ogień i wmieszaj sos oraz starty cheddar, aż się roztopi i zrobi się kremowo. Dopraw pieprzem.'],
      equipment: ['Garnek', 'Blender', 'Tarka'],
    },
  },
  // Snacks
  {
    id: 'bp-hot-chocolate', category: 'snack', servings: 1, minutes: 5, handsOn: 5, feel: 'sweet', nutrition: n(202, 25, 16, 6, 2, 13),
    en: {
      title: 'Protein hot chocolate',
      ingredients: ['250ml milk', '20g chocolate protein powder', '1 tsp cocoa powder'],
      steps: ['Warm the milk in a pan or the microwave until steaming, but not boiling.', 'Whisk in the protein powder and cocoa until smooth and frothy.'],
      equipment: ['Saucepan', 'Whisk'],
    },
    pl: {
      title: 'Proteinowa gorąca czekolada',
      ingredients: ['250ml mleka', '20g czekoladowego białka w proszku', '1 łyżeczka kakao'],
      steps: ['Podgrzej mleko w garnuszku albo w mikrofali, aż zacznie parować, ale nie zagotuj.', 'Wmieszaj trzepaczką białko i kakao, aż będzie gładko i pianka.'],
      equipment: ['Garnek', 'Trzepaczka'],
    },
  },
  {
    id: 'bp-yoghurt-bark', category: 'snack', servings: 4, minutes: 130, handsOn: 10, feel: 'sweet', nutrition: n(124, 11, 14, 3, 1, 12),
    en: {
      title: 'Frozen berry yoghurt bark',
      ingredients: ['400g skyr', '1 tbsp honey', '100g mixed berries', '30g dark chocolate'],
      steps: ['Line a small tray with baking paper.', 'Mix the skyr and honey and spread it out about 1cm thick.', 'Scatter over the berries, then drizzle with the chocolate, melted for 30 seconds in the microwave.', 'Freeze for 2 hours, then snap into pieces. Keeps in the freezer for a month.'],
      equipment: ['Baking paper', 'Small tray'],
    },
    pl: {
      title: 'Mrożona kora jogurtowa z owocami',
      ingredients: ['400g skyru', '1 łyżka miodu', '100g owoców leśnych', '30g gorzkiej czekolady'],
      steps: ['Wyłóż małą blaszkę papierem do pieczenia.', 'Wymieszaj skyr z miodem i rozsmaruj na grubość około 1 cm.', 'Posyp owocami i polej czekoladą roztopioną przez 30 sekund w mikrofali.', 'Zamroź na 2 godziny, potem połam na kawałki. W zamrażarce wytrzyma miesiąc.'],
      equipment: ['Papier do pieczenia', 'Mała blaszka'],
    },
  },
  {
    id: 'bp-cottage-crackers', category: 'snack', servings: 1, minutes: 3, handsOn: 3, feel: 'savoury', nutrition: n(260, 19, 28, 8, 2, 8),
    en: {
      title: 'Cottage cheese rice cakes with tomatoes',
      ingredients: ['150g cottage cheese', '3 rice cakes', '80g cherry tomatoes', '1 pinch black pepper', '1 pinch chilli flakes'],
      steps: ['Spoon the cottage cheese onto the rice cakes.', 'Top with the halved tomatoes, black pepper and chilli flakes.'],
      equipment: ['Knife'],
    },
    pl: {
      title: 'Wafle ryżowe z serkiem wiejskim i pomidorkami',
      ingredients: ['150g serka wiejskiego', '3 wafle ryżowe', '80g pomidorków koktajlowych', '1 szczypta pieprzu', '1 szczypta płatków chili'],
      steps: ['Nałóż serek na wafle.', 'Dodaj przekrojone pomidorki, pieprz i płatki chili.'],
      equipment: ['Nóż'],
    },
  },
  {
    id: 'bp-nutella-cakes', category: 'snack', servings: 1, minutes: 3, handsOn: 3, feel: 'sweet', nutrition: n(170, 3, 28, 5, 3, 13),
    en: {
      title: 'Chocolate hazelnut rice cakes with berries',
      ingredients: ['2 rice cakes', '15g chocolate hazelnut spread', '60g strawberries', '20g blueberries'],
      steps: ['Spread the chocolate hazelnut spread over the rice cakes.', 'Top with sliced strawberries and blueberries. All the chocolate, a fraction of a brownie.'],
      equipment: ['Knife'],
    },
    pl: {
      title: 'Wafle ryżowe z kremem czekoladowo-orzechowym i owocami',
      ingredients: ['2 wafle ryżowe', '15g kremu czekoladowo-orzechowego', '60g truskawek', '20g borówek'],
      steps: ['Posmaruj wafle kremem czekoladowo-orzechowym.', 'Dodaj pokrojone truskawki i borówki. Cała czekoladowa przyjemność, a dużo lżej niż brownie.'],
      equipment: ['Nóż'],
    },
  },
  {
    id: 'bp-pb-dip', category: 'snack', servings: 1, minutes: 3, handsOn: 3, feel: 'sweet', nutrition: n(275, 20, 30, 9, 3, 29),
    en: {
      title: 'Peanut butter yoghurt dip with apple',
      ingredients: ['150g skyr', '1 tbsp peanut butter', '1 tsp honey', '1 apple'],
      steps: ['Swirl the peanut butter and honey through the skyr.', 'Slice the apple and dip away. A pinch of cinnamon on top is lovely.'],
      equipment: ['Bowl', 'Knife'],
    },
    pl: {
      title: 'Jogurtowy dip z masłem orzechowym i jabłkiem',
      ingredients: ['150g skyru', '1 łyżka masła orzechowego', '1 łyżeczka miodu', '1 jabłko'],
      steps: ['Wmieszaj masło orzechowe i miód w skyr, zostawiając smugi.', 'Pokrój jabłko w plasterki i maczaj. Szczypta cynamonu na wierzchu to strzał w dziesiątkę.'],
      equipment: ['Miska', 'Nóż'],
    },
  },
  {
    id: 'bp-edamame', category: 'snack', servings: 1, minutes: 5, handsOn: 5, feel: 'savoury', nutrition: n(223, 18, 13, 11, 9, 5),
    en: {
      title: 'Salt and chilli edamame',
      ingredients: ['150g frozen edamame', '1 pinch sea salt', '1 pinch chilli flakes', '½ lime'],
      steps: ['Cook the edamame in boiling water, or in the microwave, for 3–4 minutes. Drain.', 'Toss with the salt, chilli and a squeeze of lime. Best eaten warm.'],
      equipment: ['Saucepan'],
    },
    pl: {
      title: 'Edamame z solą i chili',
      ingredients: ['150g mrożonej edamame', '1 szczypta soli morskiej', '1 szczypta płatków chili', '½ limonki'],
      steps: ['Gotuj edamame we wrzątku albo w mikrofali 3–4 minuty. Odcedź.', 'Wymieszaj z solą, chili i skrop limonką. Najlepsze na ciepło.'],
      equipment: ['Garnek'],
    },
  },
  {
    id: 'bp-choc-mousse', category: 'snack', servings: 1, minutes: 3, handsOn: 3, feel: 'sweet', nutrition: n(233, 34, 22, 2, 5, 15),
    en: {
      title: 'Chocolate protein mousse',
      ingredients: ['200g skyr', '15g chocolate protein powder', '1 tsp cocoa powder', '1 tsp honey', '50g raspberries'],
      steps: ['Whisk the skyr, protein powder, cocoa and honey together until smooth.', 'Top with the raspberries. Chill for 10 minutes if you like it thicker.'],
      equipment: ['Bowl', 'Whisk'],
    },
    pl: {
      title: 'Czekoladowy mus proteinowy',
      ingredients: ['200g skyru', '15g czekoladowego białka w proszku', '1 łyżeczka kakao', '1 łyżeczka miodu', '50g malin'],
      steps: ['Wymieszaj trzepaczką skyr, białko, kakao i miód na gładko.', 'Posyp malinami. Jeśli wolisz gęstszy, schłodź go przez 10 minut.'],
      equipment: ['Miska', 'Trzepaczka'],
    },
  },
]

export const libById = (id: string | undefined) => LIBRARY.find((r) => r.id === id)

/** Each Bestie pick has its own illustration of the finished dish, found by its title in either language. */
const BY_TITLE = new Map(LIBRARY.flatMap((l) => [[l.en.title.toLowerCase(), l.id], [l.pl.title.toLowerCase(), l.id]]))
export const libArt = (title?: string) => { const id = title && BY_TITLE.get(title.trim().toLowerCase()); return id ? `/icons/bp/${id}.webp` : null }

const asText = (t: Text, orig: Text): RecipeText => ({
  title: t.title,
  // Lines without a unit ("2 eggs") keep the counting word in the name, like our starter recipes.
  ingredients: t.ingredients.map((l, i) => {
    const p = parseIngredient(l)
    const o = parseIngredient(orig.ingredients[i] ?? '')
    return !o.unit && p.unit && !/^(g|kg|ml|l)$/.test(p.unit) ? `${p.unit} ${p.name}` : p.name
  }),
  steps: t.steps,
  equipment: t.equipment,
})

/** A library recipe as a normal recipe in this language. Its id is the library id until she saves a copy. */
export function libRecipe(l: LibRecipe, lang: Lang, id = l.id): Recipe {
  const other: Lang = lang === 'pl' ? 'en' : 'pl'
  const t = l[lang]
  return {
    id, libId: l.id, title: t.title, category: l.category, servings: l.servings, minutes: l.minutes, handsOn: l.handsOn,
    favourite: false, ingredients: t.ingredients.map(parseIngredient), equipment: t.equipment, steps: t.steps,
    nutrition: l.nutrition, createdAt: Date.now(), lang, tr: { [other]: asText(l[other], t) },
  }
}

/** Her own copy of a library recipe (made the first time she plans, cooks or saves it), so plans, logs and shopping work as usual. */
export function ownCopy(libId: string, recipes: Recipe[], lang: Lang, save: (r: Recipe) => void): Recipe | null {
  const have = recipes.find((r) => r.libId === libId && !r.ownerId)
  if (have) return have
  const l = libById(libId)
  if (!l) return null
  const r = libRecipe(l, lang, uid())
  save(r)
  return r
}
