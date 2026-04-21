import { ref, watch } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db, demoMode } from './firebase'
import { useAuth } from './auth'

const isAdmin = ref(false)

export function useRole() {
  const { user } = useAuth()

  if (demoMode) {
    // Demo mode does not support admin access.
    isAdmin.value = false
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
