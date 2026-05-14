import { z } from 'zod'
import type { Intent, Slots, Complexity } from './identifyIntent.js'

export const PlanStepSchema = z.object({
  strategy: z.enum(['vector', 'affinity', 'character_lookup', 'memory']),
  target: z.string(),
  filters: z.record(z.string()).optional(),
  purpose: z.string(),
})

export const PlannerPlanSchema = z.object({
  steps: z.array(PlanStepSchema).min(1).max(4),
  rationale: z.string(),
})

export type PlanStep = z.infer<typeof PlanStepSchema>
export type PlannerPlan = z.infer<typeof PlannerPlanSchema>

export function getPlannerSystemPrompt(): string {
  return JSON.stringify({
    role: 'Orchestration planner for Valkária RPG chatbot. Output a retrieval plan in JSON.',
    strategies: {
      vector: 'Semantic search over NPCs and locations using embeddings. Use for open-ended queries, lore questions, personality-based searches.',
      affinity: 'Load the player\'s affinity scores with NPCs. Use when the player\'s relationship history matters (recommendations, social queries).',
      character_lookup: 'Exact name lookup in the character repository. Use when a specific NPC name is known.',
      memory: 'Load the session memory block (summary + recent context). Use when the query involves past interactions or continuity.',
    },
    rules: [
      'Use 1 step for simple single-entity queries.',
      'Combine strategies when context enriches the response (e.g. vector + affinity for recommendations).',
      'Max 4 steps. Never repeat the same strategy twice.',
      'affinity strategy requires the player to be authenticated; skip it for guest role.',
      'memory strategy is most useful when the query references past events or the player\'s history.',
    ],
    output_format: 'JSON ONLY: { "steps": [{"strategy": "<strategy>", "target": "<query or name>", "filters": {}, "purpose": "<what this retrieves>"}], "rationale": "<1-2 sentences>" }',
  })
}

export function getPlannerUserPrompt(
  intent: Intent | undefined,
  slots: Partial<Slots>,
  complexity: Complexity | undefined,
  sessionRole: string | undefined,
): string {
  return JSON.stringify({
    intent,
    slots,
    complexity,
    player_role: sessionRole ?? 'guest',
    instruction:
      sessionRole === 'guest'
        ? 'Player is not authenticated. Do NOT include affinity strategy.'
        : 'Player is authenticated. You may include affinity strategy if relevant.',
  })
}
