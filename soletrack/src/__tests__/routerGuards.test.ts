/**
 * Unit tests for router guard logic.
 *
 * We test the guard rules as pure functions to avoid
 * importing Firebase-dependent composables.
 */
import { describe, it, expect } from 'vitest'

// ── Guard logic (mirrors router/index.ts beforeEach) ─────────────────────────
type GuardResult = string | { path: string; query?: Record<string, string> } | undefined

function applyGuards(
  toPath: string,
  toMeta: Record<string, boolean>,
  toFullPath: string,
  toQuery: Record<string, string>,
  user: { uid: string } | null,
  isAdmin: boolean,
  firebaseConfigured: boolean,
): GuardResult {
  if (!firebaseConfigured) return undefined

  // If already logged in and navigating to /login, redirect to next or /account
  if (toPath === '/login' && user) {
    return typeof toQuery.next === 'string' ? toQuery.next : '/account'
  }

  // Require auth
  if (toMeta.requiresAuth && !user) {
    return { path: '/login', query: { next: toFullPath } }
  }

  // Require admin
  if (toMeta.requiresAdmin && !isAdmin) {
    return { path: '/' }
  }

  return undefined
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('router guards', () => {
  const FB_ON = true
  const FB_OFF = false

  it('allows anonymous to visit /browse (public route)', () => {
    const result = applyGuards('/browse', {}, '/browse', {}, null, false, FB_ON)
    expect(result).toBeUndefined()
  })

  it('redirects anonymous to /login when visiting auth-required route', () => {
    const result = applyGuards('/account', { requiresAuth: true }, '/account', {}, null, false, FB_ON)
    expect(result).toEqual({ path: '/login', query: { next: '/account' } })
  })

  it('redirects anonymous to /login when visiting / (homepage now requires auth)', () => {
    const result = applyGuards('/', { requiresAuth: true }, '/', {}, null, false, FB_ON)
    expect(result).toEqual({ path: '/login', query: { next: '/' } })
  })

  it('preserves ?next query when redirecting to login', () => {
    const result = applyGuards('/cart', { requiresAuth: true }, '/cart?ref=email', {}, null, false, FB_ON)
    expect((result as any)?.query?.next).toBe('/cart?ref=email')
  })

  it('allows authenticated user through auth-required route', () => {
    const result = applyGuards('/account', { requiresAuth: true }, '/account', {}, { uid: 'u1' }, false, FB_ON)
    expect(result).toBeUndefined()
  })

  it('redirects non-admin away from /admin', () => {
    const result = applyGuards('/admin', { requiresAuth: true, requiresAdmin: true }, '/admin', {}, { uid: 'u1' }, false, FB_ON)
    expect(result).toEqual({ path: '/' })
  })

  it('allows admin to access /admin', () => {
    const result = applyGuards('/admin', { requiresAuth: true, requiresAdmin: true }, '/admin', {}, { uid: 'u1' }, true, FB_ON)
    expect(result).toBeUndefined()
  })

  it('redirects logged-in user away from /login to /account', () => {
    const result = applyGuards('/login', {}, '/login', {}, { uid: 'u1' }, false, FB_ON)
    expect(result).toBe('/account')
  })

  it('redirects logged-in user at /login to ?next if present', () => {
    const result = applyGuards('/login', {}, '/login?next=/sell', { next: '/sell' }, { uid: 'u1' }, false, FB_ON)
    expect(result).toBe('/sell')
  })

  it('skips all guards when Firebase is not configured', () => {
    // Even auth-required routes should be accessible when Firebase is off
    const result = applyGuards('/account', { requiresAuth: true }, '/account', {}, null, false, FB_OFF)
    expect(result).toBeUndefined()
  })
})
