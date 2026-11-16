import { useStore } from './store'
import type { Lang } from './types'

/**
 * All app text lives here, in English and Polish.
 * Voice: warm, encouraging, young but not cringe. Never judgy about food.
 * Polish copy should be checked by a native speaker before public launch.
 */
const en = {
  signIn: 'Sign in', signUp: 'Create account', email: 'Email', password: 'Password', passwordHint: 'At least 8 characters',
  haveAccount: 'Already have an account? Sign in', noAccount: 'New here? Create an account', forgot: 'Forgot your password?', sendReset: 'Send reset link',
  resetSent: 'Check your email for a link to reset your password.', checkEmail: 'Nearly there. Check your email to confirm your account, then come back and sign in.',
  newPassword: 'Choose a new password', setPassword: 'Save new password', authError: 'That didn’t work. Check your email and password and try again.',
  emailTaken: 'There’s already an account with that email. Try signing in.', syncing: 'Getting your things…', account: 'Account', signOut: 'Sign out',
  signedInAs: 'Signed in as {email}', syncError: 'Couldn’t sync just now. Your changes are safe on this phone and will sync later.', authSub: 'Sign in so your recipes and progress are saved, whatever phone you’re on.',
  units: 'Units', metric: 'Metric (kg, cm)', imperial: 'Imperial (st, lb, ft)', height: 'Height',
  tgIntro: 'These are worked out from your details and goal. You don’t need to do anything with them, we’ll keep an eye on them for you.',
  ex_kcal: 'Energy for your day, set to match your goal.', ex_protein: 'Keeps you full and helps your muscles.', ex_carbs: 'Your main source of energy.',
  ex_fat: 'Helps your body use vitamins and keeps hormones happy.', ex_fibre: 'Good for digestion and keeps you fuller for longer.', ex_sugar: 'A limit, not a target. Going over now and then is fine.',
  customise: 'I know my numbers, let me change them', customiseHint: 'Only change these if you’ve been given numbers by a coach or dietitian.', useRecommended: 'Use the recommended targets',
  pwaIos: 'Add BestiePT to your home screen: tap {share} then “Add to Home Screen”.', pwaOther: 'Install BestiePT on your phone for the full app feel.', install: 'Install', dismiss: 'Dismiss',
  ownMeal: 'Its own meal', addToExisting: 'Add to a meal', noMealsYet: 'Nothing logged on this day yet, so pick a meal and we’ll start it.', addToNamed: 'Add to {name}', addedToNamed: 'Added to {name}',
  save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', back: 'Back', done: 'Done', add: 'Add', close: 'Close',
  next: 'Next', continue: 'Continue', skip: 'Skip', kcal: 'kcal', g: 'g', remove: 'Remove', search: 'Search',

  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
  calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fibre: 'Fibre', sugar: 'Sugar', limit: 'limit',

  navToday: 'Today', navRecipes: 'Recipes', navPlan: 'Plan', navShopping: 'Shopping', logFood: 'Log food', settings: 'Settings',

  obWelcome: 'Hey, I’m your food bestie', obWelcomeSub: 'Save recipes from anywhere, cook hands-free, plan your week and keep track of what you eat.',
  obLanguage: 'Language', obStart: 'Get started',
  obName: 'What should we call you?', obNamePh: 'Your name',
  obAbout: 'A bit about you', obAboutSub: 'We use this to work out your daily targets. It stays on your phone.',
  age: 'Age', heightCm: 'Height (cm)', weightKg: 'Weight (kg)', sex: 'Sex', female: 'Female', male: 'Male',
  obActivity: 'How active are you?',
  actLow: 'Mostly sitting', actLight: 'Light exercise 1–3 days a week', actModerate: 'Exercise 3–5 days a week', actHigh: 'Exercise most days',
  obGoal: 'What’s the goal?', goalLose: 'Lose weight', goalMaintain: 'Stay where I am', goalGain: 'Gain weight',
  obTargets: 'Your daily targets', obTargetsSub: 'A good starting point. Change any of these whenever you like in Settings.',
  obSamples: 'Add 3 sample recipes so you can try things out', obGo: 'Let’s go',

  morning: 'Morning, {name}', afternoon: 'Hey, {name}', evening: 'Evening, {name}',
  today: 'Today', kcalLeft: 'kcal left today', kcalOver: 'kcal over today', yourMeals: 'Your meals',
  dinnerEmpty: 'What are we having tonight?', addMeal: 'Add a meal', mealEmpty: 'Nothing logged yet',
  weight: 'Weight', logToday: 'Log today', seeTrends: 'See trends', prevDay: 'Previous day', nextDay: 'Next day', backToToday: 'Back to today',
  weightDown: 'Down {n} this week', weightUp: 'Up {n} this week', weightSame: 'Same as last week', weightNone: 'Log your first weigh-in',

  nProteinToGo: 'Only {n}g of protein to go. A Greek yoghurt would do it.',
  nProteinDone: 'Protein goal smashed. Proud of you.',
  nSugarOver: 'A bit over on sugar today. Honestly fine, we go again tomorrow.',
  nKcalOver: 'Bit over today, which is fine. One day doesn’t change the trend.',
  nMorning: 'Morning. What are we having for breakfast?',
  nNothing: 'Nothing logged yet. No pressure, log whenever you’re ready.',
  nOnTrack: 'You’re right on track today.',
  nFibre: 'Fibre’s a bit low. Some berries or beans would help.',

  logWeight: 'Log your weight', weightSaved: 'Saved. Look at the trend, not the day.', weightUpMsg: 'Up a little today, which is normal. Look at the trend, not the day.',
  targetsUpdated: 'Your weight changed, so we updated your daily targets.',

  fromRecipe: 'From a recipe', searchFoods: 'Search foods', quickAdd: 'Quick add', barcode: 'Barcode', photoScan: 'Scan a photo',
  comingSoon: 'Coming in the next version', searchPh: 'Search foods, e.g. banana', noResults: 'Nothing found. Try Quick add instead.',
  howMuch: 'How much?', servingsEaten: 'Servings eaten', whichMeal: 'Which meal?', addToMeal: 'Add to {meal}',
  quickName: 'What was it?', enterBarcode: 'Barcode number', lookUp: 'Look it up', notFound: 'We couldn’t find that one. Try Quick add.',
  lookingUp: 'Looking it up…', foodData: 'Food data from Open Food Facts', approx: 'Typical values',
  per100: 'per 100g', grams: 'Grams',

  yourMeal: 'Your meal', whatsIn: 'What’s in it', addSomething: 'Add something we missed', addHint: 'Cooked it in oil? Add it here, it counts.',
  saveTo: 'Save to {meal}', deleteMeal: 'Delete this meal', addPhoto: 'Add a photo', changePhoto: 'Change photo', ingredientsN: '{n} ingredients', itemName: 'Name',

  recipes: 'Recipes', all: 'All', favourites: 'Favourites', searchRecipes: 'Search recipes or ingredients', addRecipe: 'Add a recipe',
  emptyRecipes: 'Nothing here yet. Add a recipe you love and we’ll save it.', minutes: '{n} min', stepsN: '{n} steps',
  perServing: 'kcal per serving', servings: 'Servings', ingredients: 'Ingredients', alsoNeed: 'You’ll also need', method: 'Method',
  addToPlan: 'Add to plan', startCooking: 'Start cooking', deleteRecipe: 'Delete recipe', confirmDeleteRecipe: 'Delete this recipe? This can’t be undone.',
  savedFrom: 'Saved from {s}', favourite: 'Add to favourites', unfavourite: 'Remove from favourites',

  newRecipe: 'New recipe', editRecipe: 'Edit recipe', photo: 'Photo', recipeTitle: 'Recipe name', category: 'Category', cookTime: 'Time (minutes)',
  source: 'Where it’s from', sourcePh: 'e.g. Pinterest, granny, a cookbook',
  ingredientsLines: 'Ingredients, one per line', ingredientsPh: '200g orzo\n1 onion, chopped\n2 garlic cloves',
  stepsLines: 'Method, one step per line', stepsPh: 'Heat the oil in a pan…\nAdd the onion and cook for 5 minutes…',
  equipmentComma: 'Equipment, separated by commas', equipmentPh: 'Large pan, wooden spoon',
  nutritionPer: 'Nutrition per serving', checkIt: 'Check it over', checkHint: 'Here’s how we read your ingredients. Fix anything that looks off before saving.',
  importSoon: 'Importing from links, screenshots and cookbook photos arrives in the next version. For now, type or paste it in.',
  saveRecipe: 'Save recipe', titleNeeded: 'Give it a name first', amount: 'Amount', unit: 'Unit',

  stepOf: 'Step {n} of {t}', youllNeed: 'You’ll need', gather: 'Gather everything', gatherHint: 'Get it all out before you start.',
  food: 'Food', equipment: 'Equipment', letsCook: 'Let’s cook', startTimer: 'Start timer', pause: 'Pause', resume: 'Resume', reset: 'Reset',
  timerDone: 'Timer done', listening: 'Listening', waveHint: 'Wave over the screen or say “next”', waveOn: 'Hand wave on', waveOff: 'Hand wave off', waveTurnOn: 'Tap to turn on hand wave', voice: 'Voice',
  cameraNo: 'We couldn’t use the camera, so hand wave is off. Voice and buttons still work.', voiceNo: 'Voice isn’t available on this browser yet.',
  nextStep: 'Next step', finish: 'Finish', leave: 'Leave cooking mode', cookedTitle: 'You made that. Want to log it?', logIt: 'Log it', notNow: 'Not now',
  howManyAte: 'How many servings did you eat?',

  thisWeek: 'This week', nextWeek: 'Next week', planEmpty: 'Nothing planned yet. Pick a few recipes for the week.', pickRecipe: 'Pick a recipe',
  whichDay: 'Which day?', cookingFor: 'Servings to cook', leftoversOffer: 'This makes {n} extra servings. Want them on another day?', addLeftovers: 'Add leftovers',
  leftovers: 'Leftovers', makeList: 'Make my shopping list', mealsN: '{n} meals', mealN: '{n} meal', timer: 'Timer', cookN: 'Cook {n}', servingN: '{n} serving', servingsN: '{n} servings',
  planTip: '{n} days sorted. Nice.', planTipAll: 'The whole week’s sorted. Look at you.', addedToPlan: 'Added to your plan',

  shopping: 'Shopping list', forWeek: 'For {range}', inBasket: '{a} of {b} in the basket', toGo: '{n} to go', addOwn: 'Add your own item',
  probably: 'Probably in your cupboard', probablyHint: 'We think you’ve already got these, so they’re not on the list. Worth a quick check before you go.',
  imOut: 'I’m out', reasonStaple: 'you always have this', reasonSmall: 'small amount', reasonRecent: 'bought recently',
  staplesTitle: 'What do you always have in stock?', staplesHint: 'We’ll leave these off your list. You can change them in Settings.',
  emptyList: 'Your list is empty. Plan some meals and we’ll build it for you.', yourExtras: 'Your extras', addedByYou: 'Added by you', clearTicked: 'Clear ticked items',
  cat_fruitveg: 'Fruit & veg', cat_meatfish: 'Meat & fish', cat_dairy: 'Dairy & eggs', cat_bakery: 'Bakery', cat_cupboard: 'Cupboard', cat_frozen: 'Frozen', cat_drinks: 'Drinks', cat_household: 'Household', cat_other: 'Other',
  itemsN: '{n} items', itemN: '{n} item',

  trends: 'Trends', week: 'Week', month: 'Month', avgDay: 'Average a day', onTarget: '{n} of {t} days on target', weightTrend: 'Weight',
  noWeight: 'Log a few weigh-ins to see your trend.', yourWeek: 'Your week', weekSummaryGood: 'Really good week. Keep doing what you’re doing.',
  weekSummaryOk: 'Solid week. Every logged day counts.', weekSummaryEmpty: 'Nothing logged this week yet. Start whenever you’re ready.', target: 'target',

  language: 'Language', english: 'English', polish: 'Polski', yourDetails: 'Your details', recalc: 'Recalculate my targets',
  dailyTargets: 'Daily targets', staples: 'Cupboard staples', staplesSettingsHint: 'Things you always have. One per line.',
  family: 'Family sharing', familySoon: 'Linking accounts with family and friends arrives in the next version.',
  resetData: 'Delete all my data', resetConfirm: 'Delete everything on this phone? This can’t be undone.', saved: 'Saved',
}

