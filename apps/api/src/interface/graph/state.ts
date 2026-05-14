import { Annotation } from '@langchain/langgraph'
import type { Intent, Slots } from '../../shared/prompts/v1/identifyIntent.js'
import type { Role } from '../../core/domain/value-objects/Role.js'

// Intent enum must stay in sync with IntentSchema in identifyIntent.ts
export { type Intent }

export const ValkáriaStateAnnotation = Annotation.Root({
  // User input for this turn
  message: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  // Classified intent
  intent: Annotation<Intent | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // Accumulated slots across turns (merged, never replaced)
  slots: Annotation<Partial<Slots>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  // Response to send back to the user
  response: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // Action results (reset each turn)
  actionSuccess: Annotation<boolean | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  actionError: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  actionData: Annotation<unknown>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // Auth context — populated from JWT before invoking the graph
  playerRole: Annotation<Role | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  playerId: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
})

export type ValkáriaState = typeof ValkáriaStateAnnotation.State
