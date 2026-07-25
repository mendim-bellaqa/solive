import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Firebase web config is NOT secret — these values are safe to ship to the
// browser. Security is enforced by Firebase Auth settings + security rules,
// not by hiding the key. They live in NEXT_PUBLIC_* so both server and client
// bundles can read them.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

/**
 * True when the build actually received the Firebase config.
 *
 * NEXT_PUBLIC_* values are inlined at BUILD time, so a deploy that builds
 * without them ships a bundle with `undefined` here — auth then fails with an
 * opaque `auth/invalid-api-key`. Check this before calling any auth method so
 * we can say what's actually wrong (set the vars in the host, then rebuild).
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain,
)

// ─────────────────────────────────────────────────────────────────────────────
// Everything below initializes LAZILY and only in the browser.
//
// Do not move these into module-scope `const`s. Next.js evaluates this module
// on the server while prerendering, and `getAuth()` throws
// `auth/invalid-api-key` when the config is missing — which fails the whole
// production build rather than just degrading at runtime. Keeping init behind
// functions means prerender never touches Firebase.
// ─────────────────────────────────────────────────────────────────────────────

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig)
  }
  return appInstance
}

/** Auth instance, or null when unavailable (server-side, or config missing). */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined' || !isFirebaseConfigured) return null
  if (!authInstance) {
    try {
      authInstance = getAuth(getFirebaseApp())
    } catch (err) {
      console.warn('[Solive] Firebase Auth unavailable:', err)
      return null
    }
  }
  return authInstance
}

/** Firestore instance, or null when unavailable. */
export function getFirebaseDb(): Firestore | null {
  if (typeof window === 'undefined' || !isFirebaseConfigured) return null
  if (!dbInstance) {
    try {
      dbInstance = getFirestore(getFirebaseApp())
    } catch (err) {
      console.warn('[Solive] Firestore unavailable:', err)
      return null
    }
  }
  return dbInstance
}

// Analytics only works in the browser (it needs `window`), and only in
// environments Google supports. Call this from a client component if you
// want it — never at module top level, or SSR will crash.
export async function initAnalytics() {
  if (typeof window === 'undefined' || !isFirebaseConfigured) return null
  const { getAnalytics, isSupported } = await import('firebase/analytics')
  if (await isSupported()) return getAnalytics(getFirebaseApp())
  return null
}
