import type { Lang } from '../types'

export const pad = (n: number) => String(n).padStart(2, '0')
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const today = () => toKey(new Date())
export const addDays = (k: string, n: number) => {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}
/** Monday of the week containing k. */
export const weekStart = (k: string) => {
  const d = fromKey(k)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toKey(d)
}
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))
export const locale = (l: Lang) => (l === 'pl' ? 'pl-PL' : 'en-GB')
export const fmt = (k: string, l: Lang, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale(l), o).format(fromKey(k))
export const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000)
