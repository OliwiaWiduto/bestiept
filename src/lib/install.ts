// Works out where the app is open so we can say how to put it on the home screen.
type InstallEvent = Event & { prompt: () => Promise<void> }
let deferred: InstallEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent })
}

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isAndroid = () => /android/i.test(navigator.userAgent)
export const isInApp = () => /instagram|fban|fbav|fb_iab|tiktok|bytedance|musical_ly|snapchat|line\/|pinterest|twitter|linkedinapp|gsa\//i.test(navigator.userAgent)
export const isIosOtherBrowser = () => /crios|fxios|edgios|opios/i.test(navigator.userAgent)

export type Where = 'ios-safari' | 'ios-other' | 'in-app' | 'android' | 'desktop'
export function whereOpen(): Where {
  if (isInApp()) return 'in-app'
  if (isIos()) return isIosOtherBrowser() ? 'ios-other' : 'ios-safari'
  if (isAndroid()) return 'android'
  return 'desktop'
}

export const canPromptInstall = () => !!deferred
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  deferred = null
  return true
}
