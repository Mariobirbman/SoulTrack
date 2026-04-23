import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
} from '@/lib/demo'

// Clear env var override before each test
const DEMO_KEY = 'soletrack_demo_mode'

describe('demo mode helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('isDemoMode returns false when localStorage is empty', () => {
    expect(isDemoMode()).toBe(false)
  })

  it('enableDemoMode sets isDemoMode to true', () => {
    enableDemoMode()
    expect(isDemoMode()).toBe(true)
  })

  it('disableDemoMode clears demo keys', () => {
    enableDemoMode()
    expect(isDemoMode()).toBe(true)

    disableDemoMode()
    expect(isDemoMode()).toBe(false)
  })

  it('disableDemoMode is idempotent when keys are already absent', () => {
    expect(() => disableDemoMode()).not.toThrow()
    expect(isDemoMode()).toBe(false)
  })

  it('enableDemoMode only sets demo mode key', () => {
    enableDemoMode()
    expect(localStorage.getItem(DEMO_KEY)).toBe('1')
  })
})
