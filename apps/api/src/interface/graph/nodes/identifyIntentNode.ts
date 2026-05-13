import {
  IntentResponseSchema,
  getSystemPrompt,
  getUserPromptTemplate,
} from '../../../shared/prompts/v1/identifyIntent.js'
import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

const REQUIRED_SLOTS_BY_INTENT: Record<string, string[]> = {
  chat: [],
  ask_character: ['characterName'],
  ask_location: ['locationName'],
  ask_lore: ['topic'],
  unknown: [],
}

export function computeMissingSlots(
  intent: string,
  slots: Partial<Record<string, unknown>>,
): string[] {
  const required = REQUIRED_SLOTS_BY_INTENT[intent] ?? []
  return required.filter((slot) => !slots[slot])
}

export function identifyIntentNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    // Reset per-turn action fields
    const base: Partial<ValkáriaState> = {
      actionSuccess: undefined,
      actionError: undefined,
      actionData: undefined,
    }

    try {
      const response = await deps.aiProvider.complete({
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: getUserPromptTemplate(state.message) },
        ],
        task: 'classification',
        temperature: 0.1,
      })

      let parsed: unknown
      try {
        parsed = JSON.parse(response.content)
      } catch {
        return { ...base, intent: 'unknown', slots: {} }
      }

      const result = IntentResponseSchema.safeParse(parsed)
      if (!result.success) {
        return { ...base, intent: 'unknown', slots: {} }
      }

      return {
        ...base,
        intent: result.data.intent,
        // Slots are merged by the Annotation reducer — just pass new ones
        slots: result.data.slots,
      }
    } catch {
      return { ...base, intent: 'unknown' }
    }
  }
}
