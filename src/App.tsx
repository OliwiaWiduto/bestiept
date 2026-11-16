import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useHydrated, useStore } from './store'
import { useUI } from './ui-state'
import { BottomNav, ToastHost } from './components/ui'
import LogFoodSheet from './components/LogFoodSheet'
import InstallNudge from './components/InstallNudge'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import Recipes from './screens/Recipes'
import RecipeDetail from './screens/RecipeDetail'
import RecipeEdit from './screens/RecipeEdit'
import Cooking from './screens/Cooking'
import Plan from './screens/Plan'
import Shopping from './screens/Shopping'
import MealEdit from './screens/MealEdit'
import Trends from './screens/Trends'
import Settings from './screens/Settings'

const NAV_SCREENS = ['/', '/recipes', '/plan', '/shopping', '/trends', '/settings']

export default function App() {
  const hydrated = useHydrated()
  const profile = useStore((s) => s.profile)
  const lang = useStore((s) => s.lang)
  const openLog = useUI((s) => s.openLog)
  const { pathname } = useLocation()

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (!hydrated) return null
  if (!profile) return <Onboarding />

  return (
    <>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/new" element={<RecipeEdit />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
        <Route path="/cook/:id" element={<Cooking />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/meal/:id" element={<MealEdit />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {NAV_SCREENS.includes(pathname) && <BottomNav onLog={() => openLog()} />}
      <InstallNudge />
      <LogFoodSheet />
      <ToastHost />
    </>
  )
}
