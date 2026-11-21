// Polish recipes write ingredients after an amount, so their names are in the genitive
// ("400g pomidorów", "1 łyżka oliwy"). Where a name stands on its own (a shopping or
// gather list) it should read in its basic form ("Pomidory", "Oliwa").

// Genitive → basic form for the nouns that come up in recipes. g: the gender for adjectives that follow.
type G = 'm' | 'f' | 'n' | 'p'
const NOUNS: Record<string, [string, G]> = {
  oliwy: ['oliwa', 'f'], oleju: ['olej', 'm'], masła: ['masło', 'n'], mleka: ['mleko', 'n'], mleczka: ['mleczko', 'n'], śmietany: ['śmietana', 'f'], śmietanki: ['śmietanka', 'f'],
  jogurtu: ['jogurt', 'm'], sera: ['ser', 'm'], serka: ['serek', 'm'], parmezanu: ['parmezan', 'm'], mozzarelli: ['mozzarella', 'f'], fety: ['feta', 'f'],
  czosnku: ['czosnek', 'm'], cebuli: ['cebula', 'f'], cebul: ['cebule', 'p'], szalotki: ['szalotka', 'f'], pomidorów: ['pomidory', 'p'], pomidora: ['pomidor', 'm'], pomidorków: ['pomidorki', 'p'],
  szpinaku: ['szpinak', 'm'], papryki: ['papryka', 'f'], marchewki: ['marchewka', 'f'], marchwi: ['marchew', 'f'], ogórka: ['ogórek', 'm'], cukinii: ['cukinia', 'f'],
  bakłażana: ['bakłażan', 'm'], brokuła: ['brokuł', 'm'], brokułu: ['brokuł', 'm'], pieczarek: ['pieczarki', 'p'], grzybów: ['grzyby', 'p'], ziemniaków: ['ziemniaki', 'p'], batatów: ['bataty', 'p'], batata: ['batat', 'm'],
  sałaty: ['sałata', 'f'], rukoli: ['rukola', 'f'], kapusty: ['kapusta', 'f'], selera: ['seler', 'm'], pora: ['por', 'm'], imbiru: ['imbir', 'm'], natki: ['natka', 'f'], kolendry: ['kolendra', 'f'], bazylii: ['bazylia', 'f'], mięty: ['mięta', 'f'], koperku: ['koperek', 'm'],
  cytryny: ['cytryna', 'f'], limonki: ['limonka', 'f'], jabłka: ['jabłko', 'n'], jabłek: ['jabłka', 'p'], banana: ['banan', 'm'], bananów: ['banany', 'p'], borówek: ['borówki', 'p'], truskawek: ['truskawki', 'p'], malin: ['maliny', 'p'], owoców: ['owoce', 'p'],
  makaronu: ['makaron', 'm'], ryżu: ['ryż', 'm'], kaszy: ['kasza', 'f'], kuskusu: ['kuskus', 'm'], komosy: ['komosa', 'f'], płatków: ['płatki', 'p'], mąki: ['mąka', 'f'], cukru: ['cukier', 'm'], miodu: ['miód', 'm'], soli: ['sól', 'f'], pieprzu: ['pieprz', 'm'],
  bulionu: ['bulion', 'm'], rosołu: ['rosół', 'm'], sosu: ['sos', 'm'], octu: ['ocet', 'm'], koncentratu: ['koncentrat', 'm'], passaty: ['passata', 'f'], napoju: ['napój', 'm'], wody: ['woda', 'f'], wina: ['wino', 'n'],
  fasoli: ['fasola', 'f'], ciecierzycy: ['ciecierzyca', 'f'], soczewicy: ['soczewica', 'f'], kukurydzy: ['kukurydza', 'f'], groszku: ['groszek', 'm'], orzechów: ['orzechy', 'p'], migdałów: ['migdały', 'p'], nasion: ['nasiona', 'p'], sezamu: ['sezam', 'm'],
  kurczaka: ['kurczak', 'm'], piersi: ['pierś', 'f'], udek: ['udka', 'p'], filetów: ['filety', 'p'], fileta: ['filet', 'm'], łososia: ['łosoś', 'm'], dorsza: ['dorsz', 'm'], tuńczyka: ['tuńczyk', 'm'], krewetek: ['krewetki', 'p'],
  wołowiny: ['wołowina', 'f'], wieprzowiny: ['wieprzowina', 'f'], mięsa: ['mięso', 'n'], boczku: ['boczek', 'm'], kiełbasy: ['kiełbasa', 'f'], szynki: ['szynka', 'f'], indyka: ['indyk', 'm'],
  jajek: ['jajka', 'p'], jaj: ['jajka', 'p'], jajka: ['jajko', 'n'], tofu: ['tofu', 'n'], chleba: ['chleb', 'm'], bułki: ['bułka', 'f'], bułek: ['bułki', 'p'], tortilli: ['tortille', 'p'], czekolady: ['czekolada', 'f'], kakao: ['kakao', 'n'],
  cynamonu: ['cynamon', 'm'], kminu: ['kmin', 'm'], kminku: ['kminek', 'm'], oregano: ['oregano', 'n'], tymianku: ['tymianek', 'm'], kurkumy: ['kurkuma', 'f'], przypraw: ['przyprawy', 'p'], ząbków: ['ząbki', 'p'], ząbka: ['ząbek', 'm'],
  awokado: ['awokado', 'n'], edamame: ['edamame', 'n'],
}

// Adjectives after the noun follow its gender: "bulionu warzywnego" → "bulion warzywny".
function adjective(w: string, g: G): string {
  if (/(k|g)iego$/.test(w)) return w.replace(/iego$/, g === 'n' ? 'ie' : 'i')
  if (/ego$/.test(w)) return w.replace(/ego$/, g === 'n' ? 'e' : 'y')
  if (/(k|g)iej$/.test(w)) return w.replace(/iej$/, 'a')
  if (/ej$/.test(w)) return w.replace(/ej$/, 'a')
  if (/(k|g)ich$/.test(w)) return w.replace(/ich$/, 'ie')
  if (/ych$/.test(w)) return w.replace(/ych$/, 'e')
  return w
}

/** A Polish ingredient name in its basic form, for showing on its own. Unknown words are left alone. */
export function plBasic(name: string): string {
  const words = name.trim().split(/\s+/)
  // "ząbki czosnku", "garść szpinaku": a counting word in front already reads right.
  if (/^(ząb(ek|ki)|plast(er|ry)|garść|szczypt|puszk|pęcz|gałąz|kawał|kostk|opakowan|słoik)/i.test(words[0])) return name.trim()
  const i = words.findIndex((w) => NOUNS[w.toLowerCase()])
  if (i < 0) return name.trim()
  const [base, g] = NOUNS[words[i].toLowerCase()]
  const out = words.slice()
  out[i] = base
  // Adjectives right before ("słodkiej papryki") or after ("sosu sojowego") the noun, until a preposition.
  for (let j = i - 1; j >= 0 && /(ego|ej|ych|ich)$/.test(out[j]); j--) out[j] = adjective(out[j], g)
  for (let j = i + 1; j < out.length && !/^(z|do|w|na|bez|ze)$/.test(out[j]); j++) out[j] = adjective(out[j], g)
  return out.join(' ')
}
