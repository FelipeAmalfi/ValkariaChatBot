import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import {
  CypherResponseSchema,
  getCypherSystemPrompt,
  getCypherUserPrompt,
  getCypherCorrectionPrompt,
} from '../../../shared/prompts/v1/generateCypher.js'

export function cypherGenerateNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const isCorrectionPass = state.cypherRetryCount > 0 && !!state.lastCypherError

    const systemPrompt = getCypherSystemPrompt()
    const userPrompt = isCorrectionPass
      ? getCypherCorrectionPrompt(
          state.intent,
          state.slots,
          state.lastCypherQueries,
          state.lastCypherError!,
        )
      : getCypherUserPrompt(state.intent, state.slots, state.complexity)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ]

    try {
      const response = await deps.aiProvider.complete({
        messages,
        task: 'extraction',
        temperature: 0.2,
        maxTokens: 1024,
      })

      const content = response.content
        .replace(/^```json\n?/, '')
        .replace(/\n?```$/, '')
        .trim()

      const parsed = CypherResponseSchema.safeParse(JSON.parse(content))

      if (!parsed.success) {
        return {
          lastCypherQueries: undefined,
          lastCypherError: `Cypher generation failed: invalid schema — ${parsed.error.message}`,
        }
      }

      return {
        lastCypherQueries: parsed.data.queries,
        lastCypherError: undefined,
      }
    } catch (err) {
      return {
        lastCypherQueries: undefined,
        lastCypherError: `Cypher generation failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}
