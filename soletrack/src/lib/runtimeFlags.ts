export function isAuthBypassEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === '1'
}

