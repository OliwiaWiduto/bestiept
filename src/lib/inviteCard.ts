/**
 * The "Be my bestie?" invite card, drawn as a PNG so it can go through the phone's share sheet
 * (Messenger, WhatsApp, Copy…). Layout matches the pink card on the design canvas.
 */
import { AVATARS } from '../components/ui'

type T = (key: any, vars?: Record<string, string | number>) => string

const W = 340
const PAD = 18
const SCALE = 3
const C = {
  pink: '#F9D9E2', cream: '#FFFCF6', surface: '#FFF8F3', ink: '#1B211C', green: '#313616', onGreen: '#F4F7E6',
  cherry: '#D50042', peach: '#F6DFD2', line: '#E5DFD3',
}
const AVATAR_BG: Record<string, string> = { strawberry: '#F9D9E2', avocado: '#ECF1C8', lemon: '#FFEFCB', peach: '#F6DFD2' }
const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif'
const SANS = 'Inter, system-ui, sans-serif'

type Seg = { text: string; bold: boolean }
type Line = { segs: Seg[]; width: number }

/** "Open **BestiePT**" → segments with bold runs. */
function parse(s: string): Seg[] {
  return s.split('**').map((text, i) => ({ text, bold: i % 2 === 1 })).filter((x) => x.text)
}

function font(size: number, bold: boolean) {
  return `${bold ? 600 : 400} ${size}px ${SANS}`
}

/** Word-wrap rich text to a width. */
function wrap(ctx: CanvasRenderingContext2D, s: string, size: number, max: number): Line[] {
  const words: Seg[] = []
  for (const seg of parse(s)) {
    seg.text.split(/(\s+)/).forEach((w) => { if (w) words.push({ text: w, bold: seg.bold }) })
  }
  const lines: Line[] = []
  let cur: Seg[] = []
  let width = 0
  for (const w of words) {
    ctx.font = font(size, w.bold)
    const ww = ctx.measureText(w.text).width
    const isSpace = /^\s+$/.test(w.text)
    if (!isSpace && width + ww > max && cur.length) {
      while (cur.length && /^\s+$/.test(cur[cur.length - 1].text)) { ctx.font = font(size, cur[cur.length - 1].bold); width -= ctx.measureText(cur.pop()!.text).width }
      lines.push({ segs: cur, width })
      cur = []
      width = 0
    }
    if (isSpace && !cur.length) continue
    cur.push(w)
    width += ww
  }
  if (cur.length) lines.push({ segs: cur, width })
  return lines
}

function drawLines(ctx: CanvasRenderingContext2D, lines: Line[], x: number, y: number, size: number, lh: number, color: string, align: 'left' | 'center' = 'left', boxW = 0) {
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  lines.forEach((ln, i) => {
    let cx = align === 'center' ? x + (boxW - ln.width) / 2 : x
    for (const s of ln.segs) {
      ctx.font = font(size, s.bold)
      ctx.fillText(s.text, cx, y + i * lh + lh / 2)
      cx += ctx.measureText(s.text).width
    }
  })
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
}

