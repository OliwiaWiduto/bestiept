import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { Icon } from './ui'

type Rec = { start: () => void; stop: () => void; abort: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null }
const getRec = (): (new () => Rec) | null => (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null

/** Full-screen "say what you ate" page. Falls back to a plain text box where speech recognition isn't available. */
export function VoiceLog({ onClose, onDone, typing = false }: { onClose: () => void; onDone: (text: string) => Promise<boolean>; typing?: boolean }) {
  const t = useT()
  const Ctor = getRec()
  const [text, setText] = useState('')
  const [live, setLive] = useState('')
  const [listening, setListening] = useState(false)
  const [blocked, setBlocked] = useState(!Ctor || typing)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)
  const rec = useRef<Rec | null>(null)
  const base = useRef('')

  useEffect(() => () => { try { rec.current?.abort() } catch { /* already stopped */ } }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const stop = () => { try { rec.current?.stop() } catch { /* already stopped */ } setListening(false) }
  const start = () => {
    if (!Ctor) return
    try {
      const r = new Ctor()
      r.lang = t.lang === 'pl' ? 'pl-PL' : 'en-GB'
      r.continuous = true
      r.interimResults = true
      base.current = text ? text.trim() + ' ' : ''
      r.onresult = (e) => {
        let fin = '', tmp = ''
        for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (tmp += e.results[i][0].transcript))
        setText((base.current + fin).trim())
        setLive(tmp)
      }
      r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setDenied(true); if (e.error !== 'no-speech' && e.error !== 'aborted') { setBlocked(true); setListening(false) } }
      r.onend = () => { setListening(false); setLive('') }
      rec.current = r
      r.start()
      setListening(true)
    } catch { setBlocked(true) }
  }

  const shown = (text + (live ? (text ? ' ' : '') + live : '')).trimStart()
  const go = async () => {
    stop()
    const said = (text + ' ' + live).trim()
    if (!said) return
    setBusy(true)
    const ok = await onDone(said)
    if (!ok) setBusy(false)
  }

  return (
    <div className="voice" role="dialog" aria-modal="true" aria-label={typing ? t('typeLog') : t('voiceLog')}>
      <div className="between">
        <button className="icon-btn" aria-label={t('back')} onClick={onClose}><Icon name="back" /></button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{typing ? t('typeLog') : t('voiceLog')}</span>
        <span style={{ width: 44 }} />
      </div>
      <h1 className="display" style={{ margin: 0, fontSize: 22, lineHeight: '28px' }}>{listening ? t('voiceListening') : t('voicePrompt')}</h1>
      <textarea className="voice-text" autoFocus={typing} aria-label={t('voicePrompt')} placeholder={t('voicePh')} value={shown} readOnly={busy}
        onChange={(e) => { setText(e.target.value); setLive('') }} />
      {blocked && !typing && <p className="soft" style={{ margin: 0 }}>{t(denied ? 'voiceDenied' : 'voiceNoMic')}</p>}
      {typing && <p className="soft" style={{ margin: 0 }}>{t('typeHint')}</p>}
      {!blocked && !listening && !text && <p className="soft" style={{ margin: 0, textAlign: 'center' }}>{t('voiceTap')}</p>}
      {!blocked && (
        <button className={`voice-mic${listening ? ' on' : ''}`} aria-label={listening ? t('voiceListening') : t('voiceLog')} aria-pressed={listening} onClick={listening ? stop : start}>
          <Icon name="mic" size={36} sw={2} />
        </button>
      )}
      <button className="btn lime block" disabled={busy || !shown.trim()} onClick={go}>{busy ? t('voiceWorking') : t('voiceGo')}</button>
      {text && !busy && <button className="btn ghost" style={{ alignSelf: 'center', border: 'none', color: 'var(--on-green)' }} onClick={() => { stop(); setText(''); setLive('') }}>{t('voiceAgain')}</button>}
    </div>
  )
}
