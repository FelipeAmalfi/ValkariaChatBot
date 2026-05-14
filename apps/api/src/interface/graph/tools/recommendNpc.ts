import type { VectorRetriever } from '../../../core/application/ports/VectorRetriever.js'
import type { NpcAffinityRepository } from '../../../core/application/ports/NpcAffinityRepository.js'
import type { Tool, ToolOutput } from './types.js'

interface Input {
  playerId?: string
  query: string
  excludeNpcNames?: string[]
  topK?: number
  [key: string]: unknown
}

interface RecommendedNpc {
  name: string
  score: number
  affinityLevel?: string
  description?: string
  location?: string
}

export function createRecommendNpcTool(
  vectorRetriever: VectorRetriever,
  affinityRepository: NpcAffinityRepository,
): Tool<Input> {
  return {
    name: 'recommendNpc',
    description: 'Recomenda NPCs com base em personalidade, interesses e histórico de afinidade',
    async execute(input: Input, correlationId: string): Promise<ToolOutput> {
      try {
        // Busca semântica por NPCs similares ao query
        const results = await vectorRetriever.search(input.query, (input.topK ?? 5) + 3, {
          type: 'npc',
        })

        // Carrega afinidade se tiver playerId
        const affinityMap = new Map<string, string>()
        if (input.playerId) {
          const affinities = await affinityRepository.findAllByPlayer(input.playerId)
          for (const a of affinities) {
            affinityMap.set(a.npcName.toLowerCase(), a.level)
          }
        }

        // Filtra excluídos e mapeia para formato de recomendação
        const excluded = new Set((input.excludeNpcNames ?? []).map((n) => n.toLowerCase()))
        const recommendations: RecommendedNpc[] = results
          .filter((r) => {
            const name = (r.metadata.name as string | undefined)?.toLowerCase() ?? ''
            return !excluded.has(name)
          })
          .slice(0, input.topK ?? 5)
          .map((r) => ({
            name: (r.metadata.name as string) ?? '',
            score: r.score,
            affinityLevel: affinityMap.get(((r.metadata.name as string) ?? '').toLowerCase()),
            description: (r.metadata.description as string | undefined),
            location: (r.metadata.location_name as string | undefined),
          }))

        return { success: true, data: recommendations, correlationId }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          correlationId,
        }
      }
    },
  }
}
