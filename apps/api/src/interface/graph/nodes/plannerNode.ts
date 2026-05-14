import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import {
  PlannerPlanSchema,
  getPlannerSystemPrompt,
  getPlannerUserPrompt,
} from '../../../shared/prompts/v1/generatePlan.js'

export function plannerNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    try {
      const response = await deps.aiProvider.complete({
        messages: [
          { role: 'system', content: getPlannerSystemPrompt() },
          {
            role: 'user',
            content: getPlannerUserPrompt(
              state.intent,
              state.slots,
              state.complexity,
              state.sessionContext?.currentRole,
            ),
          },
        ],
        task: 'extraction',
        temperature: 0.2,
        maxTokens: 512,
      })

      const content = response.content
        .replace(/^```json\n?/, '')
        .replace(/\n?```$/, '')
        .trim()

      const parsed = PlannerPlanSchema.safeParse(JSON.parse(content))

      if (!parsed.success) {
        return { plannerPlan: undefined }
      }

      console.log(JSON.stringify({
        event: 'planner_decision',
        intent: state.intent,
        steps: parsed.data.steps.map((s) => s.strategy),
        rationale: parsed.data.rationale,
      }))

      return { plannerPlan: parsed.data }
    } catch {
      return { plannerPlan: undefined }
    }
  }
}
