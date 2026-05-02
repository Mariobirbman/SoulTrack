export type ChatMessage = {
  id: string
  senderUid: string
  text: string
  createdAt?: unknown
}

export type GroupedChatMessage = ChatMessage & {
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

export function groupMessages(messages: ChatMessage[], currentUid: string | null): GroupedChatMessage[] {
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
