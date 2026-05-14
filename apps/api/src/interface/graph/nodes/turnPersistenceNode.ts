import type { RunnableConfig } from '@langchain/core/runnables'
import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

export function turnPersistenceNode(deps: GraphDependencies) {
  return async (
    state: ValkáriaState,
    config?: RunnableConfig,
  ): Promise<Partial<ValkáriaState>> => {
    const threadId = config?.configurable?.['thread_id'] as string | undefined
    if (!threadId || !state.message) return {}

    try {
      await deps.memoryEngine.appendToShortTerm(threadId, state.message)
    } catch {
      // Non-fatal — conversation continues without this turn being persisted
    }

    return {}
  }
}
