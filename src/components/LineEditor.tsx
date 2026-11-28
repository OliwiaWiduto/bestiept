import { useEffect, useRef, useState } from 'react'

/**
 * A list you type into one line at a time (Enter for a new line, Backspace on an empty line to remove it).
 * Each line is its own box, so a line can be styled (crossed out) without the cursor drifting.
 */
export function LineEditor({ value, onChange, onFocus, onDone, struck, placeholder, label, addOnTop }: {
  value: string; onChange: (v: string) => void; onFocus?: () => void; onDone: (v?: string) => void
  struck: (line: string) => boolean; placeholder: string; label: string
  /** The empty "add" line sits at the top (with the placeholder) and new things go in above the rest. */
  addOnTop?: boolean
}) {
  const lines = value === '' ? (addOnTop ? [] : ['']) : value.split('\n')
  const shown = addOnTop || lines[lines.length - 1].trim() === '' ? lines : [...lines, '']
  const [draft, setDraft] = useState('')
  const topRef = useRef<HTMLInputElement | null>(null)
  /** Put the typed line(s) at the top of the list and return the new text. */
  const addDraft = (more: string[]) => {
    const parts = more.map((p) => p.trim()).filter(Boolean)
    if (!parts.length) return value
    const v = [...parts, ...(value ? [value] : [])].join('\n')
    onChange(v)
    return v
  }
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const focusNext = useRef<{ i: number; at: 'start' | 'end' } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const f = focusNext.current
    if (!f) return
    focusNext.current = null
    const el = refs.current[f.i]
    if (!el) return
    el.focus()
    const pos = f.at === 'end' ? el.value.length : 0
    el.setSelectionRange(pos, pos)
  })

  const set = (next: string[]) => {
    while (next.length > 1 && next[next.length - 1].trim() === '' && next[next.length - 2].trim() === '') next.pop()
    const v = next.join('\n').replace(/\n+$/, '')
    // Nothing changed (Enter on the empty last line): don't leave a pending jump that would
    // fire after the next letter and split the word across two lines.
    if (v === value) {
      // Same text (Enter at the end of the last line, whose empty line below already exists): move now,
      // rather than after the next letter, which would split the word.
      const f = focusNext.current
      focusNext.current = null
      const el = f ? refs.current[f.i] : null
      if (el) { el.focus(); const pos = f!.at === 'end' ? el.value.length : 0; el.setSelectionRange(pos, pos) }
      return
    }
    onChange(v)
  }

  return (
    <div ref={wrap} className="line-editor" role="group" aria-label={label}
      onBlur={(e) => {
        if (wrap.current?.contains(e.relatedTarget as Node | null)) return
        if (draft.trim()) { const v = addDraft([draft]); setDraft(''); onDone(v) } else onDone()
      }}>
      {addOnTop && (
        <input ref={topRef} className={shown.length ? "add" : undefined} value={draft} aria-label={placeholder} placeholder={placeholder}
          enterKeyHint="done" autoCapitalize="sentences" onFocus={onFocus}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const txt = e.clipboardData.getData('text')
            if (!txt.includes('\n')) return
            e.preventDefault()
            addDraft([draft, ...txt.split(/\r?\n/)]); setDraft('')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            addDraft([draft]); setDraft('')
          }} />
      )}
      {shown.map((line, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }} value={line} aria-label={`${label} ${i + 1}`}
          className={struck(line.trim().toLowerCase()) ? 'struck' : undefined}
          placeholder={!addOnTop && i === shown.length - 1 ? placeholder : undefined}
          enterKeyHint="next" autoCapitalize="sentences"
          onFocus={onFocus}
          onChange={(e) => { const next = [...shown]; next[i] = e.target.value; set(next) }}
          onPaste={(e) => {
            const txt = e.clipboardData.getData('text')
            if (!txt.includes('\n')) return
            e.preventDefault()
            const parts = txt.split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
            const next = [...shown]; next.splice(i, line.trim() ? 1 : 1, ...(line.trim() ? [line, ...parts] : parts))
            focusNext.current = { i: i + parts.length - (line.trim() ? 0 : 1), at: 'end' }
            set(next)
          }}
          onKeyDown={(e) => {
            const el = e.currentTarget
            if (e.key === 'Enter') {
              e.preventDefault()
              const pos = el.selectionStart ?? line.length
              const next = [...shown]
              next.splice(i, 1, line.slice(0, pos), line.slice(pos))
              focusNext.current = { i: i + 1, at: 'start' }
              set(next)
            } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
              e.preventDefault()
              const next = [...shown]
              const prevLen = next[i - 1].length
              next.splice(i - 1, 2, next[i - 1] + line)
              focusNext.current = { i: i - 1, at: 'end' }
              set(next)
              requestAnimationFrame(() => refs.current[i - 1]?.setSelectionRange(prevLen, prevLen))
            } else if (e.key === 'ArrowDown' && i < shown.length - 1) { e.preventDefault(); refs.current[i + 1]?.focus() }
            else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus() }
          }} />
      ))}
    </div>
  )
}
