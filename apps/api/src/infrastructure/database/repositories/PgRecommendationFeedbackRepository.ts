import type pg from 'pg'
import { RepositoryError } from '../../../core/domain/errors/AppError.js'
import type { RecommendationFeedbackRepository } from '../../../core/application/ports/RecommendationFeedbackRepository.js'

const HELPFUL_WEIGHT = 0.15
const UNHELPFUL_WEIGHT = -0.20
const MIN_WEIGHT = -0.40
const MAX_WEIGHT = 0.30

export class PgRecommendationFeedbackRepository implements RecommendationFeedbackRepository {
  constructor(private readonly pool: pg.Pool) {}

  async save(playerId: string, npcName: string, helpful: boolean): Promise<void> {
    try {
      await this.pool.query(
        'INSERT INTO recommendation_feedback (player_id, npc_name, helpful) VALUES ($1, $2, $3)',
        [playerId, npcName, helpful],
      )
    } catch (err) {
      throw new RepositoryError('save', err)
    }
  }

  async getWeightsByPlayer(playerId: string): Promise<Map<string, number>> {
    try {
      const result = await this.pool.query<{ npc_name: string; raw_weight: string }>(
        `SELECT npc_name,
                SUM(CASE WHEN helpful THEN $2 ELSE $3 END) AS raw_weight
         FROM recommendation_feedback
         WHERE player_id = $1
         GROUP BY npc_name`,
        [playerId, HELPFUL_WEIGHT, UNHELPFUL_WEIGHT],
      )

      const weights = new Map<string, number>()
      for (const row of result.rows) {
        const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, parseFloat(row.raw_weight)))
        weights.set(row.npc_name, clamped)
      }
      return weights
    } catch (err) {
      throw new RepositoryError('getWeightsByPlayer', err)
    }
  }
}
