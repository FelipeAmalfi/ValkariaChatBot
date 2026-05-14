import type { NpcAffinityRepository } from '../../../core/application/ports/NpcAffinityRepository.js'
import type { Tool, ToolOutput } from './types.js'

interface Input {
  playerId: string
  npcName: string
  scoreDelta?: number
  [key: string]: unknown
}

const DEFAULT_DELTA = 5
const MAX_DELTA = 20  // previne exploits

export function createIncreaseAffinityTool(affinityRepository: NpcAffinityRepository): Tool<Input> {
  return {
    name: 'increaseAffinity',
    description: 'Aumenta a afinidade do player com um NPC após uma interação positiva',
    async execute(input: Input, correlationId: string): Promise<ToolOutput> {
      try {
        const delta = Math.min(input.scoreDelta ?? DEFAULT_DELTA, MAX_DELTA)
        const updated = await affinityRepository.upsert(input.playerId, input.npcName, delta)
        return { success: true, data: updated, correlationId }
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
