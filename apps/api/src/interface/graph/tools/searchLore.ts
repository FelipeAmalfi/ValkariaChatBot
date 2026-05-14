import type { VectorRetriever } from '../../../core/application/ports/VectorRetriever.js'
import type { Tool, ToolOutput } from './types.js'

interface Input {
  query: string
  topK?: number
  type?: 'npc' | 'location'
  locationName?: string
  [key: string]: unknown
}

export function createSearchLoreTool(vectorRetriever: VectorRetriever): Tool<Input> {
  return {
    name: 'searchLore',
    description: 'Busca semântica no lore — NPCs, locações e informações de Candessah',
    async execute(input: Input, correlationId: string): Promise<ToolOutput> {
      try {
        const filters: Record<string, string> = {}
        if (input.type) filters.type = input.type
        if (input.locationName) filters.location_name = input.locationName

        const results = await vectorRetriever.search(
          input.query,
          input.topK ?? 5,
          Object.keys(filters).length > 0 ? filters : undefined,
        )
        return { success: true, data: results, correlationId }
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
