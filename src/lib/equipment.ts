// Picks one of our hand-drawn icons for a piece of kitchen equipment, whatever the recipe calls it.
const MAP: [RegExp, string][] = [
  [/parchment|baking paper|greaseproof|papier do pieczenia|papier/, 'parchment'],
  [/scoop|gałkownic|łyżka do lodów/, 'scoop'],
  [/air ?fryer|frytkownic/, 'airfryer'],
  [/blender|processor|nutribullet|mixer|malakser|robot/, 'blender'],
  [/whisk|trzepaczk|rózg/, 'whisk'],
  [/grater|zester|tark/, 'grater'],
  [/colander|sieve|strainer|durszlak|sitk|sito|cedzak/, 'colander'],
  [/knife|board|peeler|scissors|nóż|noż|desk|obierak/, 'knife'],
  [/frying|skillet|wok|griddle|patelni/, 'pan'],
  [/saucepan|\bpot\b|stockpot|dutch|steamer|kettle|slow cooker|garn|rondel|czajnik/, 'pot'],
  [/tray|\btin\b|dish|sheet|roasting|oven|casserole|ramekin|blach|naczyni|form|piekarnik|brytfann/, 'tray'],
  [/jug|measuring|scales?|miark|dzban|waga/, 'jug'],
  [/\bpan\b/, 'pan'],
  [/bowl|misk/, 'bowl'],
]

export function equipmentIcon(name: string): string {
  const n = name.toLowerCase()
  return `/icons/eq-${MAP.find(([re]) => re.test(n))?.[1] ?? 'spoon'}.png`
}
