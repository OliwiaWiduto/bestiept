import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { del, get, set } from 'idb-keyval'
import type { Lang, LogEntry, Macros, PlanItem, Profile, Recipe, ShoppingState, WeightEntry } from './types'
import { calcTargets } from './lib/nutrition'
import { today } from './lib/dates'
import { uid } from './lib/util'

/** Everything is saved on the phone in IndexedDB (photos included). */
const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => { await set(name, value) },
  removeItem: async (name) => { await del(name) },
}

type State = {
  lang: Lang
  profile: Profile | null
  targets: Macros | null
  recipes: Recipe[]
  logs: LogEntry[]
  plan: PlanItem[]
  shopping: ShoppingState
  weights: WeightEntry[]

  setLang: (l: Lang) => void
  completeOnboarding: (p: Profile, recipes: Recipe[], staples: string[]) => void
  updateProfile: (p: Profile, recalc: boolean) => void
  setTargets: (t: Macros) => void

  saveRecipe: (r: Recipe) => void
  deleteRecipe: (id: string) => void
  toggleFavourite: (id: string) => void

  saveLog: (e: LogEntry) => void
  deleteLog: (id: string) => void

  addPlan: (p: Omit<PlanItem, 'id'>) => string
  updatePlan: (id: string, patch: Partial<PlanItem>) => void
  removePlan: (id: string) => void

  setShopping: (patch: Partial<ShoppingState>) => void
  logWeight: (kg: number, date?: string) => void
  resetAll: () => void
}

const emptyShopping: ShoppingState = { ticked: {}, extras: [], staples: [], staplesAsked: false, out: [], lastBought: {} }

export const useStore = create<State>()(
  persist(
    (setState, getState) => ({
      lang: (navigator.language || '').toLowerCase().startsWith('pl') ? 'pl' : 'en',
      profile: null,
      targets: null,
      recipes: [],
      logs: [],
      plan: [],
      shopping: emptyShopping,
      weights: [],

      setLang: (lang) => setState({ lang }),
      completeOnboarding: (profile, recipes, staples) =>
        setState({
          profile,
          targets: calcTargets(profile),
          recipes,
          weights: [{ date: today(), kg: profile.weightKg }],
          shopping: { ...emptyShopping, staples },
        }),
      updateProfile: (profile, recalc) => setState({ profile, ...(recalc ? { targets: calcTargets(profile) } : {}) }),
      setTargets: (targets) => setState({ targets }),

      saveRecipe: (r) => setState({ recipes: getState().recipes.some((x) => x.id === r.id) ? getState().recipes.map((x) => (x.id === r.id ? r : x)) : [r, ...getState().recipes] }),
      deleteRecipe: (id) => setState({ recipes: getState().recipes.filter((r) => r.id !== id), plan: getState().plan.filter((p) => p.recipeId !== id) }),
      toggleFavourite: (id) => setState({ recipes: getState().recipes.map((r) => (r.id === id ? { ...r, favourite: !r.favourite } : r)) }),

      saveLog: (e) => setState({ logs: getState().logs.some((x) => x.id === e.id) ? getState().logs.map((x) => (x.id === e.id ? e : x)) : [...getState().logs, e] }),
      deleteLog: (id) => setState({ logs: getState().logs.filter((l) => l.id !== id) }),

      addPlan: (p) => {
        const id = uid()
        setState({ plan: [...getState().plan, { ...p, id }] })
        return id
      },
      updatePlan: (id, patch) => setState({ plan: getState().plan.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      removePlan: (id) => setState({ plan: getState().plan.filter((p) => p.id !== id && p.leftoverOf !== id) }),

      setShopping: (patch) => setState({ shopping: { ...getState().shopping, ...patch } }),
      logWeight: (kg, date = today()) => {
        const w = getState().weights.filter((x) => x.date !== date)
        const weights = [...w, { date, kg }].sort((a, b) => a.date.localeCompare(b.date))
        const p = getState().profile
        // Recalculate targets when weight has moved 2kg or more since they were set.
        if (p && Math.abs(p.weightKg - kg) >= 2) {
          const np = { ...p, weightKg: kg }
          setState({ weights, profile: np, targets: calcTargets(np) })
        } else setState({ weights })
      },
      resetAll: () => setState({ profile: null, targets: null, recipes: [], logs: [], plan: [], shopping: emptyShopping, weights: [] }),
    }),
    { name: 'bestiept', storage: createJSONStorage(() => idbStorage), version: 1 },
  ),
)

/** True once saved data has loaded from the phone's storage. */
export function useHydrated(): boolean {
  const [h, setH] = useState(useStore.persist.hasHydrated())
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setH(true))
    setH(useStore.persist.hasHydrated())
    return unsub
  }, [])
  return h
}
