import type { ValkáriaState } from '../../../../src/interface/graph/state.js'

/**
 * Shared factory for ValkáriaState test fixtures.
 * Returns a complete state with safe defaults; pass overrides to customise per test.
 */
export function makeState(overrides: Partial<ValkáriaState> = {}): ValkáriaState {
  return {
    message: '',
    blocked: false,
    intent: 'chat',
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
    lastRecommendedNpcs: [],
    actionSuccess: undefined,
    actionError: undefined,
    actionData: undefined,
    ...overrides,
  }
}
