import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { BackButton, toast } from '../components/ui'
import { acceptLink, addPerson, makeCode, removeLink, saveMe, setShare, shareOf, useFamily, type Share } from '../lib/family'

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="switch-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="grow">{label}</span>
      <span className="switch" aria-hidden><span /></span>
    </button>
  )
}

export default function Family() {
  const t = useT()
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
  const { me, links, mine, theirs, loaded, unavailable } = useFamily()
  const [username, setUsername] = useState('')
  const [who, setWho] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (me?.username) setUsername(me.username)
    else if (profile?.name) setUsername(profile.name.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))
  }, [me?.username, profile?.name])

  if (!loaded) return <main className="screen"><div className="row"><BackButton to="/settings" /></div><p className="muted">{t('loading')}</p></main>
  if (unavailable) {
    return (
      <main className="screen">
        <div className="row"><BackButton to="/settings" /></div>
        <h1 className="display">{t('family')}</h1>
        <p className="tip">{t('familyNotSetUp')}</p>
      </main>
    )
  }

  const people = links.filter((l) => l.status === 'accepted')
  const incoming = links.filter((l) => l.status === 'pending' && l.incoming)
  const outgoing = links.filter((l) => l.status === 'pending' && !l.incoming)

  const saveName = async () => {
    setBusy(true)
    const r = await saveMe(username, profile?.name ?? username)
    setBusy(false)
    toast(r === 'ok' ? t('saved') : r === 'taken' ? t('usernameTaken') : t('usernameRules'))
  }
  const add = async () => {
    if (!who.trim()) return
    setBusy(true)
    const r = await addPerson(who)
    setBusy(false)
    toast(t(`link_${r}`))
    if (r === 'requested' || r === 'linked') setWho('')
  }
  const sharing = (id: string, key: keyof Share, v: boolean) => setShare(id, { [key]: v })

  return (
    <main className="screen">
      <div className="row"><BackButton to="/settings" /></div>
      <h1 className="display">{t('family')}</h1>
      <p className="muted" style={{ margin: 0 }}>{t('familyIntro')}</p>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('yourUsername')}</h2>
        <label className="field"><span className="sr-only">{t('yourUsername')}</span>
          <div className="row" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 18 }}>@</span>
            <input className="input grow" value={username} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))} />
          </div>
        </label>
        <span className="caption">{t('usernameRules')}</span>
        <button className="btn secondary" disabled={busy || username.length < 3 || username === me?.username} onClick={saveName}>{t('save')}</button>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('addSomeone')}</h2>
        <input className="input" placeholder={t('usernameOrCode')} value={who} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        <button className="btn primary" disabled={busy || !who.trim()} onClick={add}>{t('add')}</button>
        <div className="divider" />
        {code
          ? <div className="stack" style={{ gap: 4, alignItems: 'center' }}>
              <span className="display" style={{ letterSpacing: 6, fontSize: 40 }}>{code}</span>
              <span className="caption" style={{ textAlign: 'center' }}>{t('codeHelp')}</span>
            </div>
          : <button className="btn ghost" onClick={async () => { const c = await makeCode(); if (c) setCode(c); else toast(t('somethingWrong')) }}>{t('showMyCode')}</button>}
      </section>

      {incoming.length > 0 && (
        <section className="card stack" style={{ gap: 12 }}>
          <h2 className="heading">{t('requests')}</h2>
          {incoming.map((l) => (
            <div key={l.id} className="between" style={{ gap: 8 }}>
              <span className="grow" style={{ fontWeight: 600 }}>{t('wantsToLink', { name: l.person.name })}</span>
              <button className="btn ghost small" onClick={() => removeLink(l.id)}>{t('decline')}</button>
              <button className="btn primary small" onClick={() => acceptLink(l.id)}>{t('accept')}</button>
            </div>
          ))}
        </section>
      )}

      {people.map((l) => {
        const m = shareOf(mine, l.person.id)
        const th = shareOf(theirs, l.person.id)
        const theyShare = [th.plan && t('mealPlan'), th.list && t('shoppingList'), th.macros && t('macros')].filter(Boolean) as string[]
        return (
          <section key={l.id} className="card stack" style={{ gap: 10 }}>
            <div className="between">
              <div className="stack" style={{ gap: 0 }}>
                <h2 className="heading">{l.person.name}</h2>
                {l.person.username && <span className="caption">@{l.person.username}</span>}
              </div>
              {(th.macros || th.plan) && <button className="btn secondary small" onClick={() => nav(`/family/${l.person.id}`)}>{t('seeTheirDay')}</button>}
            </div>
            <span className="small muted">{t('recipesShared')}</span>
            <span className="label" style={{ marginTop: 6 }}>{t('youShare', { name: l.person.name })}</span>
            <Switch label={t('shareMyPlan')} on={m.plan} onChange={(v) => sharing(l.person.id, 'plan', v)} />
            <Switch label={t('shareMyList')} on={m.list} onChange={(v) => sharing(l.person.id, 'list', v)} />
            <Switch label={t('shareMyMacros')} on={m.macros} onChange={(v) => sharing(l.person.id, 'macros', v)} />
            <span className="caption">{t('weightNeverShared')}</span>
            <span className="small muted">{theyShare.length ? t('theyShare', { name: l.person.name, what: theyShare.join(', ') }) : t('theyShareNothing', { name: l.person.name })}</span>
            <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm(t('unlinkConfirm', { name: l.person.name }))) removeLink(l.id) }}>{t('unlink')}</button>
          </section>
        )
      })}

      {outgoing.length > 0 && (
        <section className="card stack" style={{ gap: 10 }}>
          {outgoing.map((l) => (
            <div key={l.id} className="between" style={{ gap: 8 }}>
              <span className="grow small muted">{t('waitingFor', { name: l.person.name })}</span>
              <button className="btn ghost small" onClick={() => removeLink(l.id)}>{t('cancel')}</button>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
