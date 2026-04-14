/**
 * Unit tests for the price-validation logic extracted from Checkout.vue.
 *
 * We replicate the core comparison here (server price vs cart price, ±$0.01
 * tolerance) so the rule can be tested independently of Firebase.
 */
import { describe, it, expect } from 'vitest'

// ── Pure helper — mirrors validateCartPrices logic in Checkout.vue ──────────
type CartLine = { id: string; name: string; price: number; vendorUid?: string }
type FirestoreSnap = { exists: boolean; status?: string; price?: number }

function validatePrices(
  lines: CartLine[],
  fetchSnap: (id: string) => FirestoreSnap,
): string | null {
  const realLines = lines.filter((l) => l.vendorUid && !l.vendorUid.startsWith('__'))
  for (const l of realLines) {
    const snap = fetchSnap(l.id)
    if (!snap.exists) return `Item "${l.name}" is no longer available.`
    if (snap.status !== 'approved') return `Item "${l.name}" is no longer available for purchase.`
    const serverPrice = Number(snap.price ?? 0)
    if (Math.abs(serverPrice - l.price) > 0.01) {
      return `Price for "${l.name}" has changed to $${serverPrice.toFixed(2)}. Please refresh your cart.`
    }
  }
  return null
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('price validation', () => {
  const approvedSnap = (price: number): FirestoreSnap => ({
    exists: true,
    status: 'approved',
    price,
  })

  it('passes when cart price matches server price exactly', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1' }]
    const result = validatePrices(lines, () => approvedSnap(200))
    expect(result).toBeNull()
  })

  it('passes within the $0.01 float tolerance', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Jordan 1', price: 200.005, vendorUid: 'v1' }]
    const result = validatePrices(lines, () => approvedSnap(200))
    expect(result).toBeNull()
  })

  it('fails when cart price is tampered (too low)', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Jordan 1', price: 1, vendorUid: 'v1' }]
    const result = validatePrices(lines, () => approvedSnap(200))
    expect(result).toMatch(/Price for "Jordan 1" has changed/)
    expect(result).toMatch(/\$200\.00/)
  })

  it('fails when cart price is inflated', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Jordan 1', price: 9999, vendorUid: 'v1' }]
    const result = validatePrices(lines, () => approvedSnap(200))
    expect(result).toMatch(/Price for "Jordan 1" has changed/)
  })

  it('fails when product no longer exists', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1' }]
    const result = validatePrices(lines, () => ({ exists: false }))
    expect(result).toBe('Item "Jordan 1" is no longer available.')
  })

  it('fails when product is pending (not approved)', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1' }]
    const result = validatePrices(lines, () => ({ exists: true, status: 'pending', price: 200 }))
    expect(result).toMatch(/no longer available for purchase/)
  })

  it('skips demo items (vendorUid starts with __)', () => {
    const lines: CartLine[] = [{ id: 'demo-1', name: 'Demo Shoe', price: 999, vendorUid: '__demo' }]
    // fetchSnap should never be called for demo items
    const result = validatePrices(lines, () => ({ exists: false }))
    expect(result).toBeNull()
  })

  it('skips items with no vendorUid', () => {
    const lines: CartLine[] = [{ id: 'p1', name: 'Mystery Item', price: 999 }]
    const result = validatePrices(lines, () => ({ exists: false }))
    expect(result).toBeNull()
  })

  it('validates all lines and returns the first failure', () => {
    const lines: CartLine[] = [
      { id: 'p1', name: 'Jordan 1', price: 200, vendorUid: 'v1' },
      { id: 'p2', name: 'Dunk Low', price: 1, vendorUid: 'v2' }, // tampered
    ]
    const result = validatePrices(lines, (id) =>
      approvedSnap(id === 'p1' ? 200 : 150),
    )
    expect(result).toMatch(/Dunk Low/)
  })

  it('passes a mixed cart with demo items + real items at correct prices', () => {
    const lines: CartLine[] = [
      { id: 'demo-1', name: 'Demo Shoe', price: 1, vendorUid: '__demo' },
      { id: 'real-1', name: 'Real Jordan', price: 300, vendorUid: 'v1' },
    ]
    const result = validatePrices(lines, () => approvedSnap(300))
    expect(result).toBeNull()
  })
})
