import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore, type SyncMeta } from '../store'
import type { LogEntry, PlanItem, Recipe, WeightEntry } from '../types'

/**
 * Local-first sync. The phone keeps a full copy (works offline); changes are pushed to
 * Supabase a moment after they happen and pulled again whenever the app comes back to the front.
 * `sync.snap` remembers what the cloud had at the last sync, so we can tell local edits,
 * new items and deletions apart without timestamps.
 */

type Coll = 'recipes' | 'logs' | 'plan' | 'weights'
const TABLE: Record<Exclude<Coll, 'weights'>, string> = { recipes: 'recipes', logs: 'log_entries', plan: 'plan_items' }

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + s.length.toString(36)
}
const h = (v: unknown) => hash(JSON.stringify(v))

type Local = ReturnType<typeof useStore.getState>
const profileDoc = (s: Pick<Local, 'profile' | 'targets' | 'lang' | 'units' | 'shopping' | 'pwaDismissedAt'>) =>
  ({ profile: s.profile, targets: s.targets, lang: s.lang, units: s.units, shopping: s.shopping, pwaDismissedAt: s.pwaDismissedAt })

const items = (s: Local, c: Coll): { id: string }[] =>
  c === 'weights' ? s.weights.map((w) => ({ ...w, id: w.date })) : (s[c] as { id: string }[])

type Remote = {
  profile: ReturnType<typeof profileDoc> | null
  recipes: Recipe[]
  logs: LogEntry[]
  plan: PlanItem[]
  weights: WeightEntry[]
}

async function pull(uid: string): Promise<Remote> {
  const [p, r, l, pl, w] = await Promise.all([
    supabase.from('profiles').select('data').eq('id', uid).maybeSingle(),
    supabase.from('recipes').select('data'),
    supabase.from('log_entries').select('data'),
    supabase.from('plan_items').select('data'),
    supabase.from('weights').select('date, kg').order('date'),
  ])
  const err = p.error || r.error || l.error || pl.error || w.error
  if (err) throw err
  return {
    profile: (p.data?.data as Remote['profile']) ?? null,
    recipes: (r.data ?? []).map((x) => x.data as Recipe),
    logs: (l.data ?? []).map((x) => x.data as LogEntry),
    plan: (pl.data ?? []).map((x) => x.data as PlanItem),
    weights: (w.data ?? []).map((x) => ({ date: x.date as string, kg: Number(x.kg) })),
  }
}

function snapshotOf(r: Remote): SyncMeta['snap'] {
  const snap: SyncMeta['snap'] = { recipes: {}, logs: {}, plan: {}, weights: {}, profile: {}, photos: {} }
  for (const x of r.recipes) snap.recipes[x.id] = h(x)
  for (const x of r.logs) snap.logs[x.id] = h(x)
  for (const x of r.plan) snap.plan[x.id] = h(x)
  for (const x of r.weights) snap.weights[x.date] = h({ ...x, id: x.date })
  if (r.profile) snap.profile.me = h(r.profile)
  return snap
}

function applyRemote(r: Remote) {
  const s = useStore.getState()
  s.loadRemote({
    profile: r.profile?.profile ?? null,
    targets: r.profile?.targets ?? null,
    shopping: r.profile?.shopping ?? s.shopping,
    lang: r.profile?.lang ?? s.lang,
    units: r.profile?.units ?? s.units,
    pwaDismissedAt: r.profile?.pwaDismissedAt ?? s.pwaDismissedAt,
    recipes: r.recipes,
    logs: r.logs,
    plan: r.plan,
    weights: r.weights,
  })
}

/** Keep the local version of anything edited since the last sync; take the cloud's for the rest. */
function mergeColl<T extends { id: string }>(local: T[], remote: T[], snap: Record<string, string>): T[] {
  const localById = new Map(local.map((x) => [x.id, x]))
  const out: T[] = []
  for (const r of remote) {
    const l = localById.get(r.id)
    out.push(l && h(l) !== snap[r.id] ? l : r)
    localById.delete(r.id)
  }
  for (const l of localById.values()) if (!(l.id in snap)) out.push(l) // made on this phone, not pushed yet
  return out
}

/** Run once after signing in, and again whenever the app returns to the foreground. */
export async function syncNow(uid: string): Promise<void> {
  const remote = await pull(uid)
  const s = useStore.getState()

  if (s.sync.ownerId !== uid) {
    if (s.sync.ownerId === null && !remote.profile && s.profile) {
      // First sign-in on a phone that already has data: move it into the new account.
      s.setSync({ ownerId: uid, snap: {} })
    } else {
      applyRemote(remote)
      useStore.getState().setSync({ ownerId: uid, snap: snapshotOf(remote) })
      return
    }
  } else {
    const snap = s.sync.snap
    const localProfileChanged = h(profileDoc(s)) !== snap.profile?.me
    const merged: Remote = {
      profile: localProfileChanged || !remote.profile ? profileDoc(s) : remote.profile,
      recipes: mergeColl(s.recipes, remote.recipes, snap.recipes ?? {}),
      logs: mergeColl(s.logs, remote.logs, snap.logs ?? {}),
      plan: mergeColl(s.plan, remote.plan, snap.plan ?? {}),
      weights: mergeColl(s.weights.map((w) => ({ ...w, id: w.date })), remote.weights.map((w) => ({ ...w, id: w.date })), snap.weights ?? {})
        .map(({ date, kg }) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date)),
    }
    if (merged.profile?.profile || remote.profile) applyRemote(merged)
    useStore.getState().setSync({ ownerId: uid, snap: { ...snapshotOf(remote), photos: snap.photos ?? {} } })
  }
  await push(uid)
}

