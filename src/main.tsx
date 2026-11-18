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

// Pick up new versions: check when the app opens, every half hour, and whenever it comes back to the front.
// With autoUpdate the page reloads itself as soon as a new version is ready.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
    setInterval(check, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
