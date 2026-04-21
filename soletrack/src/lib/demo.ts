const DEMO_KEY = 'soletrack_demo_mode'
const DEMO_ADMIN_KEY = 'soletrack_demo_admin'
const DEMO_BUYER_KEY = 'soletrack_demo_buyer'

export function isDemoMode() {
  if (import.meta.env.VITE_DEMO_MODE === '1') return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function isDemoAdmin() {
  return false
}

export function isDemoBuyer() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEMO_BUYER_KEY) === '1'
  } catch {
    return false
  }
}

export function enableDemoMode() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEMO_KEY, '1')
    window.localStorage.removeItem(DEMO_ADMIN_KEY)
    window.localStorage.removeItem(DEMO_BUYER_KEY)
  } catch {
    // ignore
  }
}

export function enableDemoAdminMode() {
  enableDemoMode()
}

export function enableDemoBuyerMode() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEMO_KEY, '1')
    window.localStorage.setItem(DEMO_BUYER_KEY, '1')
    window.localStorage.removeItem(DEMO_ADMIN_KEY)
  } catch {
    // ignore
  }
}

export function disableDemoMode() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEMO_KEY)
    window.localStorage.removeItem(DEMO_ADMIN_KEY)
    window.localStorage.removeItem(DEMO_BUYER_KEY)
  } catch {
    // ignore
  }
}

