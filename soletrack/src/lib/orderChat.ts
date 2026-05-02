export type ChatMessage = {
  senderUid: string
  text: string
  createdAt?: unknown
  type?: 'text' | 'price_proposal' | 'price_locked' | 'price_declined'
  proposedPrice?: number
}

export type GroupedChatMessage = ChatMessage & {
  id: string
  mine: boolean
  groupStart: boolean
  groupEnd: boolean
  showTimestamp: boolean
}

export function shouldSendOnEnter(key: string, shiftKey: boolean) {
  return key === 'Enter' && !shiftKey
}

export function validateComposerInput(value: string, maxLen = 500) {
  const trimmed = value.trim()
  if (!trimmed) return { ok: false as const, reason: 'Message cannot be empty.' }
  if (trimmed.length > maxLen) return { ok: false as const, reason: `Message must be ${maxLen} characters or less.` }
  return { ok: true as const, reason: '' }
}

export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, threshold = 56) {
  return scrollHeight - (scrollTop + clientHeight) <= threshold
}

export function shouldAutoScrollOnAppend(
  wasNearBottom: boolean,
  isInitialLoad: boolean,
  hadMessages: boolean,
  hasNewMessage: boolean,
) {
  if (isInitialLoad) return true
  if (!hasNewMessage) return false
  if (!hadMessages) return true
  return wasNearBottom
}

export function groupMessages(messages: Array<ChatMessage & { id: string }>, currentUid: string | null): GroupedChatMessage[] {
  return messages.map((m, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const mine = !!currentUid && m.senderUid === currentUid
    const prevSame = !!prev && prev.senderUid === m.senderUid
    const nextSame = !!next && next.senderUid === m.senderUid
    return {
      ...m,
      mine,
      groupStart: !prevSame,
      groupEnd: !nextSame,
      showTimestamp: !nextSame,
    }
  })
}

/** Returns the last price_proposal message that has no subsequent price_locked or price_declined. */
export function findActiveProposal<T extends ChatMessage & { id: string }>(messages: T[]): T | null {
  let lastPropIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.type === 'price_proposal') {
      lastPropIdx = i
      break
    }
  }
  if (lastPropIdx === -1) return null
  for (let i = lastPropIdx + 1; i < messages.length; i++) {
    const t = messages[i]!.type
    if (t === 'price_locked' || t === 'price_declined') return null
  }
  return messages[lastPropIdx]!
}

/**
 * Computes the sell price for one order item, prorating the agreed/final order
 * total across items by their original price weight.
 */
export function computeItemSellPrice(
  itemPriceSnapshot: number,
  itemQty: number,
  originalSubtotal: number,
  orderTotal: number,
): number {
  const itemOriginal = itemPriceSnapshot * itemQty
  if (originalSubtotal <= 0) return itemOriginal
  return Math.round((itemOriginal / originalSubtotal) * orderTotal * 100) / 100
}
