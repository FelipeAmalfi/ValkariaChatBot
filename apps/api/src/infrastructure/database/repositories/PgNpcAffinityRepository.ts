import type pg from 'pg'
import { RepositoryError } from '../../../core/domain/errors/AppError.js'
import type {
  AffinityLevel,
  NpcAffinity,
  NpcAffinityRepository,
} from '../../../core/application/ports/NpcAffinityRepository.js'

// Score thresholds per level
const THRESHOLDS: Record<AffinityLevel, number> = {
  none: 0,
  cordial: 20,
  loyal: 50,
  intimate: 80,
}

function scoreToLevel(score: number): AffinityLevel {
  if (score >= THRESHOLDS.intimate) return 'intimate'
  if (score >= THRESHOLDS.loyal) return 'loyal'
  if (score >= THRESHOLDS.cordial) return 'cordial'
  return 'none'
}

function mapRow(row: Record<string, unknown>): NpcAffinity {
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    npcName: row.npc_name as string,
    level: row.level as AffinityLevel,
    score: row.score as number,
    interactionCount: row.interaction_count as number,
    lastInteraction: row.last_interaction ? new Date(row.last_interaction as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export class PgNpcAffinityRepository implements NpcAffinityRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findByPlayerAndNpc(playerId: string, npcName: string): Promise<NpcAffinity | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM npc_affinity WHERE player_id = $1 AND npc_name = $2',
        [playerId, npcName],
      )
      return result.rows[0] ? mapRow(result.rows[0]) : null
    } catch (err) {
      throw new RepositoryError('findByPlayerAndNpc', err)
    }
  }

  async findAllByPlayer(playerId: string): Promise<NpcAffinity[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM npc_affinity WHERE player_id = $1 ORDER BY score DESC',
        [playerId],
      )
      return result.rows.map(mapRow)
    } catch (err) {
      throw new RepositoryError('findAllByPlayer', err)
    }
  }

  async upsert(playerId: string, npcName: string, scoreDelta: number): Promise<NpcAffinity> {
    try {
      const result = await this.pool.query(
        `INSERT INTO npc_affinity (player_id, npc_name, score, level, interaction_count, last_interaction)
         VALUES ($1, $2, GREATEST(0, LEAST(100, $3)), $4, 1, NOW())
         ON CONFLICT (player_id, npc_name) DO UPDATE SET
           score             = GREATEST(0, LEAST(100, npc_affinity.score + $3)),
           level             = $4,
           interaction_count = npc_affinity.interaction_count + 1,
           last_interaction  = NOW(),
           updated_at        = NOW()
         RETURNING *`,
        [playerId, npcName, scoreDelta, scoreToLevel(scoreDelta)],
      )
      // Re-compute level from actual updated score
      const row = result.rows[0] as Record<string, unknown>
      const actualScore = row.score as number
      if (scoreToLevel(actualScore) !== (row.level as string)) {
        await this.pool.query('UPDATE npc_affinity SET level = $1 WHERE id = $2', [
          scoreToLevel(actualScore),
          row.id,
        ])
        row.level = scoreToLevel(actualScore)
      }
      return mapRow(row)
    } catch (err) {
      throw new RepositoryError('upsert', err)
    }
  }

  getLevel(score: number): AffinityLevel {
    return scoreToLevel(score)
  }
}
