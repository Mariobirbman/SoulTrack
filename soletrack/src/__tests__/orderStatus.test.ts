/**
 * Unit tests for order status progression logic.
 *
 * Mirrors the STATUS_STEPS array and next-status derivation from OrderDetail.vue.
 */
import { describe, it, expect } from 'vitest'

const STATUS_STEPS = ['placed', 'accepted', 'ready', 'picked_up'] as const
type OrderStatus = (typeof STATUS_STEPS)[number]

function nextStatus(current: string): OrderStatus | null {
  const idx = STATUS_STEPS.indexOf(current as OrderStatus)
  if (idx === -1) return null
  return STATUS_STEPS[idx + 1] ?? null
}

function currentStepIndex(status: string): number {
  return STATUS_STEPS.indexOf(status as OrderStatus)
}

describe('order status progression', () => {
  it('placed → accepted', () => {
    expect(nextStatus('placed')).toBe('accepted')
  })

  it('accepted → ready', () => {
    expect(nextStatus('accepted')).toBe('ready')
  })

  it('ready → picked_up', () => {
    expect(nextStatus('ready')).toBe('picked_up')
  })

  it('picked_up has no next status (terminal)', () => {
    expect(nextStatus('picked_up')).toBeNull()
  })

  it('unknown status returns null', () => {
    expect(nextStatus('refunded')).toBeNull()
    expect(nextStatus('')).toBeNull()
  })

  it('step index for placed is 0', () => {
    expect(currentStepIndex('placed')).toBe(0)
  })

  it('step index for picked_up is 3 (last)', () => {
    expect(currentStepIndex('picked_up')).toBe(3)
  })

  it('all 4 statuses are distinct', () => {
    const unique = new Set(STATUS_STEPS)
    expect(unique.size).toBe(4)
  })

  it('statuses are in the correct forward order', () => {
    for (let i = 0; i < STATUS_STEPS.length - 1; i++) {
      const step = STATUS_STEPS[i]
      const next = STATUS_STEPS[i + 1]
      expect(nextStatus(step)).toBe(next)
    }
  })
})
