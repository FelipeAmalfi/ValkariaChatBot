export interface RecommendationFeedbackRepository {
  save(playerId: string, npcName: string, helpful: boolean): Promise<void>
  // Returns map of npcName → score adjustment (clamped to [-0.40, +0.30])
  getWeightsByPlayer(playerId: string): Promise<Map<string, number>>
}
