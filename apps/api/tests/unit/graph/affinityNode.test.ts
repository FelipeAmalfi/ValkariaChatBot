import { describe, it, expect, vi } from 'vitest'
import { affinityNode } from '../../../src/interface/graph/nodes/affinityNode.js'
import type { GraphDependencies } from '../../../src/interface/graph/dependencies.js'
import type { ValkáriaState } from '../../../src/interface/graph/state.js'

function makeState(overrides: Partial<ValkáriaState> = {}): ValkáriaState {
  return {
    message: '',
    blocked: false,
    intent: 'ask_affinity',
    complexity: 'simple',
    confidence: undefined,
    requiresRetrieval: false,
    slots: {},
    sessionContext: undefined,
    playerRole: undefined,
    playerId: undefined,
    retrievalResults: [],
    plannerPlan: undefined,
    aggregatedContext: undefined,
    lastCypherQueries: undefined,
    lastCypherError: undefined,
    cypherRetryCount: 0,
    response: undefined,
    retrievalError: undefined,
    actionSuccess: undefined,
    actionError: undefined,
    actionData: undefined,
    ...overrides,
  }
}

const mockAffinity = {
  id: 'aff-1',
  playerId: 'player-1',
  npcName: 'Aaliyah',
  level: 'cordial' as const,
  score: 30,
  interactionCount: 3,
  lastInteraction: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeDeps(overrides: Partial<GraphDependencies['affinityRepository']> = {}): GraphDependencies {
  return {
    affinityRepository: {
      findByPlayerAndNpc: vi.fn().mockResolvedValue(mockAffinity),
      findAllByPlayer: vi.fn().mockResolvedValue([mockAffinity]),
      upsert: vi.fn(),
      getLevel: vi.fn(),
      ...overrides,
    },
  } as unknown as GraphDependencies
}

describe('affinityNode', () => {
  it('returns error when player is not identified', async () => {
    const node = affinityNode(makeDeps())
    const result = await node(makeState())
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.error).toBeTruthy()
    expect(result.retrievalResults).toHaveLength(0)
  })

  it('fetches specific NPC affinity when affinityTarget slot is set', async () => {
    const deps = makeDeps()
    const node = affinityNode(deps)
    const state = makeState({
      slots: { affinityTarget: 'Aaliyah' },
      sessionContext: {
        threadId: 'thread-1',
        playerId: 'player-1',
        playerName: 'Nymeria',
        currentRole: 'PLAYER',
        validationState: 'validated',
        affinityContext: [],
        recentContext: [],
        lastUpdated: new Date().toISOString(),
      },
    })
    const result = await node(state)
    expect(deps.affinityRepository.findByPlayerAndNpc).toHaveBeenCalledWith('player-1', 'Aaliyah')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.affinity.npcName).toBe('Aaliyah')
    expect(ctx.affinity.level).toBe('cordial')
  })

  it('returns none level when affinity does not exist yet', async () => {
    const deps = makeDeps({ findByPlayerAndNpc: vi.fn().mockResolvedValue(null) })
    const node = affinityNode(deps)
    const state = makeState({
      slots: { affinityTarget: 'Bragi' },
      sessionContext: {
        threadId: 'thread-1',
        playerId: 'player-1',
        playerName: 'Nymeria',
        currentRole: 'PLAYER',
        validationState: 'validated',
        affinityContext: [],
        recentContext: [],
        lastUpdated: new Date().toISOString(),
      },
    })
    const result = await node(state)
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.affinity.level).toBe('none')
    expect(ctx.affinity.score).toBe(0)
  })

  it('lists all affinities when no target slot is set', async () => {
    const deps = makeDeps()
    const node = affinityNode(deps)
    const state = makeState({
      slots: {},
      sessionContext: {
        threadId: 'thread-1',
        playerId: 'player-1',
        playerName: 'Nymeria',
        currentRole: 'PLAYER',
        validationState: 'validated',
        affinityContext: [],
        recentContext: [],
        lastUpdated: new Date().toISOString(),
      },
    })
    const result = await node(state)
    expect(deps.affinityRepository.findAllByPlayer).toHaveBeenCalledWith('player-1')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.affinities).toHaveLength(1)
    expect(ctx.affinities[0].npcName).toBe('Aaliyah')
  })

  it('DM sees score in specific affinity response', async () => {
    const deps = makeDeps()
    const node = affinityNode(deps)
    const state = makeState({
      slots: { affinityTarget: 'Aaliyah' },
      sessionContext: {
        threadId: 'thread-dm',
        playerId: 'player-1',
        playerName: 'Nymeria',
        currentRole: 'DM',
        validationState: 'validated',
        affinityContext: [],
        recentContext: [],
        lastUpdated: new Date().toISOString(),
      },
    })
    const result = await node(state)
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.affinity.score).toBe(30)
  })

  it('returns retrievalError on repository failure', async () => {
    const deps = makeDeps({
      findByPlayerAndNpc: vi.fn().mockRejectedValue(new Error('DB down')),
    })
    const node = affinityNode(deps)
    const state = makeState({
      slots: { affinityTarget: 'Aaliyah' },
      sessionContext: {
        threadId: 'thread-1',
        playerId: 'player-1',
        playerName: 'Nymeria',
        currentRole: 'PLAYER',
        validationState: 'validated',
        affinityContext: [],
        recentContext: [],
        lastUpdated: new Date().toISOString(),
      },
    })
    const result = await node(state)
    expect(result.retrievalError).toBeTruthy()
  })
})
