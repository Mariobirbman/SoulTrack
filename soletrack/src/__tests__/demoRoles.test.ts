import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDemoMode,
  isDemoBuyer,
  isDemoAdmin,
  enableDemoMode,
  enableDemoBuyerMode,
  enableDemoAdminMode,
  disableDemoMode,
} from '@/lib/demo'

describe('demo role helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('enableDemoBuyerMode', () => {
    it('sets demo mode and buyer flag', () => {
      enableDemoBuyerMode()
      expect(isDemoMode()).toBe(true)
      expect(isDemoBuyer()).toBe(true)
      expect(isDemoAdmin()).toBe(false)
    })

    it('clears admin flag if previously set', () => {
      enableDemoAdminMode()
      enableDemoBuyerMode()
      expect(isDemoAdmin()).toBe(false)
      expect(isDemoBuyer()).toBe(true)
    })
  })

  describe('enableDemoAdminMode', () => {
    it('sets demo mode and admin flag', () => {
      enableDemoAdminMode()
      expect(isDemoMode()).toBe(true)
      expect(isDemoAdmin()).toBe(true)
      expect(isDemoBuyer()).toBe(false)
    })

    it('clears buyer flag if previously set', () => {
      enableDemoBuyerMode()
      enableDemoAdminMode()
      expect(isDemoBuyer()).toBe(false)
      expect(isDemoAdmin()).toBe(true)
    })
  })

  describe('enableDemoMode (seller)', () => {
    it('sets demo mode only — no buyer, no admin', () => {
      enableDemoMode()
      expect(isDemoMode()).toBe(true)
      expect(isDemoBuyer()).toBe(false)
      expect(isDemoAdmin()).toBe(false)
    })
  })

  describe('disableDemoMode', () => {
    it('clears all three role flags', () => {
      enableDemoBuyerMode()
      disableDemoMode()
      expect(isDemoMode()).toBe(false)
      expect(isDemoBuyer()).toBe(false)
      expect(isDemoAdmin()).toBe(false)
    })

    it('clears admin flag too', () => {
      enableDemoAdminMode()
      disableDemoMode()
      expect(isDemoMode()).toBe(false)
      expect(isDemoAdmin()).toBe(false)
    })
  })

  describe('role exclusivity', () => {
    it('buyer and admin are never both true at same time', () => {
      enableDemoBuyerMode()
      expect(isDemoBuyer() && isDemoAdmin()).toBe(false)

      enableDemoAdminMode()
      expect(isDemoBuyer() && isDemoAdmin()).toBe(false)
    })
  })
})
