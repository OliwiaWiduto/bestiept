import { create } from 'zustand'
import type { Meal } from './types'
import { today, weekStart } from './lib/dates'

/** Short-lived app state that isn't saved (which day you're viewing, open sheets). */
type UI = {
  viewDate: string
  setViewDate: (d: string) => void
  logOpen: boolean
  logMeal: Meal | null
  openLog: (meal?: Meal) => void
  closeLog: () => void
  planWeek: string
  setPlanWeek: (k: string) => void
  basketOpen: boolean
  setBasketOpen: (v: boolean) => void
  basketCount: number
  setBasketCount: (n: number) => void
}

export const useUI = create<UI>()((set) => ({
  viewDate: today(),
  setViewDate: (viewDate) => set({ viewDate }),
  logOpen: false,
  logMeal: null,
  openLog: (meal) => set({ logOpen: true, logMeal: meal ?? null }),
  closeLog: () => set({ logOpen: false }),
  planWeek: weekStart(today()),
  setPlanWeek: (planWeek) => set({ planWeek }),
  basketOpen: false,
  setBasketOpen: (basketOpen) => set({ basketOpen }),
  basketCount: 0,
  setBasketCount: (basketCount) => set({ basketCount }),
}))

export function defaultMeal(): Meal {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

// The app can stay open in the background for days. When the date changes, anything that was
// showing "today" or "this week" moves on with it, so food isn't logged to yesterday by mistake.
let lastDay = today()
export function rollDay() {
  const now = today()
  if (now === lastDay) return
  const { viewDate, planWeek } = useUI.getState()
  useUI.setState({
    ...(viewDate === lastDay ? { viewDate: now } : {}),
    ...(planWeek === weekStart(lastDay) ? { planWeek: weekStart(now) } : {}),
  })
  lastDay = now
}
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') rollDay() })
  window.addEventListener('focus', rollDay)
  setInterval(rollDay, 60_000)
}
