import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

type UserLike = {
  uid: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

export async function upsertUserProfile(user: UserLike) {
  if (!db) return
  await setDoc(
    doc(db, 'users', user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}
