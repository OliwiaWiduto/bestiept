import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Avatar, BackButton, Icon, toast } from '../components/ui'
import { acceptLink, addPerson, removeLink, saveMe, useFamily } from '../lib/family'
import { makeInviteCard, shareInviteCard } from '../lib/inviteCard'

export default function Family() {
  const t = useT()
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
  const { me, links, loaded, unavailable } = useFamily()
  const [username, setUsername] = useState('')
  const [who, setWho] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [invite, setInvite] = useState<File | null>(null)

  // Draw the invite card ahead of time: phones only open the share sheet straight after a tap.
  useEffect(() => {
    if (!me?.username) { setInvite(null); return }
    let live = true
    makeInviteCard({ name: profile?.name ?? me.username, username: me.username, avatar: profile?.avatar, t })
      .then((f) => { if (live) setInvite(f) })
      .catch(() => { if (live) setInvite(null) })
    return () => { live = false }
  }, [me?.username, profile?.name, profile?.avatar, t.lang])

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
    if (r === 'ok') setEditing(false)
    toast(r === 'ok' ? t('saved') : r === 'taken' ? t('usernameTaken') : t('usernameRules'))
  }
  const sendInvite = async () => {
    if (!invite || !me?.username) { toast(t('inviteMaking')); return }
    const r = await shareInviteCard(invite, t('inviteShareText', { username: me.username }))
    if (r === 'downloaded') toast(t('inviteSaved'))
  }
  const add = async () => {
    if (!who.trim()) return
    setBusy(true)
    const r = await addPerson(who)
    setBusy(false)
    toast(t(`link_${r}`))
    if (r === 'requested' || r === 'linked') setWho('')
  }

  return (
    <main className="screen">
      <div className="row"><BackButton to="/settings" /></div>
      <h1 className="display">{t('family')}</h1>
      <p className="muted" style={{ margin: 0 }}>{t('familyIntro')}</p>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="between">
          <h2 className="heading">{t('yourUsername')}</h2>
          {me?.username && !editing && <button className="pen" aria-label={t('editUsername')} onClick={() => setEditing(true)}><Icon name="edit" size={18} /></button>}
        </div>
        {me?.username && !editing
          ? <span style={{ fontSize: 18, fontWeight: 600 }}>@{me.username}</span>
          : <>
              <label className="field"><span className="sr-only">{t('yourUsername')}</span>
                <div className="row" style={{ gap: 8 }}>
                  <span className="muted" style={{ fontSize: 18 }}>@</span>
                  <input className="input grow" value={username} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus={editing}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && username.length >= 3) saveName() }} />
                </div>
              </label>
              <span className="caption">{t('usernameRules')}</span>
              <div className="row" style={{ gap: 8 }}>
                {editing && <button className="btn ghost small" onClick={() => { setEditing(false); setUsername(me?.username ?? '') }}>{t('cancel')}</button>}
                <button className={editing ? 'btn primary small' : 'btn secondary'} style={editing ? undefined : { flex: 1 }} disabled={busy || username.length < 3 || username === me?.username} onClick={saveName}>{t('save')}</button>
              </div>
            </>}
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2 className="heading">{t('addSomeone')}</h2>
        <input className="input" placeholder={t('theirUsername')} value={who} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        {who.trim() !== '' && <button className="btn primary" disabled={busy} onClick={add}>{t('add')}</button>}
      </section>

      {me?.username && (
        <section className="card stack" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 2 }}>
            <h2 className="heading">{t('inviteTitle')}</h2>
            <span className="small muted">{t('inviteSub')}</span>
          </div>
          <button className="btn primary" onClick={sendInvite}>{t('sendInvite')}</button>
        </section>
      )}

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

      {people.length > 0 && (
        <section className="card stack" style={{ gap: 0, padding: '6px 8px' }}>
          {people.map((l) => (
            <button key={l.id} className="friend-row" onClick={() => nav(`/family/${l.person.id}`)}>
              <Avatar name={l.person.name} avatar={l.person.avatar} size={44} />
              <span className="stack grow" style={{ gap: 0 }}>
                <span style={{ fontWeight: 600 }}>{l.person.name}</span>
                {l.person.username && <span className="caption">@{l.person.username}</span>}
              </span>
              <Icon name="forward" size={20} />
            </button>
          ))}
        </section>
      )}

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
