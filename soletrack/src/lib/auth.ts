import { ref } from 'vue'
import type { User as FirebaseUser } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { demoMode } from './firebase'
import { getOrSeedDemoUser } from './demoStore'

export type AppUser = Pick<FirebaseUser, 'uid' | 'email' | 'displayName'> & { isDemo?: boolean }

const seededDemoUser = demoMode ? getOrSeedDemoUser() : null
const user = ref<AppUser | null>(
  demoMode
    ? ({ uid: seededDemoUser!.uid, email: seededDemoUser!.email, displayName: seededDemoUser!.displayName, isDemo: true } as AppUser)
    : (auth?.currentUser ?? null),
)

const ready = new Promise<void>((resolve) => {
  if (demoMode) {
    resolve()
    return
  }
  if (!auth) {
    resolve()
    return
  }
  let resolved = false
  onAuthStateChanged(auth, (u) => {
    user.value = u
    if (!resolved) {
      resolved = true
      resolve()
    }
  })
})

export function useAuth() {
  return { user, ready }
}