/** Biggest size (down to min) at which a single line fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, size: number, min: number, max: number) {
  let s = size
  for (; s > min; s -= 0.5) { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= max) break }
  ctx.font = `${weight} ${s}px ${family}`
  return s
}

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    return img
  } catch {
    return null
  }
}

export async function makeInviteCard(opts: { name: string; username: string; avatar?: string; t: T }): Promise<File> {
  const { name, username, avatar, t } = opts
  await Promise.all([
    document.fonts.load(`800 26px ${DISPLAY}`), document.fonts.load(`400 14px ${SANS}`), document.fonts.load(`600 14px ${SANS}`),
  ]).catch(() => {})
  const preset = AVATARS.find((a) => a.id === avatar)
  const [icon, face] = await Promise.all([loadImg('/pwa-192.png'), preset ? loadImg(`/avatars/${preset.id}.png`) : Promise.resolve(null)])

  // Measure first (so the canvas is exactly as tall as the card), then draw.
  const m = document.createElement('canvas').getContext('2d')!
  const textX = PAD + 10 + 24 + 10
  const rowRight = W - PAD - 10
  const intro = wrap(m, t('inviteFourTaps'), 14, W - PAD * 2)
  m.font = `600 13px ${SANS}`
  const pillLabel = t('family')
  const pillW = m.measureText(pillLabel).width + 12 + 10 + 18
  const steps = [
    { lines: wrap(m, t('inviteStep1'), 14, rowRight - 36 - 10 - textX), kind: 'icon' as const },
    { lines: wrap(m, t('inviteStep2'), 14, rowRight - 36 - 10 - textX), kind: 'face' as const },
    { lines: wrap(m, t('inviteStep3'), 14, rowRight - pillW - 10 - textX), kind: 'pill' as const },
    { lines: wrap(m, t('inviteStep4', { addSomeone: t('addSomeone'), add: t('add') }), 14, rowRight - textX), kind: 'input' as const },
  ]
  const rowH = steps.map((s, i) => (i === 3 ? 10 + Math.max(24, s.lines.length * 18) + 8 + 36 + 10 : Math.max(52, 16 + s.lines.length * 18)))
  const footer = wrap(m, t('inviteFooter'), 13, W - PAD * 2)
  const H = 28 + 16 + 12 + 60 + 12 + intro.length * 18 + 12 + rowH.reduce((a, b) => a + b, 0) + 6 * 3 + 12 + footer.length * 18 + 28

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = Math.ceil(H * SCALE)
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = C.pink
  ctx.fillRect(0, 0, W, H)

  let y = 28
  ctx.textBaseline = 'middle'
  ctx.fillStyle = C.green
  ctx.font = `800 14px ${DISPLAY}`
  ctx.fillText('BestiePT', PAD, y + 8)
  y += 16 + 12

  // Profile picture: her fruit, or her initial.
  const ax = PAD + 30, ay = y + 30
  ctx.beginPath(); ctx.arc(ax, ay, 30, 0, Math.PI * 2); ctx.fillStyle = C.cream; ctx.fill()
  ctx.beginPath(); ctx.arc(ax, ay, 27, 0, Math.PI * 2); ctx.fillStyle = preset ? AVATAR_BG[preset.id] ?? C.pink : C.pink; ctx.fill()
  if (face) {
    ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 27, 0, Math.PI * 2); ctx.clip()
    const s = 54 * 0.82
    ctx.drawImage(face, ax - s / 2, ay - s / 2 + 54 * 0.03, s, s)
    ctx.restore()
  } else {
    ctx.fillStyle = C.cherry; ctx.font = `800 24px ${DISPLAY}`; ctx.textAlign = 'center'
    ctx.fillText((name || username).slice(0, 1).toUpperCase(), ax, ay + 1)
    ctx.textAlign = 'left'
  }
  const hx = PAD + 60 + 12, hw = W - PAD - hx
  fit(ctx, t('inviteBeMyBestie'), DISPLAY, 800, 26, 17, hw)
  ctx.fillStyle = C.green
  ctx.fillText(t('inviteBeMyBestie'), hx, ay - 12)
  fit(ctx, '@' + username, DISPLAY, 800, 20, 13, hw)
  ctx.fillStyle = C.cherry
  ctx.fillText('@' + username, hx, ay + 14)
  y += 60 + 12

  drawLines(ctx, intro, PAD, y, 14, 18, C.ink)
  y += intro.length * 18 + 12

  steps.forEach((s, i) => {
    const h = rowH[i]
    rr(ctx, PAD, y, W - PAD * 2, h, 18, C.cream)
    const numY = i === 3 ? y + 10 + 12 : y + h / 2
    ctx.beginPath(); ctx.arc(PAD + 10 + 12, numY, 12, 0, Math.PI * 2); ctx.fillStyle = C.cherry; ctx.fill()
    ctx.fillStyle = '#FFFFFF'; ctx.font = `600 13px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), PAD + 22, numY + 0.5); ctx.textAlign = 'left'
    const textH = s.lines.length * 18
    const ty = i === 3 ? y + 10 + Math.max(0, (24 - textH) / 2) : y + (h - textH) / 2
    drawLines(ctx, s.lines, textX, ty, 14, 18, C.ink)
    const cy = y + h / 2
    if (s.kind === 'icon') {
      if (icon) { ctx.save(); ctx.beginPath(); ctx.roundRect(rowRight - 36, cy - 18, 36, 36, 10); ctx.clip(); ctx.drawImage(icon, rowRight - 36, cy - 18, 36, 36); ctx.restore() }
    } else if (s.kind === 'face') {
      const fx = rowRight - 18
      ctx.beginPath(); ctx.arc(fx, cy, 22, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill()
      ctx.beginPath(); ctx.arc(fx, cy, 18, 0, Math.PI * 2); ctx.fillStyle = C.green; ctx.fill()
      ctx.save(); ctx.translate(fx - 9, cy - 9); ctx.scale(18 / 24, 18 / 24)
      ctx.strokeStyle = C.onGreen; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.arc(12, 8, 4, 0, Math.PI * 2); ctx.stroke()
      ctx.stroke(new Path2D('M4 21a8 8 0 0 1 16 0'))
      ctx.restore()
    } else if (s.kind === 'pill') {
      const px = rowRight - pillW
      rr(ctx, px, cy - 16, pillW, 32, 16, C.peach)
      ctx.fillStyle = C.green; ctx.font = `600 13px ${SANS}`; ctx.fillText(pillLabel, px + 12, cy + 0.5)
      ctx.save(); ctx.translate(rowRight - 10 - 14, cy - 7); ctx.scale(14 / 24, 14 / 24)
      ctx.strokeStyle = C.green; ctx.lineWidth = 2.25; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.stroke(new Path2D('M9 6l6 6-6 6')); ctx.restore()
    } else {
      const py = y + 10 + Math.max(24, textH) + 8
      ctx.font = `600 14px ${SANS}`
      const addW = ctx.measureText(t('add')).width + 32
      const inW = rowRight - textX - 6 - addW
      rr(ctx, textX, py, inW, 36, 18, C.surface, C.line)
      ctx.fillStyle = C.ink
      fit(ctx, username, SANS, 600, 14, 10, inW - 28)
      ctx.fillText(username, textX + 14, py + 18.5)
      rr(ctx, rowRight - addW, py, addW, 36, 18, C.cherry)
      ctx.fillStyle = '#FFFFFF'; ctx.font = `600 14px ${SANS}`; ctx.textAlign = 'center'
      ctx.fillText(t('add'), rowRight - addW / 2, py + 18.5); ctx.textAlign = 'left'
    }
    y += h + 6
  })
  y += 12 - 6

  ctx.font = `500 13px ${SANS}`
  drawLines(ctx, footer, PAD, y, 13, 18, C.ink, 'center', W - PAD * 2)

  const blob: Blob = await new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('no image'))), 'image/png'))
  return new File([blob], `bestiept-invite-${username}.png`, { type: 'image/png' })
}

/**
 * Open the phone's share sheet with the card (people, apps, Copy, Save image).
 * Where sharing images isn't supported (most desktop browsers), the card downloads instead.
 */
export async function shareInviteCard(file: File, text: string): Promise<'shared' | 'cancelled' | 'downloaded'> {
  const data: ShareData = { files: [file], text }
  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled'
      // Some apps reject text alongside a file: try the image on its own.
      try { await navigator.share({ files: [file] }); return 'shared' } catch (e2) { if ((e2 as Error)?.name === 'AbortError') return 'cancelled' }
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
