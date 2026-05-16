import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import type { RetrievedDocument } from '../../../core/application/ports/VectorRetriever.js'

const NO_PLAYER_CONTEXT = JSON.stringify({
  error: 'Jogador não identificado. Apresente-se primeiro para receber recomendações personalizadas.',
})

function formatDocs(docs: RetrievedDocument[]): string {
  return JSON.stringify(
    docs.map((d) => ({ content: d.content, score: d.score, metadata: d.metadata })),
  )
}

export function recommendationNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const { playerId, slots, message } = state

    if (!playerId) {
      return { aggregatedContext: NO_PLAYER_CONTEXT, retrievalResults: [], lastRecommendedNpcs: [] }
    }

    // 1. Try to load player embedding for profile-based similarity search
    let candidates: RetrievedDocument[]
    try {
      const embeddingResult = await deps.pgPool.query<{ embedding: string }>(
        'SELECT embedding FROM player_embeddings WHERE player_id = $1',
        [playerId],
      )

      if (embeddingResult.rows.length > 0 && embeddingResult.rows[0]) {
        const rawEmbedding = embeddingResult.rows[0].embedding
        // pgvector returns the vector as a string like "[0.1,0.2,...]"
        const embedding = JSON.parse(rawEmbedding) as number[]
        candidates = await deps.vectorRetriever.searchByVector(embedding, 10, { type: 'npc' })
      } else {
        // Fallback: text search using recommendation filters or raw message
        const query = slots.recommendationFilters ?? message
        candidates = await deps.vectorRetriever.search(query, 10, { type: 'npc' })
      }
    } catch {
      const query = slots.recommendationFilters ?? message
      candidates = await deps.vectorRetriever.search(query, 10, { type: 'npc' }).catch(() => [])
    }

    // 2. Load affinities and filter out intimate NPCs
    const affinities = await deps.affinityRepository.findAllByPlayer(playerId).catch(() => [])
    const intimateNames = new Set(
      affinities.filter((a) => a.level === 'intimate').map((a) => a.npcName.toLowerCase()),
    )
    const affinityMap = new Map(affinities.map((a) => [a.npcName.toLowerCase(), a]))

    const filtered = candidates.filter((doc) => {
      const name = (doc.metadata as Record<string, unknown>).name
      return typeof name === 'string' && !intimateNames.has(name.toLowerCase())
    })

    // 3. Apply feedback weights
    const weights = await deps.feedbackRepository.getWeightsByPlayer(playerId).catch(() => new Map<string, number>())

    const adjusted = filtered.map((doc) => {
      const name = ((doc.metadata as Record<string, unknown>).name as string | undefined) ?? ''
      const weight = weights.get(name) ?? weights.get(name.toLowerCase()) ?? 0
      return { ...doc, score: Math.min(1, Math.max(0, doc.score + weight)) }
    })

    // 4. Sort and take top 3
    adjusted.sort((a, b) => b.score - a.score)
    const top3 = adjusted.slice(0, 3)

    // 5. Build affinity context for the narrative node
    let affinityContext = ''
    if (affinities.length) {
      const relevant = affinities.filter((a) => {
        const meta = top3.find((d) => {
          const n = (d.metadata as Record<string, unknown>).name
          return typeof n === 'string' && n.toLowerCase() === a.npcName.toLowerCase()
        })
        return !!meta
      })
      if (relevant.length) {
        affinityContext =
          '\n\nAfinidades atuais com NPCs recomendados: ' +
          JSON.stringify(relevant.map((a) => ({ npc: a.npcName, level: a.level, score: a.score })))
      }
    }

    // Include current affinity context so narrativeResponse knows the player's relationship map
    const fullAffinityContext =
      affinities.length
        ? '\n\nTodas as afinidades do jogador: ' +
          JSON.stringify(
            affinities.map((a) => ({ npc: a.npcName, level: a.level, score: a.score })),
          )
        : ''

    const lastRecommendedNpcs = top3
      .map((d) => (d.metadata as Record<string, unknown>).name as string)
      .filter(Boolean)

    return {
      retrievalResults: top3,
      aggregatedContext: formatDocs(top3) + affinityContext + fullAffinityContext,
      lastRecommendedNpcs,
    }
  }
}
