import { describe, it, expect, vi } from 'vitest'
import { feedbackNode } from '../../../src/interface/graph/nodes/feedbackNode.js'
import type { GraphDependencies } from '../../../src/interface/graph/dependencies.js'
import { makeState } from './helpers/state.js'

function makeDeps(overrides: Partial<GraphDependencies> = {}): GraphDependencies {
  return {
    feedbackRepository: {
      save: vi.fn().mockResolvedValue(undefined),
      getWeightsByPlayer: vi.fn().mockResolvedValue(new Map()),
    },
    ...overrides,
  } as unknown as GraphDependencies
}

describe('feedbackNode — missing player', () => {
  it('returns identification prompt when playerId is absent', async () => {
    const node = feedbackNode(makeDeps())
    const result = await node(makeState())
    expect(result.response).toContain('identificar')
  })
})

describe('feedbackNode — missing NPC name', () => {
  it('asks for NPC name when slots and lastRecommendedNpcs are empty', async () => {
    const node = feedbackNode(makeDeps())
    const result = await node(makeState({ playerId: 'p-1', lastRecommendedNpcs: [] }))
    expect(result.response).toContain('nome do personagem')
  })
})

describe('feedbackNode — missing sentiment', () => {
  it('asks for clarification when feedbackSentiment is absent', async () => {
    const node = feedbackNode(makeDeps())
    const result = await node(
      makeState({ playerId: 'p-1', slots: { affinityTarget: 'Caliandre' } }),
    )
    expect(result.response).toContain('útil')
  })
})

describe('feedbackNode — positive feedback', () => {
  it('saves helpful=true and confirms the recommendation', async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ feedbackRepository: { save: saveMock, getWeightsByPlayer: vi.fn() } })
    const node = feedbackNode(deps)
    const result = await node(
      makeState({
        playerId: 'p-1',
        slots: { affinityTarget: 'Caliandre', feedbackSentiment: 'positive' },
      }),
    )
    expect(saveMock).toHaveBeenCalledWith('p-1', 'Caliandre', true)
    expect(result.response).toContain('Caliandre')
    expect(result.response).toContain('próximas recomendações')
  })

  it('falls back to lastRecommendedNpcs[0] when affinityTarget slot is absent', async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ feedbackRepository: { save: saveMock, getWeightsByPlayer: vi.fn() } })
    const node = feedbackNode(deps)
    await node(
      makeState({
        playerId: 'p-1',
        lastRecommendedNpcs: ['Bragi'],
        slots: { feedbackSentiment: 'positive' },
      }),
    )
    expect(saveMock).toHaveBeenCalledWith('p-1', 'Bragi', true)
  })
})

describe('feedbackNode — negative feedback', () => {
  it('saves helpful=false and confirms score reduction', async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ feedbackRepository: { save: saveMock, getWeightsByPlayer: vi.fn() } })
    const node = feedbackNode(deps)
    const result = await node(
      makeState({
        playerId: 'p-1',
        slots: { affinityTarget: 'Bragi', feedbackSentiment: 'negative' },
      }),
    )
    expect(saveMock).toHaveBeenCalledWith('p-1', 'Bragi', false)
    expect(result.response).toContain('reduzir')
  })
})

describe('feedbackNode — repository error', () => {
  it('returns error message without throwing when save fails', async () => {
    const deps = makeDeps({
      feedbackRepository: {
        save: vi.fn().mockRejectedValue(new Error('DB down')),
        getWeightsByPlayer: vi.fn(),
      },
    })
    const node = feedbackNode(deps)
    const result = await node(
      makeState({
        playerId: 'p-1',
        slots: { affinityTarget: 'Aaliyah', feedbackSentiment: 'positive' },
      }),
    )
    expect(result.response).toContain('Tente novamente')
  })
})
