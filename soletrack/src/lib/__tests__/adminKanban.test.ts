import { describe, it, expect, beforeEach } from 'vitest'
import {
  approveProductById,
  rejectProductById,
  restoreProductById,
  getDemoAdminProducts,
  getOrSeedAdminDemoQueue,
  getOrSeedDemoProducts,
} from '../demoStore'

describe('Admin Kanban product operations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getDemoAdminProducts', () => {
    it('returns empty columns when no products seeded', () => {
      const { pending, active, rejected } = getDemoAdminProducts()
      expect(pending).toHaveLength(0)
      expect(rejected).toHaveLength(0)
      // active products seeded by default
      expect(active.length).toBeGreaterThan(0)
    })

    it('partitions products into correct columns by status', () => {
      getOrSeedAdminDemoQueue()
      const { pending, active, rejected } = getDemoAdminProducts()
      expect(pending.every((p) => p.status === 'pending')).toBe(true)
      expect(active.every((p) => p.status === 'active')).toBe(true)
      expect(rejected.every((p) => p.status === 'rejected')).toBe(true)
    })
  })

  describe('getOrSeedAdminDemoQueue', () => {
    it('adds pending products when none exist', () => {
      getOrSeedAdminDemoQueue()
      const { pending } = getDemoAdminProducts()
      expect(pending.length).toBeGreaterThan(0)
    })

    it('is idempotent — does not duplicate if pending already exist', () => {
      getOrSeedAdminDemoQueue()
      const countFirst = getDemoAdminProducts().pending.length
      getOrSeedAdminDemoQueue()
      const countSecond = getDemoAdminProducts().pending.length
      expect(countFirst).toBe(countSecond)
    })
  })

  describe('approveProductById', () => {
    it('moves product from pending to active', () => {
      getOrSeedAdminDemoQueue()
      const { pending } = getDemoAdminProducts()
      const target = pending[0]!

      approveProductById(target.id)

      const { pending: nextPending, active } = getDemoAdminProducts()
      expect(nextPending.find((p) => p.id === target.id)).toBeUndefined()
      expect(active.find((p) => p.id === target.id)).toBeDefined()
    })

    it('sets active flag to true', () => {
      getOrSeedAdminDemoQueue()
      const { pending } = getDemoAdminProducts()
      const target = pending[0]!

      approveProductById(target.id)

      const all = getOrSeedDemoProducts()
      const approved = all.find((p) => p.id === target.id)
      expect(approved?.active).toBe(true)
    })

    it('does nothing for unknown id', () => {
      getOrSeedAdminDemoQueue()
      const before = getDemoAdminProducts()
      approveProductById('does-not-exist')
      const after = getDemoAdminProducts()
      expect(after.pending.length).toBe(before.pending.length)
    })
  })

  describe('rejectProductById', () => {
    it('moves product from pending to rejected', () => {
      getOrSeedAdminDemoQueue()
      const { pending } = getDemoAdminProducts()
      const target = pending[0]!

      rejectProductById(target.id)

      const { pending: nextPending, rejected } = getDemoAdminProducts()
      expect(nextPending.find((p) => p.id === target.id)).toBeUndefined()
      expect(rejected.find((p) => p.id === target.id)).toBeDefined()
    })

    it('sets active flag to false', () => {
      getOrSeedAdminDemoQueue()
      const target = getDemoAdminProducts().pending[0]!

      rejectProductById(target.id)

      const all = getOrSeedDemoProducts()
      const rejected = all.find((p) => p.id === target.id)
      expect(rejected?.active).toBe(false)
    })

    it('can reject an already-active product (remove from live)', () => {
      const active = getDemoAdminProducts().active[0]!

      rejectProductById(active.id)

      const { active: nextActive, rejected } = getDemoAdminProducts()
      expect(nextActive.find((p) => p.id === active.id)).toBeUndefined()
      expect(rejected.find((p) => p.id === active.id)).toBeDefined()
    })
  })

  describe('restoreProductById', () => {
    it('moves rejected product back to pending', () => {
      getOrSeedAdminDemoQueue()
      const target = getDemoAdminProducts().pending[0]!
      rejectProductById(target.id)

      restoreProductById(target.id)

      const { pending, rejected } = getDemoAdminProducts()
      expect(rejected.find((p) => p.id === target.id)).toBeUndefined()
      expect(pending.find((p) => p.id === target.id)).toBeDefined()
    })

    it('sets active flag to false when restoring', () => {
      getOrSeedAdminDemoQueue()
      const target = getDemoAdminProducts().pending[0]!
      rejectProductById(target.id)
      restoreProductById(target.id)

      const all = getOrSeedDemoProducts()
      const restored = all.find((p) => p.id === target.id)
      expect(restored?.active).toBe(false)
    })
  })

  describe('full approve → reject → restore cycle', () => {
    it('tracks status correctly through full lifecycle', () => {
      getOrSeedAdminDemoQueue()
      const target = getDemoAdminProducts().pending[0]!

      approveProductById(target.id)
      expect(getDemoAdminProducts().active.find((p) => p.id === target.id)).toBeDefined()

      rejectProductById(target.id)
      expect(getDemoAdminProducts().rejected.find((p) => p.id === target.id)).toBeDefined()

      restoreProductById(target.id)
      expect(getDemoAdminProducts().pending.find((p) => p.id === target.id)).toBeDefined()
    })
  })
})
