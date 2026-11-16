import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { startAutoSync, syncNow } from './lib/sync'
import { loadFamily } from './lib/family'
import Auth from './screens/Auth'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useHydrated, useStore } from './store'
import { useUI } from './ui-state'
import { BottomNav, ToastHost, toast } from './components/ui'
import { translate } from './i18n'
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
import Family from './screens/Family'
import FamilyPerson from './screens/FamilyPerson'

const NAV_SCREENS = ['/', '/recipes', '/plan', '/shopping', '/trends', '/settings']

export default function App() {
  const hydrated = useHydrated()
  const profile = useStore((s) => s.profile)
  const lang = useStore((s) => s.lang)
  const openLog = useUI((s) => s.openLog)
  const { pathname } = useLocation()

  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)
  const [synced, setSynced] = useState<string | null>(null)
  const uid = session?.user.id

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // After signing in (and once saved data has loaded), pull from the cloud, then keep syncing.
  useEffect(() => {
    if (!hydrated || !uid) return
    let stop: (() => void) | undefined
    let alive = true
    syncNow(uid)
      .catch((e) => { console.error(e); toast(translate(useStore.getState().lang, 'syncError')) })
      .finally(() => { if (alive) { setSynced(uid); stop = startAutoSync(uid); loadFamily(uid).catch(console.error) } })
    return () => { alive = false; stop?.() }
  }, [hydrated, uid])

  if (!hydrated || session === undefined) return null
  if (recovery && session) return <Auth recovery onDone={() => setRecovery(false)} />
  if (!session) return <><Auth /><ToastHost /></>
  if (synced !== uid) return <main className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}><img src="/icons/cat-fruitveg.png" alt="" /><p>{translate(lang, 'syncing')}</p></main>
  if (!profile) return <><Onboarding /><ToastHost /></>

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
        <Route path="/family" element={<Family />} />
        <Route path="/family/:id" element={<FamilyPerson />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {NAV_SCREENS.includes(pathname) && <BottomNav onLog={() => openLog()} />}
      <InstallNudge />
      <LogFoodSheet />
      <ToastHost />
    </>
  )
}
