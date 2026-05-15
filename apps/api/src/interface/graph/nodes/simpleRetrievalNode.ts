import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import type { RetrievedDocument } from '../../../core/application/ports/VectorRetriever.js'
import type { Intent, Slots } from '../../../shared/prompts/v1/identifyIntent.js'

function formatRetrievedDocuments(docs: RetrievedDocument[]): string {
  return JSON.stringify(
    docs.map((d) => ({
      content: d.content,
      score: d.score,
      metadata: d.metadata,
    })),
  )
}

function rerankDocuments(
  docs: RetrievedDocument[],
  slots: Partial<Slots>,
  intent: Intent | undefined,
): RetrievedDocument[] {
  return docs
    .map((doc) => {
      let boost = 0
      const meta = doc.metadata as Record<string, unknown>

      if (
        slots.characterName &&
        typeof meta.name === 'string' &&
        meta.name.toLowerCase().includes(slots.characterName.toLowerCase())
      ) {
        boost += 0.2
      }
      if (
        slots.locationName &&
        typeof meta.location_name === 'string' &&
        meta.location_name.toLowerCase().includes(slots.locationName.toLowerCase())
      ) {
        boost += 0.15
      }
      if (intent === 'search_npcs' && meta.type === 'npc') boost += 0.1
      if (intent === 'search_locations' && meta.type === 'location') boost += 0.1

      return { ...doc, score: Math.min(1, doc.score + boost) }
    })
    .sort((a, b) => b.score - a.score)
}

export function simpleRetrievalNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const { intent, slots } = state

    switch (intent) {
      case 'ask_character':
      case 'ask_benefits': {
        const name = slots.characterName ?? slots.affinityTarget
        if (!name) {
          return {
            retrievalResults: [],
            aggregatedContext: JSON.stringify({ error: 'Nome do personagem não informado.' }),
          }
        }

        try {
          const character = await deps.characterRepository.findByName(name)
          if (character) {
            return { retrievalResults: [character], aggregatedContext: JSON.stringify([character]) }
          }
          const docs = await deps.vectorRetriever.search(name, 3, { type: 'npc' })
          const reranked = rerankDocuments(docs, slots, intent)
          return { retrievalResults: reranked, aggregatedContext: formatRetrievedDocuments(reranked) }
        } catch {
          // Fallback: try vector search if exact lookup fails
          try {
            const docs = await deps.vectorRetriever.search(name, 3, { type: 'npc' })
            return { retrievalResults: docs, aggregatedContext: formatRetrievedDocuments(docs) }
          } catch {
            return { retrievalResults: [], retrievalError: `Recuperação falhou para "${name}"` }
          }
        }
      }

      case 'ask_relationship': {
        const name = slots.characterName
        if (!name) {
          return {
            retrievalResults: [],
            aggregatedContext: JSON.stringify({ error: 'Nome(s) do(s) personagem(ns) não informado(s).' }),
          }
        }
        try {
          const docs = await deps.vectorRetriever.search(name, 5, { type: 'npc' })
          const reranked = rerankDocuments(docs, slots, intent)
          return { retrievalResults: reranked, aggregatedContext: formatRetrievedDocuments(reranked) }
        } catch {
          return { retrievalResults: [], retrievalError: `Recuperação de relacionamento falhou para "${name}"` }
        }
      }

      case 'ask_location': {
        const locationName = slots.locationName
        if (!locationName) {
          return {
            retrievalResults: [],
            aggregatedContext: JSON.stringify({ error: 'Nome do local não informado.' }),
          }
        }
        try {
          const docs = await deps.vectorRetriever.search(locationName, 3, { type: 'location' })
          const reranked = rerankDocuments(docs, slots, intent)
          return { retrievalResults: reranked, aggregatedContext: formatRetrievedDocuments(reranked) }
        } catch {
          return { retrievalResults: [], retrievalError: `Recuperação de local falhou para "${locationName}"` }
        }
      }

      case 'ask_lore': {
        const topic = slots.topic ?? state.message
        try {
          const docs = await deps.vectorRetriever.search(topic, 5)
          return { retrievalResults: docs, aggregatedContext: formatRetrievedDocuments(docs) }
        } catch {
          return { retrievalResults: [], retrievalError: 'Recuperação de lore falhou' }
        }
      }

      case 'ask_recommendation': {
        const query = slots.recommendationFilters ?? state.message
        try {
          const docs = await deps.vectorRetriever.search(query, 8, { type: 'npc' })
          const reranked = rerankDocuments(docs, slots, intent)
          const top5 = reranked.slice(0, 5)

          let affinityContext = ''
          if (state.playerId) {
            const affinities = await deps.affinityRepository
              .findAllByPlayer(state.playerId)
              .catch(() => [])
            if (affinities.length) {
              affinityContext =
                '\n\nAfinidades do jogador: ' +
                JSON.stringify(
                  affinities.map((a) => ({ npc: a.npcName, level: a.level, score: a.score })),
                )
            }
          }

          return {
            retrievalResults: top5,
            aggregatedContext: formatRetrievedDocuments(top5) + affinityContext,
          }
        } catch {
          return { retrievalResults: [], retrievalError: 'Recuperação de recomendações falhou' }
        }
      }

      case 'search_npcs': {
        const query = slots.recommendationFilters ?? state.message
        try {
          const docs = await deps.vectorRetriever.search(query, 5, { type: 'npc' })
          const reranked = rerankDocuments(docs, slots, intent)
          return { retrievalResults: reranked, aggregatedContext: formatRetrievedDocuments(reranked) }
        } catch {
          return { retrievalResults: [], retrievalError: 'Busca de NPCs falhou' }
        }
      }

      case 'search_locations': {
        const query = slots.topic ?? state.message
        try {
          const docs = await deps.vectorRetriever.search(query, 5, { type: 'location' })
          const reranked = rerankDocuments(docs, slots, intent)
          return { retrievalResults: reranked, aggregatedContext: formatRetrievedDocuments(reranked) }
        } catch {
          return { retrievalResults: [], retrievalError: 'Busca de locais falhou' }
        }
      }

      default:
        return { retrievalResults: [], aggregatedContext: undefined }
    }
  }
}
