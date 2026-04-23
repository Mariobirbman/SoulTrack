import { describe, it, expect, beforeEach } from 'vitest'
import { useCart } from '@/lib/cart'

// Each test imports a fresh reactive ref because localStorage is cleared in setup.ts.
// However useCart uses a module-level ref, so we reset it manually.
function freshCart() {
  const cart = useCart()
  cart.clear()
  return cart
}

describe('cart — add', () => {
  it('adds a new item with qty 1 by default', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1', vendorName: 'Shop A' })
    expect(items.value).toHaveLength(1)
    expect(items.value[0]!.qty).toBe(1)
  })

  it('increments qty when the same id is added again', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    expect(items.value).toHaveLength(1)
    expect(items.value[0]!.qty).toBe(2)
  })

  it('keeps marketplace listing qty capped at 1 by default', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1', vendorName: 'Shop A' })
    add({ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1', vendorName: 'Shop A' })
    expect(items.value).toHaveLength(1)
    expect(items.value[0]!.qty).toBe(1)
  })

  it('updates price on re-add (guards against stale prices)', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1', vendorName: 'Shop A' })
    add({ id: 'p1', name: 'Jordan 1', price: 220, vendorUid: 'v1', vendorName: 'Shop A' })
    expect(items.value[0]!.price).toBe(220)
  })

  it('adds distinct items separately', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1', vendorName: 'Shop A' })
    add({ id: 'p2', name: 'Dunk Low', price: 150, vendorUid: 'v2', vendorName: 'Shop B' })
    expect(items.value).toHaveLength(2)
  })

  it('clamps qty to at least 1', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 }, 0)
    expect(items.value[0]!.qty).toBe(1)
  })

  it('floors fractional qty', () => {
    const { items, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 }, 2.9)
    expect(items.value[0]!.qty).toBe(2)
  })
})

describe('cart — remove', () => {
  it('removes the correct item by id', () => {
    const { items, add, remove } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    add({ id: 'p2', name: 'Dunk Low', price: 150 })
    remove('p1')
    expect(items.value).toHaveLength(1)
    expect(items.value[0]!.id).toBe('p2')
  })

  it('is a no-op when id does not exist', () => {
    const { items, add, remove } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    remove('nonexistent')
    expect(items.value).toHaveLength(1)
  })
})

describe('cart — setQty', () => {
  it('updates qty for a known item', () => {
    const { items, add, setQty } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    setQty('p1', 5)
    expect(items.value[0]!.qty).toBe(5)
  })

  it('respects marketplace qty cap in setQty', () => {
    const { items, add, setQty } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1', vendorName: 'Shop A' })
    setQty('p1', 5)
    expect(items.value[0]!.qty).toBe(1)
  })

  it('clamps qty to at least 1', () => {
    const { items, add, setQty } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    setQty('p1', 0)
    expect(items.value[0]!.qty).toBe(1)
  })

  it('floors fractional qty', () => {
    const { items, add, setQty } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    setQty('p1', 3.7)
    expect(items.value[0]!.qty).toBe(3)
  })

  it('is a no-op for unknown id', () => {
    const { items, add, setQty } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    expect(() => setQty('ghost', 3)).not.toThrow()
    expect(items.value[0]!.qty).toBe(1)
  })
})

describe('cart — subtotal', () => {
  it('calculates subtotal correctly', () => {
    const { subtotal, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 }, 2)
    add({ id: 'p2', name: 'Dunk Low', price: 150 }, 1)
    // 2 * 200 + 1 * 150 = 550
    expect(subtotal.value).toBe(550)
  })

  it('returns 0 for empty cart', () => {
    const { subtotal } = freshCart()
    expect(subtotal.value).toBe(0)
  })
})

describe('cart — totalCount', () => {
  it('sums qty across all items', () => {
    const { totalCount, add } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 }, 3)
    add({ id: 'p2', name: 'Dunk Low', price: 150 }, 2)
    expect(totalCount.value).toBe(5)
  })
})

describe('cart — clear', () => {
  it('empties the cart', () => {
    const { items, add, clear } = freshCart()
    add({ id: 'p1', name: 'Jordan 1', price: 200 })
    clear()
    expect(items.value).toHaveLength(0)
  })
})
