import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'
import { useT } from '../i18n'

type Mode = 'signUp' | 'signIn' | 'forgot' | 'newPassword'

export default function Auth({ recovery = false, onDone }: { recovery?: boolean; onDone?: () => void }) {
  const t = useT()
  const { lang, setLang } = useStore()
  const [mode, setMode] = useState<Mode>(recovery ? 'newPassword' : 'signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (data.user && data.user.identities?.length === 0) { setMode('signIn'); setPassword(''); setMsg({ kind: 'info', text: t('accountExists') }) }
        else if (!data.session) setMsg({ kind: 'info', text: t('checkEmail') })
      } else if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (error) throw error
        setMsg({ kind: 'info', text: t('resetSent') })
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        onDone?.()
      }
    } catch (err) {
      const m = String((err as Error).message || '')
      if (mode === 'signUp' && /already registered|already exists/i.test(m)) { setMode('signIn'); setPassword(''); setMsg({ kind: 'info', text: t('accountExists') }) }
      else setMsg({ kind: 'error', text: t('authError') })
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signUp' ? t('signUp') : mode === 'signIn' ? t('signIn') : mode === 'forgot' ? t('forgot') : t('newPassword')
  const pwValid = password.length >= 8

  return (
    <main className="screen no-nav" style={{ minHeight: '100dvh', paddingTop: 'calc(env(safe-area-inset-top) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 150px)' }}>
      <img src="/icons/cat-fruitveg.png" alt="" style={{ width: 80, height: 80 }} />
      <h1 className="display" style={{ fontSize: 40, lineHeight: '42px' }}>{t('obWelcome')}</h1>
      <p className="muted" style={{ margin: 0 }}>{t('authSub')}</p>
      <div className="chips" role="group" aria-label={t('language')}>
        <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
        <button className="chip" aria-pressed={lang === 'pl'} onClick={() => setLang('pl')}>Polski</button>
      </div>

      <form className="card stack" style={{ gap: 14, marginTop: 8 }} onSubmit={submit}>
        <h2 className="heading">{title}</h2>
        {mode !== 'newPassword' && (
          <label className="field"><span>{t('email')}</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        {mode !== 'forgot' && (
          <label className="field"><span>{t('password')}</span>
            <input className="input" type="password" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode !== 'signIn' && <span className="caption">{t('passwordHint')}</span>}
          </label>
        )}
        {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className="small" style={{ margin: 0, color: msg.kind === 'error' ? 'var(--cherry)' : 'var(--green)', fontWeight: 600 }}>{msg.text}</p>}
        <button className="btn primary block" disabled={busy || !email.includes('@') && mode !== 'newPassword' || (mode !== 'forgot' && !pwValid)}>{title}</button>
      </form>

      {mode !== 'newPassword' && (
        <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
          {mode !== 'signIn' && <button className="btn ghost small" style={{ border: 'none' }} onClick={() => { setMode('signIn'); setMsg(null) }}>{t('haveAccount')}</button>}
          {mode !== 'signUp' && <button className="btn ghost small" style={{ border: 'none' }} onClick={() => { setMode('signUp'); setMsg(null) }}>{t('noAccount')}</button>}
          {mode === 'signIn' && <button className="btn ghost small" style={{ border: 'none', color: 'var(--ink-muted)' }} onClick={() => { setMode('forgot'); setMsg(null) }}>{t('forgot')}</button>}
        </div>
      )}
    </main>
  )
}
