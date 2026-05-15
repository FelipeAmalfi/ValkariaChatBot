import { describe, it, expect } from 'vitest'
import { IntentResponseSchema } from '../../../src/shared/prompts/v1/identifyIntent.js'

describe('IntentResponseSchema', () => {
  it('accepts valid intent with all required fields', () => {
    const result = IntentResponseSchema.safeParse({
      intent: 'ask_character',
      slots: { characterName: 'Aaliyah' },
      confidence: 0.9,
      complexity: 'simple',
      requiresRetrieval: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts chat intent with empty slots', () => {
    const result = IntentResponseSchema.safeParse({
      intent: 'chat',
      slots: {},
      confidence: 0.8,
      complexity: 'simple',
      requiresRetrieval: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts ask_location with locationName slot', () => {
    const result = IntentResponseSchema.safeParse({
      intent: 'ask_location',
      slots: { locationName: 'Biblioteca' },
      confidence: 0.95,
      complexity: 'simple',
      requiresRetrieval: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slots.locationName).toBe('Biblioteca')
    }
  })

  it('rejects unknown intent value', () => {
    const result = IntentResponseSchema.safeParse({
      intent: 'invalid_intent_xyz',
      slots: {},
      confidence: 0.5,
      complexity: 'simple',
      requiresRetrieval: false,
    })
    expect(result.success).toBe(false)
  })

  it('accepts ask_recommendation with recommendationFilters slot', () => {
    const result = IntentResponseSchema.safeParse({
      intent: 'ask_recommendation',
      slots: { recommendationFilters: 'combate' },
      confidence: 0.85,
      complexity: 'simple',
      requiresRetrieval: true,
    })
    expect(result.success).toBe(true)
  })
})
