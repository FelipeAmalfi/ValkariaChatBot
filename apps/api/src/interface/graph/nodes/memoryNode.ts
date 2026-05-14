import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

const NO_MEMORY_RESPONSE =
  'Não tenho memórias anteriores desta conversa. Esta parece ser a nossa primeira interação nesta sessão, aventureiro.'

export function memoryNode(_deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    try {
      const { sessionContext } = state

      if (!sessionContext) {
        return { response: NO_MEMORY_RESPONSE }
      }

      const { memorySummary, recentContext, playerName, currentRole } = sessionContext

      const hasSummary = memorySummary && memorySummary.trim().length > 0
      const hasRecent = recentContext.length > 0

      if (!hasSummary && !hasRecent) {
        return { response: NO_MEMORY_RESPONSE }
      }

      const parts: string[] = []

      const greeting = playerName
        ? `${playerName} (${currentRole})`
        : currentRole

      parts.push(`Memórias da sessão para ${greeting}:`)

      if (hasSummary) {
        parts.push(`\nResumo: ${memorySummary}`)
      }

      if (hasRecent) {
        const recentLines = recentContext
          .slice(-5) // show at most last 5 messages
          .map((msg, i) => `  ${i + 1}. ${msg}`)
          .join('\n')
        parts.push(`\nContexto recente:\n${recentLines}`)
      }

      return { response: parts.join('') }
    } catch {
      return { response: NO_MEMORY_RESPONSE }
    }
  }
}
