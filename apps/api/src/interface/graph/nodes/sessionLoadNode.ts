import type { RunnableConfig } from '@langchain/core/runnables'
import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

export function sessionLoadNode(deps: GraphDependencies) {
  return async (
    state: ValkáriaState,
    config?: RunnableConfig,
  ): Promise<Partial<ValkáriaState>> => {
    // Thread ID comes from the LangGraph config when a checkpointer is active.
    // The ChatController passes it via config.configurable.thread_id.
    const threadId: string | undefined =
      (config?.configurable?.['thread_id'] as string | undefined) ??
      state.slots.previousContext

    if (!threadId) {
      return {}
    }

    try {
      const sessionContext = await deps.sessionContextStore.load(threadId)
      return sessionContext ? { sessionContext } : {}
    } catch {
      // Redis failure is non-fatal — graph continues without session context
      return {}
    }
  }
}
