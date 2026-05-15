import { describe, it, expect, vi } from 'vitest'
import { identityFlowNode } from '../../../src/interface/graph/nodes/identityFlowNode.js'
import type { GraphDependencies } from '../../../src/interface/graph/dependencies.js'
import type { SessionContext } from '../../../src/core/application/ports/SessionContextStore.js'
import { makeState } from './helpers/state.js'

function makeSession(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    threadId: 'thread-test',
    currentRole: 'guest',
    validationState: 'pending',
    affinityContext: [],
    recentContext: [],
    lastUpdated: new Date().toISOString(),
    ...overrides,
  }
}

function makeDeps(overrides: Partial<GraphDependencies> = {}): GraphDependencies {
  return {
    initiatePlayerAuthUseCase: {
      execute: vi.fn().mockResolvedValue({
        challengeId: 'chal-xyz',
        question: 'Qual foi sua maior aventura?',
        playerName: 'Lyriel',
      }),
    },
    validatePlayerAuthUseCase: {
      execute: vi.fn().mockResolvedValue({
        token: 'jwt-abc',
        playerId: 'player-1',
        playerName: 'Lyriel',
      }),
    },
    authenticateDMUseCase: {
      execute: vi.fn().mockResolvedValue({ token: 'dm-jwt-abc' }),
    },
    sessionContextStore: {
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as unknown as GraphDependencies
}

describe('identityFlowNode — identify_player turn 1 (issue challenge)', () => {
  it('issues a challenge when player is identified for the first time', async () => {
    const deps = makeDeps()
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_player',
        slots: { characterName: 'Lyriel' },
        sessionContext: makeSession({ validationState: 'pending' }),
      }),
    )
    expect(deps.initiatePlayerAuthUseCase.execute).toHaveBeenCalledWith('Lyriel')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('identity_challenge')
    expect(ctx.question).toBe('Qual foi sua maior aventura?')
  })

  it('sets sessionContext validationState to challenged', async () => {
    const deps = makeDeps()
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_player',
        slots: { characterName: 'Lyriel' },
        sessionContext: makeSession(),
      }),
    )
    expect(result.sessionContext?.validationState).toBe('challenged')
    expect(result.sessionContext?.challengeId).toBe('chal-xyz')
  })
})

describe('identityFlowNode — identify_player turn 2 (validate answer)', () => {
  it('validates correct answer and sets role to PLAYER', async () => {
    const deps = makeDeps()
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_player',
        slots: { pendingAnswer: 'Derrubi o Dragão Vermelho' },
        sessionContext: makeSession({
          validationState: 'challenged',
          challengeId: 'chal-xyz',
          playerName: 'Lyriel',
        }),
      }),
    )
    expect(deps.validatePlayerAuthUseCase.execute).toHaveBeenCalledWith({
      challengeId: 'chal-xyz',
      answer: 'Derrubi o Dragão Vermelho',
    })
    expect(result.sessionContext?.currentRole).toBe('PLAYER')
    expect(result.sessionContext?.validationState).toBe('validated')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('identity_validated')
  })

  it('denies wrong answer and keeps role as guest', async () => {
    const deps = makeDeps({
      validatePlayerAuthUseCase: {
        execute: vi.fn().mockRejectedValue(new Error('Answer did not match')),
      },
    })
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_player',
        slots: { pendingAnswer: 'Resposta errada completamente' },
        sessionContext: makeSession({
          validationState: 'challenged',
          challengeId: 'chal-xyz',
        }),
      }),
    )
    expect(result.sessionContext?.validationState).toBe('denied')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('identity_denied')
  })
})

describe('identityFlowNode — identify_player already validated', () => {
  it('returns welcome back directive when already validated', async () => {
    const node = identityFlowNode(makeDeps())
    const result = await node(
      makeState({
        intent: 'identify_player',
        sessionContext: makeSession({
          currentRole: 'PLAYER',
          validationState: 'validated',
          playerName: 'Lyriel',
        }),
      }),
    )
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('identity_already_validated')
    expect(ctx.playerName).toBe('Lyriel')
  })
})

describe('identityFlowNode — identify_dm', () => {
  it('requests DM password on first turn', async () => {
    const deps = makeDeps()
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_dm',
        sessionContext: makeSession({ validationState: 'pending' }),
      }),
    )
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('ask_dm_password')
    expect(result.sessionContext?.validationState).toBe('challenged')
  })

  it('authenticates DM with correct password on second turn', async () => {
    const deps = makeDeps()
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_dm',
        slots: { pendingAnswer: 'correct-password' },
        sessionContext: makeSession({ validationState: 'challenged' }),
      }),
    )
    expect(deps.authenticateDMUseCase.execute).toHaveBeenCalledWith('correct-password')
    expect(result.sessionContext?.currentRole).toBe('DM')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('dm_authenticated')
  })

  it('denies DM with wrong password', async () => {
    const deps = makeDeps({
      authenticateDMUseCase: {
        execute: vi.fn().mockRejectedValue(new Error('Wrong password')),
      },
    })
    const node = identityFlowNode(deps)
    const result = await node(
      makeState({
        intent: 'identify_dm',
        slots: { pendingAnswer: 'wrong-password' },
        sessionContext: makeSession({ validationState: 'challenged' }),
      }),
    )
    expect(result.sessionContext?.validationState).toBe('denied')
    const ctx = JSON.parse(result.aggregatedContext as string)
    expect(ctx.directive).toBe('dm_auth_failed')
  })
})