async function photoForCloud(uid: string, kind: string, id: string, photo: string | undefined, photos: Record<string, string>): Promise<string | undefined> {
  if (!photo?.startsWith('data:')) return photo
  const path = `${uid}/${kind}-${id}.jpg`
  const ph = hash(photo)
  if (photos[path] !== ph) {
    const blob = await (await fetch(photo)).blob()
    const { error } = await supabase.storage.from('photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw error
    photos[path] = ph
  }
  return `sb:${path}`
}

let pushing: Promise<void> | null = null
let again = false

/** Send local changes (new, edited, deleted) to the cloud. */
export function push(uid: string): Promise<void> {
  if (pushing) { again = true; return pushing }
  pushing = (async () => {
    try {
      do {
        again = false
        await pushOnce(uid)
      } while (again)
    } finally {
      pushing = null
    }
  })()
  return pushing
}

async function pushOnce(uid: string) {
  const s = useStore.getState()
  if (s.sync.ownerId !== uid) return
  const snap: SyncMeta['snap'] = JSON.parse(JSON.stringify(s.sync.snap))
  const photos = (snap.photos ??= {})
  const now = new Date().toISOString()

  for (const c of ['recipes', 'logs', 'plan', 'weights'] as Coll[]) {
    const cur = items(s, c)
    const prev = (snap[c] ??= {})
    const changed = cur.filter((x) => prev[x.id] !== h(x))
    const curIds = new Set(cur.map((x) => x.id))
    const removed = Object.keys(prev).filter((id) => !curIds.has(id))

    if (changed.length) {
      if (c === 'weights') {
        const { error } = await supabase.from('weights').upsert(changed.map((w) => { const x = w as unknown as WeightEntry; return { user_id: uid, date: x.date, kg: x.kg, updated_at: now } }))
        if (error) throw error
      } else {
        const rows = []
        for (const x of changed as (Recipe | LogEntry | PlanItem)[]) {
          const photo = 'photo' in x ? await photoForCloud(uid, c, x.id, x.photo, photos) : undefined
          const data = 'photo' in x ? { ...x, photo } : x
          rows.push({ id: x.id, user_id: uid, data, updated_at: now, ...('date' in x ? { date: x.date } : {}) })
        }
        const { error } = await supabase.from(TABLE[c]).upsert(rows)
        if (error) throw error
      }
      for (const x of changed) prev[x.id] = h(x)
    }
    if (removed.length) {
      const q = c === 'weights'
        ? supabase.from('weights').delete().eq('user_id', uid).in('date', removed)
        : supabase.from(TABLE[c]).delete().in('id', removed)
      const { error } = await q
      if (error) throw error
      for (const id of removed) delete prev[id]
    }
  }

  const doc = profileDoc(s)
  const ph = h(doc)
  if (s.profile && (snap.profile ??= {}).me !== ph) {
    const { error } = await supabase.from('profiles').upsert({ id: uid, data: doc, updated_at: now })
    if (error) throw error
    snap.profile.me = ph
  } else if (!s.profile && snap.profile?.me) {
    const { error } = await supabase.from('profiles').delete().eq('id', uid)
    if (error) throw error
    delete snap.profile.me
  }
  useStore.getState().setSync({ ownerId: uid, snap })
}

/** Push shortly after every change, and pull when the app comes back to the front. */
export function startAutoSync(uid: string): () => void {
  let timer: number | undefined
  const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(() => push(uid).catch(console.error), 1200) }
  const unsub = useStore.subscribe((st, prev) => {
    if (st.recipes !== prev.recipes || st.logs !== prev.logs || st.plan !== prev.plan || st.weights !== prev.weights ||
      st.profile !== prev.profile || st.targets !== prev.targets || st.shopping !== prev.shopping || st.lang !== prev.lang || st.units !== prev.units || st.pwaDismissedAt !== prev.pwaDismissedAt) schedule()
  })
  const onVis = () => {
    if (document.visibilityState === 'visible') syncNow(uid).catch(console.error)
    else push(uid).catch(console.error)
  }
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('online', onVis)
  return () => { unsub(); window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onVis) }
}

/** Sign out: send anything unsaved, then clear this phone. */
export async function signOutEverywhere() {
  const s = useStore.getState()
  if (s.sync.ownerId) await push(s.sync.ownerId).catch(console.error)
  await supabase.auth.signOut()
  useStore.getState().resetAll()
  useStore.getState().setSync({ ownerId: null, snap: {} })
}

const signed = new Map<string, { url: string; exp: number }>()
/** Photos are data URLs until synced, then `sb:<path>` in the private bucket; this returns something an <img> can show. */
export function usePhoto(src: string | undefined): string | undefined {
  const cached = src?.startsWith('sb:') ? signed.get(src) : undefined
  const [url, setUrl] = useState<string | undefined>(src?.startsWith('sb:') ? (cached && cached.exp > Date.now() ? cached.url : undefined) : src)
  useEffect(() => {
    if (!src?.startsWith('sb:')) { setUrl(src); return }
    const c = signed.get(src)
    if (c && c.exp > Date.now()) { setUrl(c.url); return }
    let alive = true
    supabase.storage.from('photos').createSignedUrl(src.slice(3), 60 * 60 * 24 * 7).then(({ data }) => {
      if (data?.signedUrl && alive) {
        signed.set(src, { url: data.signedUrl, exp: Date.now() + 1000 * 60 * 60 * 24 * 6 })
        setUrl(data.signedUrl)
      }
    })
    return () => { alive = false }
  }, [src])
  return url
}
