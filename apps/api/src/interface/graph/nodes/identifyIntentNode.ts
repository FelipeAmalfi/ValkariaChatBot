import {
  IntentResponseSchema,
  getSystemPrompt,
  getUserPromptTemplate,
} from '../../../shared/prompts/v1/identifyIntent.js'
import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

export function identifyIntentNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    // Reset per-turn action fields
    const base: Partial<ValkáriaState> = {
      actionSuccess: undefined,
      actionError: undefined,
      actionData: undefined,
    }

    // Serialise session context for inclusion in the classification prompt when available
    let sessionContextSummary: string | undefined
    if (state.sessionContext) {
      const { currentRole, playerName } = state.sessionContext
      sessionContextSummary = JSON.stringify({ role: currentRole, playerName })
    }

    try {
      const response = await deps.aiProvider.complete({
        messages: [
          { role: 'system', content: getSystemPrompt() },
          {
            role: 'user',
            content: getUserPromptTemplate(state.message, sessionContextSummary),
          },
        ],
        task: 'classification',
        temperature: 0.1,
      })

      let parsed: unknown
      try {
        parsed = JSON.parse(response.content)
      } catch {
        return { ...base, intent: 'unknown', slots: {}, complexity: 'simple', requiresRetrieval: false }
      }

      const result = IntentResponseSchema.safeParse(parsed)
      if (!result.success) {
        return { ...base, intent: 'unknown', slots: {}, complexity: 'simple', requiresRetrieval: false }
      }

      return {
        ...base,
        intent: result.data.intent,
        // Slots are merged by the Annotation reducer — just pass new ones
        slots: result.data.slots,
        confidence: result.data.confidence,
        complexity: result.data.complexity,
        requiresRetrieval: result.data.requiresRetrieval,
      }
    } catch {
      return { ...base, intent: 'unknown', complexity: 'simple', requiresRetrieval: false }
    }
  }
}
