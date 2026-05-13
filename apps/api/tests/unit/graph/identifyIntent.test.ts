import { describe, it, expect } from 'vitest'
import { computeMissingSlots } from '../../../src/interface/graph/nodes/identifyIntentNode.js'

describe('computeMissingSlots', () => {
  it('returns empty array for chat intent', () => {
    expect(computeMissingSlots('chat', {})).toEqual([])
  })

  it('returns characterName as missing for ask_character with empty slots', () => {
    expect(computeMissingSlots('ask_character', {})).toContain('characterName')
  })

  it('returns empty when required slot is present', () => {
    expect(computeMissingSlots('ask_character', { characterName: 'Aria' })).toEqual([])
  })

  it('returns locationName as missing for ask_location', () => {
    expect(computeMissingSlots('ask_location', {})).toContain('locationName')
  })

  it('returns empty for unknown intent', () => {
    expect(computeMissingSlots('unknown', {})).toEqual([])
  })
})
