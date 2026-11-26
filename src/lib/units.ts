export type Units = 'metric' | 'imperial'

const LB_PER_KG = 2.20462
export const kgToLb = (kg: number) => kg * LB_PER_KG
export const lbToKg = (lb: number) => lb / LB_PER_KG

export function kgToStLb(kg: number): { st: number; lb: number } {
  // Pounds keep one decimal (9 st 3.5 lb)
  const total = Math.round(kgToLb(kg) * 10) / 10
  const st = Math.floor(total / 14)
  return { st, lb: Math.round((total - st * 14) * 10) / 10 }
}
export const stLbToKg = (st: number, lb: number) => Math.round(lbToKg(st * 14 + lb) * 100) / 100

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const total = Math.round(cm / 2.54)
  return { ft: Math.floor(total / 12), inch: total % 12 }
}
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54)

export const formatWeight = (kg: number, u: Units) => {
  if (u === 'metric') return `${Math.round(kg * 10) / 10} kg`
  const { st, lb } = kgToStLb(kg)
  return `${st} st ${lb} lb`
}
/** A weight change, e.g. "0.4 kg" or "1 lb". */
export const formatDiff = (kg: number, u: Units) => (u === 'metric' ? `${Math.round(Math.abs(kg) * 10) / 10} kg` : `${Math.round(Math.abs(kgToLb(kg)) * 10) / 10} lb`)
