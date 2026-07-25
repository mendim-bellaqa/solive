'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  addDoc, collection, getDocs, query, where, limit,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { auth, db } from './client'

// ─── Auth hook ────────────────────────────────────────────────────────────────
// `undefined` = still resolving, `null` = signed out, User = signed in.
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), [])
  return user
}

// ─── Session model ────────────────────────────────────────────────────────────
export interface SessionRecord {
  id: string
  hz: number
  band: string
  durationSeconds: number
  beforeScore: number | null
  afterScore: number | null
  createdAt: Date
}

interface SessionDoc {
  uid: string
  hz: number
  band: string
  durationSeconds: number
  beforeScore: number | null
  afterScore: number | null
  createdAt: Timestamp | null
}

// Save a completed session for the signed-in user. No-op if signed out.
export async function saveSession(input: {
  hz: number
  band: string
  durationSeconds: number
  beforeScore: number | null
  afterScore: number | null
}): Promise<void> {
  const user = auth.currentUser
  if (!user) return
  try {
    await addDoc(collection(db, 'sessions'), {
      uid: user.uid,
      hz: input.hz,
      band: input.band,
      durationSeconds: input.durationSeconds,
      beforeScore: input.beforeScore,
      afterScore: input.afterScore,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('[Solive] Could not save session:', err)
  }
}

// Fetch the signed-in user's sessions, newest first.
// Sorted client-side so no Firestore composite index is required.
export async function fetchSessions(uid: string): Promise<SessionRecord[]> {
  const q = query(
    collection(db, 'sessions'),
    where('uid', '==', uid),
    limit(300),
  )
  const snap = await getDocs(q)
  const rows = snap.docs.map((d) => {
    const data = d.data() as SessionDoc
    return {
      id: d.id,
      hz: data.hz,
      band: data.band,
      durationSeconds: data.durationSeconds ?? 0,
      beforeScore: data.beforeScore ?? null,
      afterScore: data.afterScore ?? null,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    }
  })
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
