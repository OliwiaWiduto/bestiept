import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './theme.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// Number boxes: put the cursor at the end when tapped, and accept a comma as the decimal point.
const isNumberBox = (el: EventTarget | null): el is HTMLInputElement =>
  el instanceof HTMLInputElement && (el.inputMode === 'decimal' || el.inputMode === 'numeric')
const fresh = new WeakSet<HTMLInputElement>()
const toEnd = (el: HTMLInputElement) => { try { el.setSelectionRange(el.value.length, el.value.length) } catch { /* not a text box */ } }
document.addEventListener('focusin', (e) => {
  const el = e.target
  if (!isNumberBox(el)) return
  fresh.add(el)
  requestAnimationFrame(() => toEnd(el)); setTimeout(() => toEnd(el), 60)
})
// The tap that focused the box would otherwise drop the cursor where the finger landed.
document.addEventListener('click', (e) => {
  const el = e.target
  if (isNumberBox(el) && fresh.has(el)) { fresh.delete(el); toEnd(el) }
})
document.addEventListener('focusout', (e) => { if (isNumberBox(e.target)) fresh.delete(e.target) })
window.addEventListener('input', (e) => {
  const el = e.target
  if (isNumberBox(el) && el.value.includes(',')) el.value = el.value.replace(/,/g, '.')
}, true)

// New versions install by themselves, no closing and reopening needed.
// We check when the app opens, every 5 minutes, and whenever it comes back to the front. When a new version is
// ready we switch to it at a quiet moment, so nobody loses what they're typing: straight away if the app is in the
// background or nothing is open, otherwise as soon as the sheet closes / the keyboard goes away.
let apply: (() => void) | null = null
const quiet = () => document.visibilityState === 'hidden' || (!document.querySelector('[role="dialog"]') &&
  !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement))
const tryApply = () => { if (apply && quiet()) { const go = apply; apply = null; go() } }
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { apply = () => { updateSW(true) }; tryApply() },
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
    setInterval(check, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); tryApply() })
  },
})
setInterval(tryApply, 3000)
document.addEventListener('focusout', () => setTimeout(tryApply, 300))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
