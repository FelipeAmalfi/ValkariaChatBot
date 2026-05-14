import type { NpcAffinityRepository } from '../../../core/application/ports/NpcAffinityRepository.js'
import type { Tool, ToolOutput } from './types.js'

interface Input {
  playerId: string
  npcName?: string
  [key: string]: unknown
}

export function createGetAffinityTool(affinityRepository: NpcAffinityRepository): Tool<Input> {
  return {
    name: 'getAffinity',
    description: 'Retorna o nível de afinidade do player com um NPC ou com todos os NPCs',
    async execute(input: Input, correlationId: string): Promise<ToolOutput> {
      try {
        if (input.npcName) {
          const affinity = await affinityRepository.findByPlayerAndNpc(input.playerId, input.npcName)
          return { success: true, data: affinity, correlationId }
        }
        const allAffinities = await affinityRepository.findAllByPlayer(input.playerId)
        return { success: true, data: allAffinities, correlationId }
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
