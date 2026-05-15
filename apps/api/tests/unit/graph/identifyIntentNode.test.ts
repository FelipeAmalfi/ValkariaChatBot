import { describe, it, expect, vi } from 'vitest'
import { IntentResponseSchema } from '../../../src/shared/prompts/v1/identifyIntent.js'
import { identifyIntentNode } from '../../../src/interface/graph/nodes/identifyIntentNode.js'
import type { GraphDependencies } from '../../../src/interface/graph/dependencies.js'
import { makeState } from './helpers/state.js'

// ── Schema validation tests (existing) ───────────────────────────────────────

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

// ── Node behaviour tests ──────────────────────────────────────────────────────

function mockCompletion(content: string): GraphDependencies['aiProvider'] {
  return {
    complete: vi.fn().mockResolvedValue({ content, model: 'test', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }),
    embed: vi.fn(),
    getModelForTask: vi.fn().mockReturnValue('test'),
  } as unknown as GraphDependencies['aiProvider']
}

function makeDeps(aiProvider: GraphDependencies['aiProvider']): GraphDependencies {
  return { aiProvider } as unknown as GraphDependencies
}

describe('identifyIntentNode — intent routing', () => {
  it('classifies chat intent with no extra slots', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'chat', slots: {}, confidence: 0.8, complexity: 'simple', requiresRetrieval: false,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'Olá' }))
    expect(result.intent).toBe('chat')
    expect(result.slots).toEqual({})
  })

  it('classifies ask_character and extracts npcName slot', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'ask_character', slots: { characterName: 'Aaliyah' }, confidence: 0.9, complexity: 'simple', requiresRetrieval: true,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'Quem é Aaliyah?' }))
    expect(result.intent).toBe('ask_character')
    expect(result.slots?.characterName).toBe('Aaliyah')
  })

  it('classifies ask_location and extracts locationName slot', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'ask_location', slots: { locationName: 'Taverna das Sombras' }, confidence: 0.92, complexity: 'simple', requiresRetrieval: true,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'O que há na Taverna das Sombras?' }))
    expect(result.intent).toBe('ask_location')
    expect(result.slots?.locationName).toBe('Taverna das Sombras')
  })

  it('classifies ask_recommendation without extra required slots', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'ask_recommendation', slots: {}, confidence: 0.85, complexity: 'simple', requiresRetrieval: true,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'Me recomende um NPC' }))
    expect(result.intent).toBe('ask_recommendation')
  })

  it('classifies identify_player and extracts playerName slot', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'identify_player', slots: { characterName: 'Lyriel' }, confidence: 0.95, complexity: 'simple', requiresRetrieval: false,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'Sou a Lyriel' }))
    expect(result.intent).toBe('identify_player')
    expect(result.slots?.characterName).toBe('Lyriel')
  })

  it('classifies identify_dm without extra slots', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'identify_dm', slots: {}, confidence: 0.99, complexity: 'simple', requiresRetrieval: false,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'Sou o Mestre' }))
    expect(result.intent).toBe('identify_dm')
  })

  it('classifies feedback_recommendation with feedbackSentiment slot', async () => {
    const ai = mockCompletion(JSON.stringify({
      intent: 'feedback_recommendation', slots: { feedbackSentiment: 'positive' }, confidence: 0.88, complexity: 'simple', requiresRetrieval: false,
    }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'Essa recomendação faz muito sentido, gostei!' }))
    expect(result.intent).toBe('feedback_recommendation')
    expect(result.slots?.feedbackSentiment).toBe('positive')
  })
})

describe('identifyIntentNode — fallback behaviour', () => {
  it('falls back to unknown when AI returns malformed JSON', async () => {
    const ai = mockCompletion('not valid json at all {')
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'qualquer coisa' }))
    expect(result.intent).toBe('unknown')
    expect(result.complexity).toBe('simple')
    expect(result.requiresRetrieval).toBe(false)
  })

  it('falls back to unknown when AI returns invalid schema', async () => {
    const ai = mockCompletion(JSON.stringify({ intent: 'this_does_not_exist', slots: {} }))
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'qualquer coisa' }))
    expect(result.intent).toBe('unknown')
  })

  it('falls back to unknown on AI provider error', async () => {
    const ai = {
      complete: vi.fn().mockRejectedValue(new Error('API timeout')),
      embed: vi.fn(),
      getModelForTask: vi.fn(),
    } as unknown as GraphDependencies['aiProvider']
    const node = identifyIntentNode(makeDeps(ai))
    const result = await node(makeState({ message: 'qualquer coisa' }))
    expect(result.intent).toBe('unknown')
  })
})
