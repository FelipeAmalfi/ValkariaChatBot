export type AffinityLevel = 'none' | 'cordial' | 'loyal' | 'intimate'

export interface NpcAffinity {
  id: string
  playerId: string
  npcName: string
  level: AffinityLevel
  score: number
  interactionCount: number
  lastInteraction: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NpcAffinityRepository {
  findByPlayerAndNpc(playerId: string, npcName: string): Promise<NpcAffinity | null>
  findAllByPlayer(playerId: string): Promise<NpcAffinity[]>
  upsert(playerId: string, npcName: string, scoreDelta: number): Promise<NpcAffinity>
  getLevel(score: number): AffinityLevel
}
