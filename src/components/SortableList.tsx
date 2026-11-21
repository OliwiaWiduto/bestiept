import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A list you can reorder by dragging the handle on each row. On touch you press and hold the handle
 * for a moment first, so swiping over the list (or the handle) still scrolls the page.
 * The row lifts while dragging and the others slide out of the way; onMove fires on release.
 */
export function SortableList<T>({ items, keyOf, render, onMove, handleLabel }: {
  items: T[]; keyOf: (t: T, i: number) => string
  render: (t: T, i: number, handle: ReactNode) => ReactNode
  onMove: (from: number, to: number) => void
  handleLabel: (i: number) => string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number } | null>(null)
  const start = useRef({ y: 0, tops: [] as number[], heights: [] as number[] })

  const active = useRef(false)
  const hold = useRef<{ timer: number; y: number } | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag

  const begin = (i: number, y: number) => {
    const rows = Array.from(box.current?.children ?? []) as HTMLElement[]
    start.current = { y, tops: rows.map((r) => r.offsetTop), heights: rows.map((r) => r.offsetHeight) }
    active.current = true
    setDrag({ from: i, to: i, dy: 0 })
  }
  const moveTo = (y: number) => {
    const d = dragRef.current
    if (!d) return
    const dy = y - start.current.y
    const { tops, heights } = start.current
    const centre = tops[d.from] + heights[d.from] / 2 + dy
    let to = 0
    for (let k = 0; k < tops.length; k++) if (centre > tops[k] + heights[k] / 2) to = k
    setDrag({ ...d, to, dy })
  }
  const up = () => {
    if (hold.current) { clearTimeout(hold.current.timer); hold.current = null }
    const d = dragRef.current
    if (d && d.to !== d.from) onMove(d.from, d.to)
    active.current = false
    setDrag(null)
  }

  // Mouse: drag straight away.
  const down = (i: number) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    begin(i, e.clientY)
  }
  const move = (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && active.current) moveTo(e.clientY) }
  const mouseUp = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') up() }

  // Touch: hold still on the handle for a moment to pick the row up; moving first means you're scrolling.
  const touchStart = (i: number) => (e: React.TouchEvent) => {
    const y = e.touches[0].clientY
    const timer = window.setTimeout(() => { hold.current = null; navigator.vibrate?.(10); begin(i, y) }, 220)
    hold.current = { timer, y }
  }
  const touchMove = (e: React.TouchEvent) => {
    const y = e.touches[0].clientY
    if (hold.current && Math.abs(y - hold.current.y) > 8) { clearTimeout(hold.current.timer); hold.current = null }
    if (active.current) moveTo(y)
  }
  // While a row is picked up, stop the page from scrolling (needs a non-passive listener).
  useEffect(() => {
    const el = box.current
    if (!el) return
    const stop = (e: TouchEvent) => { if (active.current) e.preventDefault() }
    el.addEventListener('touchmove', stop, { passive: false })
    return () => el.removeEventListener('touchmove', stop)
  }, [])
  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0
    const h = start.current.heights[drag.from]
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return h
    return 0
  }
  const keyMove = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); onMove(i, i - 1) }
    if (e.key === 'ArrowDown' && i < items.length - 1) { e.preventDefault(); onMove(i, i + 1) }
  }

  return (
    <div ref={box} style={{ position: 'relative' }}>
      {items.map((it, i) => {
        const lifted = drag?.from === i
        const handle = (
          <span role="button" tabIndex={0} className="drag-handle" aria-label={handleLabel(i)}
            onPointerDown={down(i)} onPointerMove={move} onPointerUp={mouseUp}
            onTouchStart={touchStart(i)} onTouchMove={touchMove} onTouchEnd={up} onTouchCancel={up}
            onKeyDown={keyMove(i)} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></g></svg>
          </span>
        )
        return (
          <div key={keyOf(it, i)} style={{
            transform: `translateY(${lifted ? drag!.dy : shift(i)}px)${lifted ? ' scale(1.02)' : ''}`,
            transition: lifted ? 'none' : 'transform .18s ease',
            position: 'relative', zIndex: lifted ? 2 : 1,
            boxShadow: lifted ? '0 10px 24px rgba(27, 33, 28, .16)' : 'none',
            background: lifted ? 'var(--surface-raised)' : undefined, borderRadius: lifted ? 14 : 0,
          }}>
            {render(it, i, handle)}
          </div>
        )
      })}
    </div>
  )
}
