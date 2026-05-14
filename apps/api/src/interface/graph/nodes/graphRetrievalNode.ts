import type { ValkáriaState } from '../state.js'
import type { GraphDependencies } from '../dependencies.js'
import type { NpcGraphNode } from '../../../core/application/ports/GraphRepository.js'
import type { LoreQueryResult } from '../../../core/application/ports/LoreQueryService.js'

function formatGraphNodes(nodes: NpcGraphNode[]): string {
  if (nodes.length === 0) return 'Nenhum NPC encontrado com esses critérios.'
  return nodes
    .map((n) => {
      const parts = [`NPC: ${n.name}`]
      if (n.location) parts.push(`Local: ${n.location}`)
      if (n.description) parts.push(`Descrição: ${n.description}`)
      return parts.join(' | ')
    })
    .join('\n')
}

function formatLoreResult(result: LoreQueryResult): string {
  if (result.data.length === 0) return 'Nenhum resultado encontrado.'
  const lines = result.data.map((row) =>
    Object.entries(row)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v ?? '')}`)
      .join(' | '),
  )
  return `${result.entity === 'npc' ? 'NPCs' : 'Locais'} (campos: ${result.fields.join(', ')}):\n${lines.join('\n')}`
}

export function graphRetrievalNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const { intent, slots } = state

    try {
      // ── Graph traversal (Neo4j) ──────────────────────────────────────────
      if (intent === 'ask_relationship') {
        const nodes = await deps.graphRepository.findNpcsMatchingCriteria({
          sharedInterestsWith: slots.characterName ?? slots.relationshipTarget,
          location: slots.locationName,
          interest: slots.topic,
        })
        const aggregatedContext = formatGraphNodes(nodes)
        return { retrievalResults: nodes, aggregatedContext }
      }

      // "NPCs próximos a X" — mesma localização
      if (intent === 'search_npcs' && slots.characterName && !slots.locationName && !slots.topic) {
        const nodes = await deps.graphRepository.findNpcsNearNpc(slots.characterName)
        return { retrievalResults: nodes, aggregatedContext: formatGraphNodes(nodes) }
      }

      // ── Field-selection query (PostgreSQL via LoreQueryService) ──────────
      const entity = slots.requestedEntity ?? (intent === 'search_locations' ? 'location' : 'npc')
      const fields = slots.requestedFields ?? ['name', 'description']
      const filters = {
        location: slots.locationName,
        interest: slots.topic,
        name: slots.characterName,
      }

      const result = await deps.loreQueryService.query(entity, fields, filters)
      return {
        retrievalResults: result.data,
        aggregatedContext: formatLoreResult(result),
      }
    } catch (err) {
      return {
        retrievalResults: [],
        actionError: err instanceof Error ? err.message : String(err),
      }
    }
  }
}
