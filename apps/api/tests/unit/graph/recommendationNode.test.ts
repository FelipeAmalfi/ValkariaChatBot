import { describe, it, expect, vi } from 'vitest'
import { recommendationNode } from '../../../src/interface/graph/nodes/recommendationNode.js'
import type { GraphDependencies } from '../../../src/interface/graph/dependencies.js'
import type { RetrievedDocument } from '../../../src/core/application/ports/VectorRetriever.js'
import { makeState } from './helpers/state.js'

function makeDoc(name: string, score: number): RetrievedDocument {
  return { content: `NPC: ${name}`, score, metadata: { name, type: 'npc' } }
}

function makeDeps(overrides: Partial<GraphDependencies> = {}): GraphDependencies {
  return {
    pgPool: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    },
    vectorRetriever: {
      search: vi.fn().mockResolvedValue([]),
      searchByVector: vi.fn().mockResolvedValue([]),
    },
    affinityRepository: {
      findAllByPlayer: vi.fn().mockResolvedValue([]),
      findByPlayerAndNpc: vi.fn(),
      upsert: vi.fn(),
      getLevel: vi.fn(),
    },
    feedbackRepository: {
      getWeightsByPlayer: vi.fn().mockResolvedValue(new Map()),
    },
    ...overrides,
  } as unknown as GraphDependencies
}

describe('recommendationNode — no player', () => {
  it('returns error context and empty results when playerId is missing', async () => {
    const node = recommendationNode(makeDeps())
    const result = await node(makeState())
    expect(result.retrievalResults).toHaveLength(0)
    expect(result.aggregatedContext).toContain('Jogador não identificado')
    expect(result.lastRecommendedNpcs).toHaveLength(0)
  })
})

describe('recommendationNode — with player embedding', () => {
  it('uses vector search when embedding exists and returns top-5', async () => {
    const docs = ['Aaliyah', 'Bragi', 'Cira', 'Dex', 'Elia', 'Finn', 'Gara'].map((n, i) =>
      makeDoc(n, 0.9 - i * 0.1),
    )
    const deps = makeDeps({
      pgPool: {
        query: vi.fn().mockResolvedValue({ rows: [{ embedding: JSON.stringify(Array(3).fill(0.1)) }] }),
      },
      vectorRetriever: {
        searchByVector: vi.fn().mockResolvedValue(docs),
        search: vi.fn(),
      },
    })
    const node = recommendationNode(deps)
    const result = await node(makeState({ playerId: 'p-1' }))
    expect(result.retrievalResults).toHaveLength(5)
    expect(result.lastRecommendedNpcs).toHaveLength(5)
  })

  it('falls back to text search when no embedding found', async () => {
    const docs = [makeDoc('Aaliyah', 0.8)]
    const deps = makeDeps({
      pgPool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      },
      vectorRetriever: {
        searchByVector: vi.fn(),
        search: vi.fn().mockResolvedValue(docs),
      },
    })
    const node = recommendationNode(deps)
    const result = await node(makeState({ playerId: 'p-1' }))
    expect((deps.vectorRetriever as { search: ReturnType<typeof vi.fn> }).search).toHaveBeenCalled()
    expect(result.retrievalResults).toHaveLength(1)
  })
})

describe('recommendationNode — intimate NPC filtering', () => {
  it('filters out NPCs with intimate affinity level', async () => {
    const docs = [makeDoc('Aaliyah', 0.9), makeDoc('Bragi', 0.85)]
    const deps = makeDeps({
      pgPool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      },
      vectorRetriever: {
        search: vi.fn().mockResolvedValue(docs),
        searchByVector: vi.fn(),
      },
      affinityRepository: {
        findAllByPlayer: vi.fn().mockResolvedValue([
          { npcName: 'Bragi', level: 'intimate', score: 100, interactionCount: 20 },
        ]),
        findByPlayerAndNpc: vi.fn(),
        upsert: vi.fn(),
        getLevel: vi.fn(),
      },
    })
    const node = recommendationNode(deps)
    const result = await node(makeState({ playerId: 'p-1' }))
    const names = result.lastRecommendedNpcs ?? []
    expect(names).not.toContain('Bragi')
    expect(names).toContain('Aaliyah')
  })
})

describe('recommendationNode — feedback weight adjustment', () => {
  it('reduces score for negatively rated NPCs', async () => {
    const docs = [makeDoc('Aaliyah', 0.9), makeDoc('Cira', 0.85)]
    const deps = makeDeps({
      pgPool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      },
      vectorRetriever: {
        search: vi.fn().mockResolvedValue(docs),
        searchByVector: vi.fn(),
      },
      feedbackRepository: {
        getWeightsByPlayer: vi.fn().mockResolvedValue(new Map([['Aaliyah', -0.5]])),
      },
    })
    const node = recommendationNode(deps)
    const result = await node(makeState({ playerId: 'p-1' }))
    const names = result.lastRecommendedNpcs ?? []
    // Cira should rank before Aaliyah after penalty
    expect(names[0]).toBe('Cira')
  })
})

describe('recommendationNode — aggregatedContext', () => {
  it('includes affinity context in aggregatedContext', async () => {
    const docs = [makeDoc('Aaliyah', 0.9)]
    const deps = makeDeps({
      pgPool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      },
      vectorRetriever: {
        search: vi.fn().mockResolvedValue(docs),
        searchByVector: vi.fn(),
      },
      affinityRepository: {
        findAllByPlayer: vi.fn().mockResolvedValue([
          { npcName: 'Aaliyah', level: 'cordial', score: 30, interactionCount: 3 },
        ]),
        findByPlayerAndNpc: vi.fn(),
        upsert: vi.fn(),
        getLevel: vi.fn(),
      },
    })
    const node = recommendationNode(deps)
    const result = await node(makeState({ playerId: 'p-1' }))
    expect(result.aggregatedContext).toContain('Aaliyah')
    expect(result.aggregatedContext).toContain('cordial')
  })
})
