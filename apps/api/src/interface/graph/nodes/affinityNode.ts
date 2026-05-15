import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

export function affinityNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const { sessionContext, slots } = state
    const playerId = sessionContext?.playerId
    const role = sessionContext?.currentRole
    const targetNpc = slots.affinityTarget

    if (!playerId) {
      return {
        retrievalResults: [],
        aggregatedContext: JSON.stringify({ error: 'Identidade não verificada. Informe quem você é primeiro.' }),
      }
    }

    try {
      if (targetNpc) {
        const affinity = await deps.affinityRepository.findByPlayerAndNpc(playerId, targetNpc)
        const data = affinity
          ? { npcName: affinity.npcName, level: affinity.level, score: affinity.score }
          : { npcName: targetNpc, level: 'none', score: 0 }

        if (role === 'DM') {
          data.score = affinity?.score ?? 0
        }

        return {
          retrievalResults: [data],
          aggregatedContext: JSON.stringify({ affinity: data }),
        }
      }

      const affinities = await deps.affinityRepository.findAllByPlayer(playerId)
      const data = affinities.map((a) => ({
        npcName: a.npcName,
        level: a.level,
        score: role === 'DM' ? a.score : undefined,
      }))

      return {
        retrievalResults: data,
        aggregatedContext: JSON.stringify({ affinities: data }),
      }
    } catch {
      return {
        retrievalResults: [],
        retrievalError: 'Falha ao consultar afinidades.',
      }
    }
  }
}
