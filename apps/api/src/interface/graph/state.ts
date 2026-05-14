import { Annotation } from '@langchain/langgraph'
import type { Intent, Slots, Complexity } from '../../shared/prompts/v1/identifyIntent.js'
import type { PlannerPlan } from '../../shared/prompts/v1/generatePlan.js'
import type { Role } from '../../core/domain/value-objects/Role.js'
import type { SessionContext } from '../../core/application/ports/SessionContextStore.js'

export { type Intent }
export type { PlannerPlan }

export const ValkáriaStateAnnotation = Annotation.Root({
  // ─── Input ───────────────────────────────────────────────────────────────
  message: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  // ─── Security ────────────────────────────────────────────────────────────
  // Set by sanitizeNode — when true the graph routes directly to END
  blocked: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  // ─── Intent & Classification ──────────────────────────────────────────────
  intent: Annotation<Intent | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  complexity: Annotation<Complexity | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  confidence: Annotation<number | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  requiresRetrieval: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  // Accumulated slots across turns (merged, never replaced)
  slots: Annotation<Partial<Slots>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  // ─── Session & Identity ───────────────────────────────────────────────────
  // Conversational session loaded from Redis each turn
  sessionContext: Annotation<SessionContext | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // Auth context — still populated from JWT when available
  playerRole: Annotation<Role | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  playerId: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // ─── Retrieval & Orchestration ────────────────────────────────────────────
  // Results from tools/retrieval steps (replaced each turn)
  retrievalResults: Annotation<unknown[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  // Structured plan from LLM-driven planner
  plannerPlan: Annotation<PlannerPlan | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  // Aggregated context string built from retrieval results for prompt injection
  aggregatedContext: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // ─── Cypher pipeline (Text-to-Cypher with retry) ─────────────────────────
  lastCypherQueries: Annotation<Array<{ cypher: string; purpose: string }> | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  lastCypherError: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  cypherRetryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  // ─── Response ─────────────────────────────────────────────────────────────
  response: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // Surface retrieval errors to the narrative node
  retrievalError: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // ─── Action results (reset each turn) ────────────────────────────────────
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
})

export type ValkáriaState = typeof ValkáriaStateAnnotation.State
