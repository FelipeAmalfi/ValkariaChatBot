import type pg from 'pg'
import type { ID } from '@valkaria/shared'
import type { Player, CreatePlayerInput } from '../../../core/domain/entities/Player.js'
import { ConflictError, RepositoryError } from '../../../core/domain/errors/AppError.js'
import type { PlayerRepository } from '../../../core/application/ports/PlayerRepository.js'

function mapRow(row: Record<string, unknown>): Player {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    class: row['class'] as string,
    race: row['race'] as string,
    background: row['background'] as string,
    personality: row['personality'] as string,
    interests: row['interests'] as string,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  }
}

export class PgPlayerRepository implements PlayerRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findById(id: ID): Promise<Player | null> {
    try {
      const result = await this.pool.query('SELECT * FROM players WHERE id = $1 LIMIT 1', [id])
      if (result.rows.length === 0) return null
      return mapRow(result.rows[0] as Record<string, unknown>)
    } catch (err) {
      throw new RepositoryError('findById', err instanceof Error ? err : undefined)
    }
  }

  async findByName(name: string): Promise<Player | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM players WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [name],
      )
      if (result.rows.length === 0) return null
      return mapRow(result.rows[0] as Record<string, unknown>)
    } catch (err) {
      throw new RepositoryError('findByName', err instanceof Error ? err : undefined)
    }
  }

  async existsByName(name: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM players WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [name],
      )
      return result.rows.length > 0
    } catch (err) {
      throw new RepositoryError('existsByName', err instanceof Error ? err : undefined)
    }
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    try {
      const result = await this.pool.query(
        `INSERT INTO players (name, class, race, background, personality, interests)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [input.name, input.class, input.race, input.background, input.personality, input.interests],
      )
      return mapRow(result.rows[0] as Record<string, unknown>)
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === '23505') {
        throw new ConflictError(`Player name '${input.name}' is already taken`)
      }
      throw new RepositoryError('create', err instanceof Error ? err : undefined)
    }
  }
}
