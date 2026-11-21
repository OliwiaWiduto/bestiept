import { useRef, useState, type ReactNode } from 'react'

/**
 * A list you can reorder by dragging the handle on each row (works with touch and mouse).
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

  const down = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    const rows = Array.from(box.current?.children ?? []) as HTMLElement[]
    start.current = { y: e.clientY, tops: rows.map((r) => r.offsetTop), heights: rows.map((r) => r.offsetHeight) }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ from: i, to: i, dy: 0 })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const dy = e.clientY - start.current.y
    const { tops, heights } = start.current
    const centre = tops[drag.from] + heights[drag.from] / 2 + dy
    let to = 0
    for (let k = 0; k < tops.length; k++) if (centre > tops[k] + heights[k] / 2) to = k
    if (centre < tops[0] + heights[0] / 2) to = 0
    setDrag({ ...drag, to, dy })
  }
  const up = () => {
    if (drag && drag.to !== drag.from) onMove(drag.from, drag.to)
    setDrag(null)
  }
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
            onPointerDown={down(i)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keyMove(i)} onClick={(e) => e.stopPropagation()}>
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
