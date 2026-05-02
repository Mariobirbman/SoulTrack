import {
  groupMessages,
  isNearBottom,
  shouldAutoScrollOnAppend,
  shouldSendOnEnter,
  validateComposerInput,
} from '../orderChat'

describe('orderChat helpers', () => {
  it('groups messages by sender', () => {
    const grouped = groupMessages(
      [
        { id: '1', senderUid: 'a', text: 'x' },
        { id: '2', senderUid: 'a', text: 'y' },
        { id: '3', senderUid: 'b', text: 'z' },
      ],
      'a',
    )
    expect(grouped[0]!.groupStart).toBe(true)
    expect(grouped[0]!.groupEnd).toBe(false)
    expect(grouped[1]!.groupStart).toBe(false)
    expect(grouped[1]!.groupEnd).toBe(true)
    expect(grouped[2]!.showTimestamp).toBe(true)
  })

  it('detects near-bottom correctly', () => {
    expect(isNearBottom(240, 260, 540)).toBe(true)
    expect(isNearBottom(100, 260, 540)).toBe(false)
  })

  it('handles auto-scroll conditions', () => {
    expect(shouldAutoScrollOnAppend(false, true, false, true)).toBe(true)
    expect(shouldAutoScrollOnAppend(true, false, true, true)).toBe(true)
    expect(shouldAutoScrollOnAppend(false, false, true, true)).toBe(false)
  })

  it('validates composer and Enter behavior', () => {
    expect(validateComposerInput('   ').ok).toBe(false)
    expect(validateComposerInput('hello').ok).toBe(true)
    expect(shouldSendOnEnter('Enter', false)).toBe(true)
    expect(shouldSendOnEnter('Enter', true)).toBe(false)
  })
})
