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

// Reuse the existing app across hot-reloads / re-imports instead of re-initializing.
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth: Auth = getAuth(firebaseApp)
export const db: Firestore = getFirestore(firebaseApp)

// Analytics only works in the browser (it needs `window`), and only in
// environments Google supports. Call this from a client component if you
// want it — never at module top level, or SSR will crash.
export async function initAnalytics() {
  if (typeof window === 'undefined') return null
  const { getAnalytics, isSupported } = await import('firebase/analytics')
  if (await isSupported()) return getAnalytics(firebaseApp)
  return null
}
