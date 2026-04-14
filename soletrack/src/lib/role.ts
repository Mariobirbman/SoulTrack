import { ref, watch } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db, demoMode } from './firebase'
import { useAuth } from './auth'
import { isDemoAdmin } from './demo'

const isAdmin = ref(false)

export function useRole() {
  const { user } = useAuth()

  if (demoMode) {
    // In demo mode, only users who clicked "Login as Admin" get admin access
    isAdmin.value = !!user.value && isDemoAdmin()
    return { isAdmin }
  }

  watch(
    user,
    async (u) => {
      if (!u?.uid || !db) {
        isAdmin.value = false
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        isAdmin.value = snap.exists() && snap.data()?.role === 'admin'
      } catch {
        isAdmin.value = false
      }
    },
    { immediate: true },
  )

  return { isAdmin }
}
