import type { Ingredient } from '../types'

// Which ingredients a step uses. Matching whole words (allowing plurals and Polish endings) so
// "chicken" doesn't pull in chickpeas or chicken stock, and "add the butter" doesn't pull in peanut butter.
const FILL = new Set(['fresh', 'large', 'small', 'medium', 'finely', 'roughly', 'thinly', 'chopped', 'grated', 'sliced', 'diced', 'crushed', 'minced', 'peeled', 'ripe', 'whole', 'extra', 'virgin', 'boneless', 'skinless', 'tinned', 'canned', 'dried', 'frozen', 'good', 'quality', 'plus', 'more', 'for', 'and', 'the', 'świeży', 'świeża', 'świeże', 'duża', 'duży', 'mała', 'mały', 'drobno', 'posiekany', 'posiekana', 'starty', 'starta'])
// Words that only mean something with the word in front ("soy sauce", "chicken stock", "peanut butter")
const GENERIC = new Set(['sauce', 'oil', 'milk', 'butter', 'juice', 'stock', 'paste', 'powder', 'flakes', 'seeds', 'leaves', 'water', 'cream', 'sugar', 'vinegar', 'zest', 'sos', 'olej', 'mleko', 'masło', 'sok', 'bulion', 'pasta', 'cukier', 'ocet'])
// Describing words: on their own they don't name an ingredient ("sweet" isn't "sweet chilli", "red" isn't "red onion").
const DESCRIBING = new Set(['sweet', 'red', 'green', 'yellow', 'white', 'black', 'brown', 'hot', 'spring', 'smoked', 'sun', 'plain', 'greek', 'light', 'dark', 'baby', 'cherry', 'mixed', 'wild', 'natural', 'low', 'full', 'single', 'double', 'sour', 'cream', 'soft', 'hard', 'salted', 'unsalted', 'toasted', 'roasted', 'ground', 'cold', 'warm',
  'słodki', 'słodka', 'słodkie', 'czerwony', 'czerwona', 'czerwone', 'zielony', 'zielona', 'zielone', 'żółty', 'żółta', 'biały', 'biała', 'białe', 'czarny', 'czarna', 'ostry', 'ostra', 'wędzony', 'wędzona', 'grecki', 'jogurt'])
const wordsOf = (txt: string) => txt.toLowerCase().replace(/\bchili\b/g, 'chilli').split(/[^a-ząęółśżźćń]+/).filter(Boolean)
// Word endings that keep it the same thing: plurals and Polish cases ("onions", "kukurydzę", "majonezem").
const ENDING = /^(s|es|e|y|ies|a|ą|ę|i|u|o|ie|em|om|ami|ach|ów|ek|ki|ka|kę|zie|ego|ej|ym|ych|emu|ymi|go)?$/
const same = (a: string, b: string) => {
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  if (s.length < 3) return false
  if (s.length === 3) return l.length === 4 && l.startsWith(s) && ENDING.test(l.slice(3)) // "sos" / "sosu", "egg" / "eggs"
  // The longer word is the shorter one (or it minus its last letter) plus an ending, never a different word ("sprinkle" isn't "spring").
  return (l.startsWith(s) && ENDING.test(l.slice(s.length))) || (l.startsWith(s.slice(0, -1)) && ENDING.test(l.slice(s.length - 1)))
}
const phraseOf = (name: string) => wordsOf(name.split(',')[0].split('(')[0]).filter((w) => w.length > 2 && !FILL.has(w))
const hasPhrase = (step: string[], phrase: string[]) => step.some((_, i) => phrase.every((w, j) => step[i + j] && same(step[i + j], w)))

export function stepIngredients(step: string, ings: Ingredient[], before: string[] = []): Ingredient[] {
  // "sweet corn" is "sweetcorn": two words that join into one ingredient's word count as that word.
  const words = wordsOf(step).flatMap((w, i, all) => (i && ings.some((g) => phraseOf(g.name).includes(all[i - 1] + w)) ? [all[i - 1] + w] : [w]))
  const low = step.toLowerCase()
  const heads = ings.map((i) => phraseOf(i.name).at(-1) ?? '')
  // Ingredients named in full in this step: "fry the red onion" means the red onion, not the spring onions too.
  const named = new Set(ings.map((i, n) => (phraseOf(i.name).length && hasPhrase(words, phraseOf(i.name)) ? n : -1)).filter((n) => n >= 0))
  // Words used up by an ingredient named in full ("chilli" in "sweet chilli sauce") don't also bring in the red chilli.
  const used = new Set<number>()
  for (const n of named) { const ph = phraseOf(ings[n].name); words.forEach((_, i) => { if (ph.every((w, j) => words[i + j] && same(words[i + j], w))) ph.forEach((_, j) => used.add(i + j)) }) }
  const has = (w: string) => words.some((x, i) => !used.has(i) && same(x, w))
  const sibling = (n: number, head: string) => [...named].some((m) => m !== n && same(heads[m], head))
  return ings.filter((ing, n) => {
    const phrase = phraseOf(ing.name)
    if (!phrase.length) return false
    if (hasPhrase(words, phrase)) return true
    const head = phrase[phrase.length - 1]
    if (phrase.length === 1) return has(head) && !sibling(n, head)
    if (GENERIC.has(head)) {
      // "Pour in the stock": only when it's the one stock in the recipe, it's named on its own ("the stock",
      // "…, stock"), and it wasn't already used by name earlier (then "the sauce" means the sauce you made).
      if (heads.filter((h) => same(h, head)).length !== 1) return false
      if (!new RegExp(`(?:\\b(?:the|your|some|and|with|i|oraz)\\s+|,\\s*|^)${head.slice(0, Math.max(4, head.length - 1))}`).test(low)) return false
      return !before.some((b) => hasPhrase(wordsOf(b), phrase))
    }
    // "Add the chicken" for "chicken thighs" (unless another chicken-something is named in this step)
    if (has(head)) return !sibling(n, head)
    return phrase.length === 2 && !GENERIC.has(phrase[0]) && !DESCRIBING.has(phrase[0]) && has(phrase[0]) && !ings.some((o, m) => m !== n && phraseOf(o.name)[0] === phrase[0] && hasPhrase(words, phraseOf(o.name)))
  })
}