type Dict = typeof en
export type TKey = keyof Dict

const pl: Dict = {
  signIn: 'Zaloguj się', signUp: 'Załóż konto', email: 'E-mail', password: 'Hasło', passwordHint: 'Co najmniej 8 znaków',
  haveAccount: 'Masz już konto? Zaloguj się', noAccount: 'Pierwszy raz tutaj? Załóż konto', forgot: 'Nie pamiętasz hasła?', sendReset: 'Wyślij link do resetu',
  resetSent: 'Sprawdź skrzynkę, wysłałyśmy link do zmiany hasła.', checkEmail: 'Prawie gotowe. Sprawdź skrzynkę, potwierdź konto i wróć, żeby się zalogować.',
  newPassword: 'Wybierz nowe hasło', setPassword: 'Zapisz nowe hasło', authError: 'Nie udało się. Sprawdź e-mail i hasło i spróbuj jeszcze raz.',
  emailTaken: 'Konto z tym adresem już istnieje. Spróbuj się zalogować.', syncing: 'Pobieram Twoje dane…', account: 'Konto', signOut: 'Wyloguj się',
  signedInAs: 'Zalogowano jako {email}', syncError: 'Nie udało się teraz zsynchronizować. Zmiany są bezpieczne na tym telefonie i zsynchronizują się później.', authSub: 'Zaloguj się, żeby Twoje przepisy i postępy były zapisane na każdym telefonie.',
  units: 'Jednostki', metric: 'Metryczne (kg, cm)', imperial: 'Imperialne (st, lb, ft)', height: 'Wzrost',
  tgIntro: 'Wyliczyłyśmy je na podstawie Twoich danych i celu. Nie musisz nic z nimi robić, my będziemy ich pilnować.',
  ex_kcal: 'Energia na cały dzień, dopasowana do Twojego celu.', ex_protein: 'Daje sytość i wspiera mięśnie.', ex_carbs: 'Twoje główne źródło energii.',
  ex_fat: 'Pomaga przyswajać witaminy i wspiera hormony.', ex_fibre: 'Dobry dla trawienia i na dłużej daje sytość.', ex_sugar: 'To limit, a nie cel. Czasem przekroczyć to nic złego.',
  customise: 'Znam swoje liczby, chcę je zmienić', customiseHint: 'Zmieniaj je tylko, jeśli dostałaś liczby od trenera lub dietetyka.', useRecommended: 'Użyj zalecanych celów',
  pwaIos: 'Dodaj BestiePT do ekranu głównego: dotknij {share}, a potem „Do ekranu początkowego”.', pwaOther: 'Zainstaluj BestiePT na telefonie, żeby działała jak aplikacja.', install: 'Zainstaluj', dismiss: 'Zamknij',
  ownMeal: 'Osobny posiłek', addToExisting: 'Dodaj do posiłku', noMealsYet: 'Tego dnia nic jeszcze nie zapisano, więc wybierz posiłek, a my go zaczniemy.', addToNamed: 'Dodaj do: {name}', addedToNamed: 'Dodano do: {name}',
  save: 'Zapisz', cancel: 'Anuluj', delete: 'Usuń', edit: 'Edytuj', back: 'Wstecz', done: 'Gotowe', add: 'Dodaj', close: 'Zamknij',
  next: 'Dalej', continue: 'Dalej', skip: 'Pomiń', kcal: 'kcal', g: 'g', remove: 'Usuń', search: 'Szukaj',

  breakfast: 'Śniadanie', lunch: 'Obiad', dinner: 'Kolacja', snack: 'Przekąska',
  calories: 'Kalorie', protein: 'Białko', carbs: 'Węglowodany', fat: 'Tłuszcz', fibre: 'Błonnik', sugar: 'Cukier', limit: 'limit',

  navToday: 'Dziś', navRecipes: 'Przepisy', navPlan: 'Plan', navShopping: 'Zakupy', logFood: 'Dodaj posiłek', settings: 'Ustawienia',

  obWelcome: 'Hej, jestem Twoją jedzeniową bestie', obWelcomeSub: 'Zapisuj przepisy skądkolwiek, gotuj bez dotykania ekranu, planuj tydzień i śledź, co jesz.',
  obLanguage: 'Język', obStart: 'Zaczynamy',
  obName: 'Jak mamy się do Ciebie zwracać?', obNamePh: 'Twoje imię',
  obAbout: 'Kilka słów o Tobie', obAboutSub: 'Na tej podstawie wyliczymy Twoje dzienne cele. Dane zostają na Twoim telefonie.',
  age: 'Wiek', heightCm: 'Wzrost (cm)', weightKg: 'Waga (kg)', sex: 'Płeć', female: 'Kobieta', male: 'Mężczyzna',
  obActivity: 'Jak bardzo jesteś aktywna?',
  actLow: 'Głównie siedzę', actLight: 'Lekki ruch 1–3 dni w tygodniu', actModerate: 'Trening 3–5 dni w tygodniu', actHigh: 'Trening prawie codziennie',
  obGoal: 'Jaki jest cel?', goalLose: 'Schudnąć', goalMaintain: 'Utrzymać wagę', goalGain: 'Przytyć',
  obTargets: 'Twoje dzienne cele', obTargetsSub: 'Dobry punkt wyjścia. Możesz je zmienić w każdej chwili w Ustawieniach.',
  obSamples: 'Dodaj 3 przykładowe przepisy, żeby wszystko wypróbować', obGo: 'Lecimy',

  morning: 'Dzień dobry, {name}', afternoon: 'Hej, {name}', evening: 'Dobry wieczór, {name}',
  today: 'Dziś', kcalLeft: 'kcal zostało na dziś', kcalOver: 'kcal ponad cel', yourMeals: 'Twoje posiłki',
  dinnerEmpty: 'Co dziś na kolację?', addMeal: 'Dodaj posiłek', mealEmpty: 'Nic jeszcze nie dodano',
  weight: 'Waga', logToday: 'Zapisz dziś', seeTrends: 'Zobacz trendy', prevDay: 'Poprzedni dzień', nextDay: 'Następny dzień', backToToday: 'Wróć do dziś',
  weightDown: 'Mniej o {n} w tym tygodniu', weightUp: 'Więcej o {n} w tym tygodniu', weightSame: 'Tak samo jak w zeszłym tygodniu', weightNone: 'Zapisz swoje pierwsze ważenie',

  nProteinToGo: 'Zostało tylko {n}g białka. Jogurt grecki załatwi sprawę.',
  nProteinDone: 'Cel białkowy zaliczony. Jestem dumna.',
  nSugarOver: 'Dziś trochę więcej cukru. Serio, nic się nie stało, jutro znowu działamy.',
  nKcalOver: 'Dziś trochę ponad cel i to jest okej. Jeden dzień nie zmienia trendu.',
  nMorning: 'Dzień dobry. Co na śniadanie?',
  nNothing: 'Nic jeszcze nie zapisano. Bez presji, dodaj, kiedy będziesz gotowa.',
  nOnTrack: 'Dziś idzie Ci idealnie.',
  nFibre: 'Trochę mało błonnika. Pomogą owoce jagodowe albo fasola.',

  logWeight: 'Zapisz wagę', weightSaved: 'Zapisane. Patrz na trend, nie na jeden dzień.', weightUpMsg: 'Dziś trochę więcej, to normalne. Patrz na trend, nie na jeden dzień.',
  targetsUpdated: 'Twoja waga się zmieniła, więc zaktualizowałyśmy Twoje dzienne cele.',

  fromRecipe: 'Z przepisu', searchFoods: 'Szukaj produktów', quickAdd: 'Szybkie dodawanie', barcode: 'Kod kreskowy', photoScan: 'Skanuj zdjęcie',
  comingSoon: 'W następnej wersji', searchPh: 'Szukaj, np. banan', noResults: 'Nic nie znaleziono. Spróbuj szybkiego dodawania.',
  howMuch: 'Ile?', servingsEaten: 'Zjedzone porcje', whichMeal: 'Który posiłek?', addToMeal: 'Dodaj do: {meal}',
  quickName: 'Co to było?', enterBarcode: 'Numer kodu kreskowego', lookUp: 'Wyszukaj', notFound: 'Nie znalazłyśmy tego produktu. Spróbuj szybkiego dodawania.',
  lookingUp: 'Szukam…', foodData: 'Dane z Open Food Facts', approx: 'Typowe wartości',
  per100: 'na 100g', grams: 'Gramy',

  yourMeal: 'Twój posiłek', whatsIn: 'Co w nim jest', addSomething: 'Dodaj coś, co pominęłyśmy', addHint: 'Smażone na oleju? Dodaj go tutaj, to się liczy.',
  saveTo: 'Zapisz: {meal}', deleteMeal: 'Usuń ten posiłek', addPhoto: 'Dodaj zdjęcie', changePhoto: 'Zmień zdjęcie', ingredientsN: 'Składniki: {n}', itemName: 'Nazwa',

  recipes: 'Przepisy', all: 'Wszystkie', favourites: 'Ulubione', searchRecipes: 'Szukaj przepisów lub składników', addRecipe: 'Dodaj przepis',
  emptyRecipes: 'Na razie pusto. Dodaj przepis, który kochasz, a my go zapiszemy.', minutes: '{n} min', stepsN: 'Kroki: {n}',
  perServing: 'kcal na porcję', servings: 'Porcje', ingredients: 'Składniki', alsoNeed: 'Przyda się też', method: 'Przygotowanie',
  addToPlan: 'Dodaj do planu', startCooking: 'Zacznij gotować', deleteRecipe: 'Usuń przepis', confirmDeleteRecipe: 'Usunąć ten przepis? Nie da się tego cofnąć.',
  savedFrom: 'Zapisane z: {s}', favourite: 'Dodaj do ulubionych', unfavourite: 'Usuń z ulubionych',

  newRecipe: 'Nowy przepis', editRecipe: 'Edytuj przepis', photo: 'Zdjęcie', recipeTitle: 'Nazwa przepisu', category: 'Kategoria', cookTime: 'Czas (minuty)',
  source: 'Skąd pochodzi', sourcePh: 'np. Pinterest, babcia, książka kucharska',
  ingredientsLines: 'Składniki, każdy w nowej linii', ingredientsPh: '200g makaronu orzo\n1 cebula, posiekana\n2 ząbki czosnku',
  stepsLines: 'Przygotowanie, każdy krok w nowej linii', stepsPh: 'Rozgrzej oliwę w garnku…\nDodaj cebulę i smaż 5 minut…',
  equipmentComma: 'Sprzęt, oddzielony przecinkami', equipmentPh: 'Duży garnek, drewniana łyżka',
  nutritionPer: 'Wartości odżywcze na porcję', checkIt: 'Sprawdź', checkHint: 'Tak odczytałyśmy Twoje składniki. Popraw, jeśli coś się nie zgadza.',
  importSoon: 'Import z linków, zrzutów ekranu i zdjęć z książek pojawi się w następnej wersji. Na razie wpisz lub wklej przepis.',
  saveRecipe: 'Zapisz przepis', titleNeeded: 'Najpierw nadaj mu nazwę', amount: 'Ilość', unit: 'Jednostka',

  stepOf: 'Krok {n} z {t}', youllNeed: 'Potrzebujesz', gather: 'Przygotuj wszystko', gatherHint: 'Wyjmij wszystko, zanim zaczniesz.',
  food: 'Produkty', equipment: 'Sprzęt', letsCook: 'Gotujemy', startTimer: 'Włącz minutnik', pause: 'Pauza', resume: 'Wznów', reset: 'Od nowa',
  timerDone: 'Minutnik skończył', listening: 'Słucham', waveHint: 'Machnij ręką nad ekranem lub powiedz „dalej”', waveOn: 'Machanie włączone', waveOff: 'Machanie wyłączone', waveTurnOn: 'Dotknij, żeby włączyć machanie', voice: 'Głos',
  cameraNo: 'Nie mogłyśmy użyć aparatu, więc machanie jest wyłączone. Głos i przyciski nadal działają.', voiceNo: 'Sterowanie głosem nie działa jeszcze w tej przeglądarce.',
  nextStep: 'Następny krok', finish: 'Zakończ', leave: 'Wyjdź z trybu gotowania', cookedTitle: 'Udało Ci się. Zapisać posiłek?', logIt: 'Zapisz', notNow: 'Nie teraz',
  howManyAte: 'Ile porcji zjadłaś?',

  thisWeek: 'Ten tydzień', nextWeek: 'Następny tydzień', planEmpty: 'Nic jeszcze nie zaplanowano. Wybierz kilka przepisów na tydzień.', pickRecipe: 'Wybierz przepis',
  whichDay: 'Który dzień?', cookingFor: 'Ile porcji gotujesz', leftoversOffer: 'Zostanie {n} porcji. Dodać je na inny dzień?', addLeftovers: 'Dodaj resztki',
  leftovers: 'Resztki', makeList: 'Zrób listę zakupów', mealsN: 'Posiłki: {n}', mealN: 'Posiłki: {n}', timer: 'Minutnik', cookN: 'Ugotuj: {n}', servingN: 'Porcje: {n}', servingsN: 'Porcje: {n}',
  planTip: 'Ogarnięte dni: {n}. Super.', planTipAll: 'Cały tydzień ogarnięty. No proszę.', addedToPlan: 'Dodano do planu',

  shopping: 'Lista zakupów', forWeek: 'Na {range}', inBasket: 'W koszyku: {a} z {b}', toGo: 'Zostało: {n}', addOwn: 'Dodaj własną rzecz',
  probably: 'Pewnie masz w szafce', probablyHint: 'Myślimy, że to już masz, więc nie ma tego na liście. Warto szybko sprawdzić przed wyjściem.',
  imOut: 'Skończyło się', reasonStaple: 'zawsze to masz', reasonSmall: 'mała ilość', reasonRecent: 'niedawno kupione',
  staplesTitle: 'Co zawsze masz w zapasie?', staplesHint: 'Nie dodamy tego do listy. Możesz to zmienić w Ustawieniach.',
  emptyList: 'Lista jest pusta. Zaplanuj kilka posiłków, a my ją przygotujemy.', yourExtras: 'Twoje dodatki', addedByYou: 'Dodane przez Ciebie', clearTicked: 'Usuń odhaczone',
  cat_fruitveg: 'Owoce i warzywa', cat_meatfish: 'Mięso i ryby', cat_dairy: 'Nabiał i jajka', cat_bakery: 'Pieczywo', cat_cupboard: 'Spiżarnia', cat_frozen: 'Mrożonki', cat_drinks: 'Napoje', cat_household: 'Dom', cat_other: 'Inne',
  itemsN: 'Produkty: {n}', itemN: 'Produkty: {n}',

  trends: 'Trendy', week: 'Tydzień', month: 'Miesiąc', avgDay: 'Średnio dziennie', onTarget: 'Dni w celu: {n} z {t}', weightTrend: 'Waga',
  noWeight: 'Zapisz kilka ważeń, żeby zobaczyć trend.', yourWeek: 'Twój tydzień', weekSummaryGood: 'Świetny tydzień. Tak trzymaj.',
  weekSummaryOk: 'Solidny tydzień. Każdy zapisany dzień się liczy.', weekSummaryEmpty: 'W tym tygodniu jeszcze nic. Zacznij, kiedy chcesz.', target: 'cel',

  language: 'Język', english: 'English', polish: 'Polski', yourDetails: 'Twoje dane', recalc: 'Przelicz moje cele',
  dailyTargets: 'Dzienne cele', staples: 'Podstawowe produkty', staplesSettingsHint: 'Rzeczy, które zawsze masz. Każda w nowej linii.',
  family: 'Udostępnianie rodzinie', familySoon: 'Łączenie kont z rodziną i znajomymi pojawi się w następnej wersji.',
  resetData: 'Usuń wszystkie moje dane', resetConfirm: 'Usunąć wszystko z tego telefonu? Nie da się tego cofnąć.', saved: 'Zapisano',
}

const DICTS: Record<Lang, Dict> = { en, pl }

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = DICTS[lang][key] ?? en[key]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

export function useT() {
  const lang = useStore((s) => s.lang)
  return Object.assign((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), { lang })
}
