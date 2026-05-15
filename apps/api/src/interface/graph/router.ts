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

  switch (intent) {
    case 'identify_player':
    case 'identify_dm':
      return 'identityFlow'

    case 'ask_memory':
      return 'memoryNode'

    case 'ask_affinity':
      return 'affinityNode'

    case 'chat':
    case 'unknown':
      return 'narrativeResponse'

    case 'ask_relationship':
    case 'search_npcs':
    case 'search_locations':
      if (
        intent === 'ask_relationship' ||
        slots.requestedFields?.length ||
        slots.locationName ||
        slots.topic
      ) {
        return 'cypherGenerate'
      }
      return 'simpleRetrieval'

    default:
      break
  }

  if (intent && MULTISTEP_INTENTS.includes(intent)) return 'planner'
  if (complexity === 'multistep') return 'planner'

  return 'simpleRetrieval'
}
