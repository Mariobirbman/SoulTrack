const DEMO_KEY = 'soletrack_demo_mode'

export function isDemoMode() {
  if (import.meta.env.VITE_DEMO_MODE === '1') return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function enableDemoMode() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEMO_KEY, '1')
  } catch {
    // ignore
  }
}

export function disableDemoMode() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEMO_KEY)
  } catch {
    // ignore
  }
}

