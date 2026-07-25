'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  addDoc, collection, doc, getDocs, query, where, limit,
  serverTimestamp, updateDoc, Timestamp,
} from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseDb } from './client'

// ─── Auth hook ────────────────────────────────────────────────────────────────
// `undefined` = still resolving, `null` = signed out, User = signed in.
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) { setUser(null); return }   // misconfigured build → treat as signed out
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])
  return user
}

// ─── Session model ────────────────────────────────────────────────────────────
export type SessionStatus = 'in_progress' | 'completed'

export interface SessionRecord {
  id: string
  hz: number
  band: string
  viz: string
  /** Session length the user chose, in seconds. */
  plannedSeconds: number
  /** How much was actually listened to, in seconds. */
  elapsedSeconds: number
  status: SessionStatus
  beforeScore: number | null
  /** null means the user hasn't left feedback yet. */
  afterScore: number | null
  createdAt: Date
}

interface SessionDoc {
  uid: string
  hz: number
  band: string
  viz?: string
  plannedSeconds?: number
  elapsedSeconds?: number
  status?: SessionStatus
  beforeScore: number | null
  afterScore: number | null
  createdAt: Timestamp | null
  // legacy field from the first version of this collection
  durationSeconds?: number
}

/**
 * Create the session document as soon as playback begins, so a session shows
 * up in history even if the user pauses and walks away (or hits the free-plan
 * paywall) without ever finishing it. Returns the doc id, or null when signed
 * out / unconfigured — callers treat null as "not tracking".
 */
export async function startSession(input: {
  hz: number
  band: string
  viz: string
  plannedSeconds: number
  beforeScore: number | null
}): Promise<string | null> {
  const auth = getFirebaseAuth()
  const db = getFirebaseDb()
  const user = auth?.currentUser
  if (!user || !db) return null
  try {
    const ref = await addDoc(collection(db, 'sessions'), {
      uid: user.uid,
      hz: input.hz,
      band: input.band,
      viz: input.viz,
      plannedSeconds: input.plannedSeconds,
      elapsedSeconds: 0,
      status: 'in_progress' as SessionStatus,
      beforeScore: input.beforeScore,
      afterScore: null,
      createdAt: serverTimestamp(),
    })
    return ref.id
  } catch (err) {
    console.warn('[Solive] Could not start session:', err)
    return null
  }
}

/** Record progress (on pause, on leaving, on completion). */
export async function updateSessionProgress(
  id: string,
  elapsedSeconds: number,
  status: SessionStatus,
): Promise<void> {
  const db = getFirebaseDb()
  if (!db || !id) return
  try {
    await updateDoc(doc(db, 'sessions', id), {
      elapsedSeconds: Math.round(elapsedSeconds),
      status,
    })
  } catch (err) {
    console.warn('[Solive] Could not update session:', err)
  }
}

/** Attach (or change) the user's after-session feedback score. */
export async function rateSession(id: string, afterScore: number): Promise<void> {
  const db = getFirebaseDb()
  if (!db || !id) return
  try {
    await updateDoc(doc(db, 'sessions', id), { afterScore })
  } catch (err) {
    console.warn('[Solive] Could not save feedback:', err)
  }
}

// Fetch the signed-in user's sessions, newest first.
// Sorted client-side so no Firestore composite index is required.
export async function fetchSessions(uid: string): Promise<SessionRecord[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, 'sessions'),
    where('uid', '==', uid),
    limit(300),
  )
  const snap = await getDocs(q)
  const rows: SessionRecord[] = snap.docs.map((d) => {
    const data = d.data() as SessionDoc
    // Older docs only had durationSeconds and were always complete.
    const legacy = data.durationSeconds ?? 0
    return {
      id: d.id,
      hz: data.hz,
      band: data.band,
      viz: data.viz ?? 'frequency',
      plannedSeconds: data.plannedSeconds ?? legacy,
      elapsedSeconds: data.elapsedSeconds ?? legacy,
      status: data.status ?? 'completed',
      beforeScore: data.beforeScore ?? null,
      afterScore: data.afterScore ?? null,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    }
  })
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
