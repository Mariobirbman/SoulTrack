import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

type UserLike = {
  uid: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

export async function upsertUserProfile(user: UserLike) {
  if (!db) return
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  const payload: Record<string, unknown> = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    updatedAt: serverTimestamp(),
  }

  // Set role and createdAt only on first create — merge preserves existing role.
  if (!snap.exists()) {
    payload.role = 'user'
    payload.createdAt = serverTimestamp()
  }

  await setDoc(ref, payload, { merge: true })
}
