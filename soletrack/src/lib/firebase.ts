import type { FirebaseApp } from 'firebase/app'
import { initializeApp, getApps } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.length > 0)

export const firebaseApp: FirebaseApp | null = firebaseConfigured
  ? (getApps().length ? getApps()[0]! : initializeApp(firebaseConfig))
  : null

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null

let emulatorsConnected = false
export function maybeConnectEmulators() {
  if (emulatorsConnected) return
  if (!auth || !db) return
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS !== '1') return

  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
  emulatorsConnected = true
}

maybeConnectEmulators()
