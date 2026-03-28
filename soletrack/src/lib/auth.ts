import { ref } from 'vue'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'

const user = ref<User | null>(auth?.currentUser ?? null)

const ready = new Promise<void>((resolve) => {
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
