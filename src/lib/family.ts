import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { supabase } from './supabase'
import type { LogEntry, Macros, PlanItem } from '../types'

/** Family sharing (needs supabase/family.sql). Everything here is online-only and not stored on the phone. */

export type Person = { id: string; username: string | null; name: string }
export type Link = { id: string; person: Person; status: 'pending' | 'accepted'; incoming: boolean }
export type Share = { plan: boolean; list: boolean; macros: boolean }
const NO_SHARE: Share = { plan: false, list: false, macros: false }

type FamilyState = {
  uid: string | null
  me: Person | null
  links: Link[]
  /** What I share with each person */
  mine: Record<string, Share>
  /** What each person shares with me */
  theirs: Record<string, Share>
  loaded: boolean
  unavailable: boolean
}
export const useFamily = create<FamilyState>(() => ({ uid: null, me: null, links: [], mine: {}, theirs: {}, loaded: false, unavailable: false }))

const nameOf = (m?: { display_name?: string; username?: string | null }) => m?.display_name || m?.username || '…'

export async function loadFamily(uid: string) {
  const [me, links, shares] = await Promise.all([
    supabase.from('members').select('id, username, display_name').eq('id', uid).maybeSingle(),
    supabase.from('links').select('id, requester, addressee, status'),
    supabase.from('shares').select('owner, viewer, plan, list, macros'),
  ])
  if (me.error || links.error || shares.error) {
    // Tables missing = family.sql not run yet
    useFamily.setState({ uid, loaded: true, unavailable: true })
    return
  }
  const otherIds = (links.data ?? []).map((l) => (l.requester === uid ? l.addressee : l.requester))
  const people = otherIds.length ? (await supabase.from('members').select('id, username, display_name').in('id', otherIds)).data ?? [] : []
  const byId = new Map(people.map((p) => [p.id, p]))
  const mine: Record<string, Share> = {}
  const theirs: Record<string, Share> = {}
  for (const s of shares.data ?? []) {
    const v = { plan: s.plan, list: s.list, macros: s.macros }
    if (s.owner === uid) mine[s.viewer] = v
    else theirs[s.owner] = v
  }
  useFamily.setState({
    uid,
    loaded: true,
    unavailable: false,
    me: me.data ? { id: uid, username: me.data.username, name: nameOf(me.data) } : null,
    links: (links.data ?? []).map((l) => {
      const other = l.requester === uid ? l.addressee : l.requester
      const p = byId.get(other)
      return { id: l.id, status: l.status, incoming: l.addressee === uid, person: { id: other, username: p?.username ?? null, name: nameOf(p) } }
    }),
    mine,
    theirs,
  })
}

const reload = () => { const uid = useFamily.getState().uid; return uid ? loadFamily(uid) : Promise.resolve() }

export const shareOf = (rec: Record<string, Share>, id: string): Share => rec[id] ?? NO_SHARE
export const linkedPeople = (s: FamilyState) => s.links.filter((l) => l.status === 'accepted').map((l) => l.person)
export const personName = (id: string | undefined) => (id ? useFamily.getState().links.find((l) => l.person.id === id)?.person.name : undefined)

export type UsernameResult = 'ok' | 'taken' | 'invalid'
export async function saveMe(username: string, name: string): Promise<UsernameResult> {
  const uid = useFamily.getState().uid
  if (!uid) return 'invalid'
  const u = username.trim().toLowerCase()
  if (!/^[a-z0-9_.]{3,20}$/.test(u)) return 'invalid'
  const { error } = await supabase.from('members').upsert({ id: uid, username: u, display_name: name.trim().slice(0, 40), updated_at: new Date().toISOString() })
  if (error) return error.code === '23505' ? 'taken' : 'invalid'
  await reload()
  return 'ok'
}

/** Keep my display name in step with my profile name. */
export async function syncDisplayName(name: string) {
  const { uid, me } = useFamily.getState()
  if (!uid || !me || me.name === name || !name.trim()) return
  await supabase.from('members').update({ display_name: name.trim().slice(0, 40) }).eq('id', uid)
  await reload()
}

export type RequestResult = 'requested' | 'linked' | 'already_requested' | 'already_linked' | 'not_found' | 'self' | 'invalid' | 'error'
/** Link by username, or by someone's 6-character code. */
export async function addPerson(input: string): Promise<RequestResult> {
  const v = input.trim().replace(/^@/, '')
  const looksLikeCode = /^[a-z2-9]{6}$/i.test(v)
  if (looksLikeCode) {
    const { data } = await supabase.rpc('redeem_pair_code', { pair_code: v.toUpperCase() })
    if (data === 'linked' || data === 'self') { await reload(); return data }
  }
  const { data, error } = await supabase.rpc('request_link', { target_username: v })
  if (error) return 'error'
  await reload()
  return data === 'not_found' && looksLikeCode ? 'invalid' : (data as RequestResult)
}

export async function makeCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_pair_code')
  return error ? null : (data as string)
}

export async function acceptLink(id: string) { await supabase.rpc('accept_link', { link_id: id }); await reload() }
export async function removeLink(id: string) { await supabase.from('links').delete().eq('id', id); await reload() }

export async function setShare(viewer: string, patch: Partial<Share>) {
  const { uid, mine } = useFamily.getState()
  if (!uid) return
  const next = { ...shareOf(mine, viewer), ...patch }
  useFamily.setState({ mine: { ...mine, [viewer]: next } })
  const { error } = await supabase.from('shares').upsert({ owner: uid, viewer, ...next, updated_at: new Date().toISOString() })
  if (error) await reload()
}

/** Someone's food log and targets for a day (only works if they share macros with me). */
export async function fetchTheirDay(owner: string, date: string): Promise<{ logs: LogEntry[]; targets: Macros | null }> {
  const [l, t] = await Promise.all([
    supabase.from('log_entries').select('data').eq('user_id', owner).eq('date', date),
    supabase.rpc('shared_targets', { owner_id: owner }),
  ])
  return { logs: (l.data ?? []).map((x) => x.data as LogEntry), targets: (t.data as Macros | null) ?? null }
}

/** Someone's meal plan between two dates (only works if they share their plan or list with me). */
export async function fetchTheirPlan(owner: string, from: string, to: string): Promise<PlanItem[]> {
  const { data } = await supabase.from('plan_items').select('data').eq('user_id', owner).gte('date', from).lte('date', to)
  return (data ?? []).map((x) => x.data as PlanItem)
}

/** Meal plans of people who share their shopping list with me, for the week starting `start`. */
export function useFamilyLists(start: string): { person: Person; plan: PlanItem[] }[] {
  const links = useFamily((s) => s.links)
  const theirs = useFamily((s) => s.theirs)
  const [out, setOut] = useState<{ person: Person; plan: PlanItem[] }[]>([])
  useEffect(() => {
    const people = links.filter((l) => l.status === 'accepted' && shareOf(theirs, l.person.id).list).map((l) => l.person)
    if (!people.length) { setOut([]); return }
    let alive = true
    const end = new Date(start + 'T12:00:00'); end.setDate(end.getDate() + 6)
    const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    Promise.all(people.map(async (person) => ({ person, plan: await fetchTheirPlan(person.id, start, to) }))).then((r) => { if (alive) setOut(r) })
    return () => { alive = false }
  }, [links, theirs, start])
  return out
}
