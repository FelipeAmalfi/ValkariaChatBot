import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

const NO_MEMORY_RESPONSE =
  'Não tenho memórias anteriores desta conversa. Esta parece ser a nossa primeira interação nesta sessão, aventureiro.'

export function memoryNode(deps: GraphDependencies) {
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

      if (state.playerId) {
        const weights = await deps.feedbackRepository
          .getWeightsByPlayer(state.playerId)
          .catch(() => new Map<string, number>())

        if (weights.size > 0) {
          const helpful = [...weights.entries()].filter(([, w]) => w > 0).map(([n]) => n)
          const unhelpful = [...weights.entries()].filter(([, w]) => w < 0).map(([n]) => n)
          const feedbackLines: string[] = []
          if (helpful.length) feedbackLines.push(`NPCs bem avaliados: ${helpful.join(', ')}`)
          if (unhelpful.length) feedbackLines.push(`NPCs mal avaliados: ${unhelpful.join(', ')}`)
          if (feedbackLines.length) {
            parts.push(`\n\nPadrões de feedback de recomendação:\n  ${feedbackLines.join('\n  ')}`)
          }
        }
      }

      return { response: parts.join('') }
    } catch {
      return { response: NO_MEMORY_RESPONSE }
    }
  }
}
