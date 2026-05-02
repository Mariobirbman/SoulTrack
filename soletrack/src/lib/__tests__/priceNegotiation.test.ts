import { describe, expect, it, beforeEach } from 'vitest'
import { findActiveProposal, computeItemSellPrice, groupMessages, type ChatMessage } from '../orderChat'
import { __resetBrandStatsForTests } from '../useBrandStats'

// ─── findActiveProposal ───────────────────────────────────────────────────────

function makeMsg(
  id: string,
  type: ChatMessage['type'],
  proposedPrice?: number,
): { id: string } & ChatMessage {
  return { id, senderUid: 'user-a', text: 'msg', type, proposedPrice }
}

describe('findActiveProposal', () => {
  it('returns null when no messages', () => {
    expect(findActiveProposal([])).toBeNull()
  })

  it('returns null when no price_proposal messages', () => {
    const msgs = [makeMsg('1', 'text'), makeMsg('2', 'text')]
    expect(findActiveProposal(msgs)).toBeNull()
  })

  it('returns proposal when no follow-up resolution', () => {
    const proposal = makeMsg('1', 'price_proposal', 200)
    const msgs = [makeMsg('0', 'text'), proposal]
    expect(findActiveProposal(msgs)).toEqual(proposal)
  })

  it('returns null when proposal is followed by price_locked', () => {
    const msgs = [
      makeMsg('1', 'price_proposal', 200),
      makeMsg('2', 'price_locked', 200),
    ]
    expect(findActiveProposal(msgs)).toBeNull()
  })

  it('returns null when proposal is followed by price_declined', () => {
    const msgs = [
      makeMsg('1', 'price_proposal', 200),
      makeMsg('2', 'price_declined', 200),
    ]
    expect(findActiveProposal(msgs)).toBeNull()
  })

  it('returns latest proposal when first is resolved but second is not', () => {
    const second = makeMsg('3', 'price_proposal', 220)
    const msgs = [
      makeMsg('1', 'price_proposal', 200),
      makeMsg('2', 'price_declined', 200),
      second,
    ]
    expect(findActiveProposal(msgs)).toEqual(second)
  })

  it('returns null when second proposal is also resolved', () => {
    const msgs = [
      makeMsg('1', 'price_proposal', 200),
      makeMsg('2', 'price_declined', 200),
      makeMsg('3', 'price_proposal', 220),
      makeMsg('4', 'price_locked', 220),
    ]
    expect(findActiveProposal(msgs)).toBeNull()
  })

  it('returns the proposal even with text messages between proposal and no resolution', () => {
    const proposal = makeMsg('2', 'price_proposal', 250)
    const msgs = [makeMsg('1', 'text'), proposal, makeMsg('3', 'text')]
    expect(findActiveProposal(msgs)).toEqual(proposal)
  })
})

// ─── computeItemSellPrice ─────────────────────────────────────────────────────

describe('computeItemSellPrice', () => {
  it('uses full price when no negotiation (agreedPrice equals subtotal)', () => {
    // single item: priceSnapshot=365, qty=1, subtotal=365, orderTotal=365
    expect(computeItemSellPrice(365, 1, 365, 365)).toBe(365)
  })

  it('prorates agreed price correctly for single item', () => {
    // priceSnapshot=365, qty=1, originalSubtotal=365, agreedPrice=300
    expect(computeItemSellPrice(365, 1, 365, 300)).toBe(300)
  })

  it('prorates agreed price correctly for multi-item order', () => {
    // two items: item A priceSnapshot=200 qty=1, item B priceSnapshot=100 qty=1
    // originalSubtotal=300, agreedPrice=270
    // item A fraction = 200/300 => sellPrice = 200/300 * 270 = 180
    expect(computeItemSellPrice(200, 1, 300, 270)).toBe(180)
    // item B fraction = 100/300 => sellPrice = 100/300 * 270 = 90
    expect(computeItemSellPrice(100, 1, 300, 270)).toBe(90)
    // 180 + 90 = 270 ✓
  })

  it('handles qty > 1', () => {
    // priceSnapshot=100, qty=2 => itemOriginal=200, originalSubtotal=200, orderTotal=180
    expect(computeItemSellPrice(100, 2, 200, 180)).toBe(180)
  })

  it('falls back to itemOriginal when originalSubtotal is 0', () => {
    expect(computeItemSellPrice(150, 1, 0, 300)).toBe(150)
  })

  it('rounds to 2 decimal places', () => {
    // priceSnapshot=100, qty=1, originalSubtotal=300, orderTotal=100
    // 100/300 * 100 = 33.3333... => 33.33
    expect(computeItemSellPrice(100, 1, 300, 100)).toBe(33.33)
  })
})

// ─── groupMessages passes through type and proposedPrice ─────────────────────

describe('groupMessages type pass-through', () => {
  it('preserves type and proposedPrice on grouped messages', () => {
    const input: ({ id: string } & ChatMessage)[] = [
      { id: '1', senderUid: 'u1', text: 'hi', type: 'text' },
      { id: '2', senderUid: 'u2', text: 'Proposed price: $200', type: 'price_proposal', proposedPrice: 200 },
      { id: '3', senderUid: 'u1', text: 'Price locked at $200', type: 'price_locked', proposedPrice: 200 },
    ]
    const grouped = groupMessages(input, 'u1')
    expect(grouped[0]!.type).toBe('text')
    expect(grouped[1]!.type).toBe('price_proposal')
    expect(grouped[1]!.proposedPrice).toBe(200)
    expect(grouped[2]!.type).toBe('price_locked')
    expect(grouped[2]!.proposedPrice).toBe(200)
  })

  it('sets mine correctly for each message sender', () => {
    const input: ({ id: string } & ChatMessage)[] = [
      { id: '1', senderUid: 'buyer', text: 'hey' },
      { id: '2', senderUid: 'seller', text: 'hi', type: 'price_proposal', proposedPrice: 150 },
    ]
    const grouped = groupMessages(input, 'buyer')
    expect(grouped[0]!.mine).toBe(true)
    expect(grouped[1]!.mine).toBe(false)
  })
})

// ─── Sales price: negotiated vs original ─────────────────────────────────────

describe('sell price uses agreedPrice when set', () => {
  it('agreedPrice takes precedence over subtotal in computeItemSellPrice', () => {
    const subtotal = 365
    const agreedPrice = 300
    // seller accepts $300; sales should log $300 not $365
    const sellPrice = computeItemSellPrice(365, 1, subtotal, agreedPrice)
    expect(sellPrice).toBe(300)
    expect(sellPrice).not.toBe(subtotal)
  })

  it('falls back to subtotal when no agreedPrice', () => {
    const subtotal = 365
    const sellPrice = computeItemSellPrice(365, 1, subtotal, subtotal)
    expect(sellPrice).toBe(365)
  })
})
