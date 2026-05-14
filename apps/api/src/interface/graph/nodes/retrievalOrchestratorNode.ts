import type { RunnableConfig } from '@langchain/core/runnables'
import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import type { RetrievedDocument } from '../../../core/application/ports/VectorRetriever.js'

function formatDocs(docs: RetrievedDocument[]): string {
  return JSON.stringify(docs.map((d) => ({ content: d.content, score: d.score, metadata: d.metadata })))
}

export function retrievalOrchestratorNode(deps: GraphDependencies) {
  return async (
    state: ValkáriaState,
    config?: RunnableConfig,
  ): Promise<Partial<ValkáriaState>> => {
    const plan = state.plannerPlan
    if (!plan?.steps.length) {
      return { retrievalResults: [], retrievalError: 'No plan steps to execute' }
    }

    const threadId = config?.configurable?.['thread_id'] as string | undefined
    const allResults: unknown[] = []
    const contextParts: string[] = []

    for (const step of plan.steps) {
      try {
        switch (step.strategy) {
          case 'vector': {
            const docs = await deps.vectorRetriever.search(step.target, 5, step.filters)
            allResults.push(...docs)
            if (docs.length) contextParts.push(`[${step.purpose}]\n${formatDocs(docs)}`)
            break
          }
          case 'character_lookup': {
            const char = await deps.characterRepository.findByName(step.target)
            if (char) {
              allResults.push(char)
              contextParts.push(`[${step.purpose}]\n${JSON.stringify(char)}`)
            }
            break
          }
          case 'affinity': {
            if (!state.playerId) break
            const affinities = await deps.affinityRepository.findAllByPlayer(state.playerId)
            allResults.push(...affinities)
            if (affinities.length) {
              contextParts.push(`[${step.purpose}]\n${JSON.stringify(affinities)}`)
            }
            break
          }
          case 'memory': {
            if (!threadId) break
            const block = await deps.memoryEngine.getMemoryBlock(threadId)
            if (block) contextParts.push(`[${step.purpose}]\n${block}`)
            break
          }
        }
      } catch {
        // Non-fatal per step — continue with remaining steps
      }
    }

    // Deduplicate by name if present
    const seen = new Set<string>()
    const deduped = allResults.filter((row) => {
      if (row && typeof row === 'object' && 'name' in row) {
        const name = (row as Record<string, unknown>).name
        if (typeof name === 'string') {
          if (seen.has(name)) return false
          seen.add(name)
        }
      }
      return true
    })

    console.log(JSON.stringify({
      event: 'retrieval_complete',
      stepsExecuted: plan.steps.length,
      resultsCount: deduped.length,
    }))

    return {
      retrievalResults: deduped,
      aggregatedContext: contextParts.length ? contextParts.join('\n\n') : undefined,
      retrievalError: undefined,
    }
  }
}
