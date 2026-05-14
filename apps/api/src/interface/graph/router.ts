import type { ValkáriaState } from './state.js'
import type { Intent } from './state.js'
import { MULTISTEP_INTENTS } from '../../shared/prompts/v1/identifyIntent.js'

export function routeAfterPlanner(state: ValkáriaState): string {
  if (state.plannerPlan?.steps.length) return 'retrievalOrchestrator'
  return 'simpleRetrieval'
}

export function routeAfterCypherExecute(state: ValkáriaState): string {
  if (!state.lastCypherError) return 'narrativeResponse'
  if (state.cypherRetryCount <= 1) return 'cypherGenerate'
  return 'narrativeResponse'
}

export function routeAfterSanitize(state: ValkáriaState): string {
  if (state.blocked) return '__end__'
  return 'identifyIntent'
}

const GRAPH_RETRIEVAL_INTENTS: Intent[] = ['ask_relationship', 'search_npcs', 'search_locations']

export function routeAfterIntent(state: ValkáriaState): string {
  const { intent, complexity, slots } = state

  // Identity flows
  if (intent === 'identify_player' || intent === 'identify_dm') return 'identityFlow'

  // Memory query — lightweight, answered from session alone
  if (intent === 'ask_memory') return 'memoryNode'

  // Generic conversation or unrecognised intent — no retrieval needed
  if (intent === 'chat' || intent === 'unknown') return 'narrativeResponse'

  // Graph/lore queries — dynamic Cypher generation via LLM
  if (intent && GRAPH_RETRIEVAL_INTENTS.includes(intent)) {
    if (
      intent === 'ask_relationship' ||
      slots.requestedFields?.length ||
      slots.locationName ||
      slots.topic
    ) {
      return 'cypherGenerate'
    }
  }

  // Multistep intents or complexity flag set by the classifier
  if (intent && MULTISTEP_INTENTS.includes(intent)) return 'planner'
  if (complexity === 'multistep') return 'planner'

  // Simple retrieval — single entity lookups
  return 'simpleRetrieval'
}
