import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDemoMode,
  isDemoAdmin,
  enableDemoMode,
  enableDemoAdminMode,
  disableDemoMode,
} from '@/lib/demo'

// Clear env var override before each test
const DEMO_KEY = 'soletrack_demo_mode'
const DEMO_ADMIN_KEY = 'soletrack_demo_admin'

describe('demo mode helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('isDemoMode returns false when localStorage is empty', () => {
    expect(isDemoMode()).toBe(false)
  })

  it('isDemoAdmin returns false when localStorage is empty', () => {
    expect(isDemoAdmin()).toBe(false)
  })

  it('enableDemoMode sets isDemoMode to true', () => {
    enableDemoMode()
    expect(isDemoMode()).toBe(true)
    expect(isDemoAdmin()).toBe(false)
  })

  it('enableDemoAdminMode sets both isDemoMode and isDemoAdmin', () => {
    enableDemoAdminMode()
    expect(isDemoMode()).toBe(true)
    expect(isDemoAdmin()).toBe(true)
  })

  it('disableDemoMode clears both keys', () => {
    enableDemoAdminMode()
    expect(isDemoMode()).toBe(true)
    expect(isDemoAdmin()).toBe(true)

    disableDemoMode()
    expect(isDemoMode()).toBe(false)
    expect(isDemoAdmin()).toBe(false)
  })

  it('disableDemoMode is idempotent when keys are already absent', () => {
    expect(() => disableDemoMode()).not.toThrow()
    expect(isDemoMode()).toBe(false)
  })

  it('raw localStorage keys match expected values', () => {
    enableDemoAdminMode()
    expect(localStorage.getItem(DEMO_KEY)).toBe('1')
    expect(localStorage.getItem(DEMO_ADMIN_KEY)).toBe('1')
  })

  it('enableDemoMode does not set admin key', () => {
    enableDemoMode()
    expect(localStorage.getItem(DEMO_ADMIN_KEY)).toBeNull()
  })
})
