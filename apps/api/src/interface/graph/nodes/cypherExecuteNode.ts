import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import { CypherGuardrail } from '../../../core/security/CypherGuardrail.js'

export function cypherExecuteNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const queries = state.lastCypherQueries

    if (!queries || queries.length === 0) {
      return {
        lastCypherError: 'No queries to execute',
        cypherRetryCount: state.cypherRetryCount + 1,
      }
    }

    const allResults: unknown[] = []

    for (const query of queries) {
      const validation = CypherGuardrail.validate(query.cypher)

      if (!validation.allowed) {
        return {
          lastCypherError: `${query.purpose}: bloqueado pelo guardrail — ${validation.reason}`,
          cypherRetryCount: state.cypherRetryCount + 1,
        }
      }

      try {
        const rows = await deps.graphRepository.runQuery(validation.sanitizedQuery!)
        allResults.push(...rows)
      } catch (err) {
        return {
          lastCypherError: `${query.purpose}: ${err instanceof Error ? err.message : String(err)}`,
          cypherRetryCount: state.cypherRetryCount + 1,
        }
      }
    }

    // Deduplicate by name (different queries may return the same NPC)
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

    return {
      retrievalResults: deduped,
      aggregatedContext: JSON.stringify(deduped),
      lastCypherError: undefined,
    }
  }
}
