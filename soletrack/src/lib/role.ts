import { computed } from 'vue'
import { isDemoMode, isDemoAdmin } from './demo'
import { useAuth } from './auth'

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID as string | undefined

export function useRole() {
  const { user } = useAuth()
  const isAdmin = computed(() => {
    if (isDemoMode()) return isDemoAdmin()
    if (ADMIN_UID && user.value?.uid === ADMIN_UID) return true
    return (user.value as any)?.role === 'admin'
  })
  return { isAdmin }
}
