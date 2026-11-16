import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

/** Uses the phone's built-in barcode reader where there is one (Android Chrome),
 *  otherwise loads a small bundled reader (iPhone Safari). */
async function makeDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  if (Native) {
    try {
      const supported = (await Native.getSupportedFormats?.()) ?? FORMATS
      if (FORMATS.some((f) => supported.includes(f))) return new Native({ formats: FORMATS })
    } catch { /* fall through */ }
  }
  const [{ BarcodeDetector, prepareZXingModule }, wasm] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({ overrides: { locateFile: (p: string, prefix: string) => (p.endsWith('.wasm') ? wasm.default : prefix + p) } })
  return new BarcodeDetector({ formats: FORMATS as never }) as unknown as Detector
}

export function BarcodeScanner({ onCode, onFail }: { onCode: (code: string) => void; onFail: (why: 'denied' | 'unavailable') => void }) {
  const t = useT()
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'starting' | 'scanning' | 'denied' | 'unavailable'>('starting')
  const done = useRef(false)

  useEffect(() => {
    let stream: MediaStream | undefined
    let timer: number | undefined
    let stopped = false
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setState('unavailable'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
      } catch (e) {
        setState((e as Error)?.name === 'NotAllowedError' ? 'denied' : 'unavailable'); return
      }
      if (stopped) { stream.getTracks().forEach((tr) => tr.stop()); return }
      const v = video.current!
      v.srcObject = stream
      await v.play().catch(() => {})
      let detector: Detector
      try { detector = await makeDetector() } catch { setState('unavailable'); return }
      setState('scanning')
      const tick = async () => {
        if (stopped || done.current) return
        try {
          if (v.readyState >= 2) {
            const found = await detector.detect(v)
            const code = found.find((f) => /^\d{8,14}$/.test(f.rawValue))?.rawValue
            if (code && !done.current) {
              done.current = true
              navigator.vibrate?.(60)
              onCode(code)
              return
            }
          }
        } catch { /* keep trying */ }
        timer = window.setTimeout(tick, 200)
      }
      tick()
    })()
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((tr) => tr.stop()) }
  }, [onCode])

  useEffect(() => { if (state === 'denied' || state === 'unavailable') onFail(state) }, [state, onFail])
  return (
    <div className="scanner">
      <video ref={video} playsInline muted aria-label={t('scanBarcode')} />
      <div className="scanner-frame" aria-hidden />
      <span className="scanner-hint">{state === 'starting' ? t('startingCamera') : t('pointAtBarcode')}</span>
    </div>
  )
}
