/**
 * The little rewards when food is logged: a "just logged" flag (so only her own logging celebrates,
 * not a sync from another phone) and the sounds, made in the browser with Web Audio (no audio files).
 */

let pending = false
/** Called by the store whenever she saves a meal. Today picks it up the next time its numbers go up. */
export const markLogged = () => { pending = true }
export const takeLogged = () => { const p = pending; pending = false; return p }

export type SoundKind = 'add' | 'goal' | 'quiet'

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

// Phones only allow sound after a tap, so wake the audio on every tap (the tap on "Add" is what lets the chime play).
if (typeof document !== 'undefined') document.addEventListener('pointerdown', () => { if (ctx?.state !== 'running') audio() }, { capture: true, passive: true })

function tone(c: AudioContext, out: AudioNode, freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const t = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur * 0.6)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(out)
  o.start(t); o.stop(t + dur + 0.05)
}

/** quiet: one soft pop (she went over, nothing cheerful). add: pop + sparkle chime. goal: chime + a rising run of notes. */
export function playSound(kind: SoundKind) {
  const c = audio()
  if (!c) return
  try {
    const out = c.createGain()
    out.gain.value = 0.5
    out.connect(c.destination)
    tone(c, out, 380, 0, 0.12, 'sine', 0.3, kind === 'quiet' ? 700 : 900)
    if (kind === 'quiet') return
    tone(c, out, 1318.5, 0.09, 0.45, 'triangle', 0.16)
    tone(c, out, 659.25, 0.09, 0.45, 'sine', 0.08)
    tone(c, out, 1975.5, 0.18, 0.6, 'triangle', 0.13)
    if (kind === 'goal') {
      ;[1046.5, 1318.5, 1568, 2093].forEach((n, i) => {
        tone(c, out, n, 0.42 + i * 0.085, 0.5, 'triangle', 0.14)
        tone(c, out, n / 2, 0.42 + i * 0.085, 0.4, 'sine', 0.06)
      })
      tone(c, out, 2637, 0.82, 0.9, 'sine', 0.07)
    }
  } catch { /* sound not available */ }
}

export function buzz(kind: SoundKind) {
  try { navigator.vibrate?.(kind === 'goal' ? [12, 60, 18] : 12) } catch { /* no vibration */ }
}
