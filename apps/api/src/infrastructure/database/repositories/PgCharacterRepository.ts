import type pg from 'pg'
import type { ID, Pagination, PaginationInput } from '@valkaria/shared'
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '../../../core/domain/entities/Character.js'
import { NotFoundError, RepositoryError } from '../../../core/domain/errors/AppError.js'
import type {
  CharacterFilters,
  CharacterRepository,
} from '../../../core/application/ports/CharacterRepository.js'

function mapRow(row: Record<string, unknown>): Character {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: (row['description'] as string | null) ?? null,
    role: row['role'] as Character['role'],
    faction: (row['faction'] as string | null) ?? null,
    locationId: (row['location_id'] as string | null) ?? null,
    metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  }
}

export class PgCharacterRepository implements CharacterRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findById(id: ID): Promise<Character | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM characters WHERE id = $1',
        [id],
      )
      return result.rows[0] ? mapRow(result.rows[0]) : null
    } catch (err) {
      throw new RepositoryError('findById', err)
    }
  }

  async findByName(name: string): Promise<Character | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM characters WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [name],
      )
      return result.rows[0] ? mapRow(result.rows[0]) : null
    } catch (err) {
      throw new RepositoryError('findByName', err)
    }
  }

  async findAll(filters?: CharacterFilters, pagination?: PaginationInput): Promise<Character[]> {
    try {
      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (filters?.faction) {
        conditions.push(`faction = $${idx++}`)
        params.push(filters.faction)
      }
      if (filters?.role) {
        conditions.push(`role = $${idx++}`)
        params.push(filters.role)
      }
      if (filters?.locationId) {
        conditions.push(`location_id = $${idx++}`)
        params.push(filters.locationId)
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limit = pagination?.pageSize ?? 50
      const offset = ((pagination?.page ?? 1) - 1) * limit

      params.push(limit, offset)
      const result = await this.pool.query(
        `SELECT * FROM characters ${where} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx}`,
        params,
      )
      return result.rows.map(mapRow)
    } catch (err) {
      throw new RepositoryError('findAll', err)
    }
  }

  async count(filters?: CharacterFilters): Promise<number> {
    try {
      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (filters?.faction) { conditions.push(`faction = $${idx++}`); params.push(filters.faction) }
      if (filters?.role) { conditions.push(`role = $${idx++}`); params.push(filters.role) }
      if (filters?.locationId) { conditions.push(`location_id = $${idx++}`); params.push(filters.locationId) }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const result = await this.pool.query(`SELECT COUNT(*) FROM characters ${where}`, params)
      return parseInt(result.rows[0]?.count ?? '0', 10)
    } catch (err) {
      throw new RepositoryError('count', err)
    }
  }

  async findAllPaginated(
    filters?: CharacterFilters,
    pagination?: PaginationInput,
  ): Promise<{ data: Character[]; pagination: Pagination }> {
    const page = pagination?.page ?? 1
    const pageSize = pagination?.pageSize ?? 20
    const [data, total] = await Promise.all([
      this.findAll(filters, { page, pageSize }),
      this.count(filters),
    ])
    return { data, pagination: { page, pageSize, total } }
  }

  async create(input: CreateCharacterInput): Promise<Character> {
    try {
      const result = await this.pool.query(
        `INSERT INTO characters (name, description, role, faction, location_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.name,
          input.description ?? null,
          input.role,
          input.faction ?? null,
          input.locationId ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      )
      return mapRow(result.rows[0])
    } catch (err) {
      throw new RepositoryError('create', err)
    }
  }

  async update(id: ID, input: UpdateCharacterInput): Promise<Character> {
    const sets: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (input.name !== undefined) { sets.push(`name = $${idx++}`); params.push(input.name) }
    if (input.description !== undefined) { sets.push(`description = $${idx++}`); params.push(input.description) }
    if (input.role !== undefined) { sets.push(`role = $${idx++}`); params.push(input.role) }
    if (input.faction !== undefined) { sets.push(`faction = $${idx++}`); params.push(input.faction) }
    if (input.locationId !== undefined) { sets.push(`location_id = $${idx++}`); params.push(input.locationId) }
    if (input.metadata !== undefined) { sets.push(`metadata = $${idx++}`); params.push(JSON.stringify(input.metadata)) }

    if (sets.length === 0) {
      const existing = await this.findById(id)
      if (!existing) throw new NotFoundError('Character', id)
      return existing
    }

    params.push(id)
    try {
      const result = await this.pool.query(
        `UPDATE characters SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params,
      )
      if (!result.rows[0]) throw new NotFoundError('Character', id)
      return mapRow(result.rows[0])
    } catch (err) {
      if (err instanceof NotFoundError) throw err
      throw new RepositoryError('update', err)
    }
  }

  async delete(id: ID): Promise<void> {
    try {
      const result = await this.pool.query('DELETE FROM characters WHERE id = $1', [id])
      if (result.rowCount === 0) throw new NotFoundError('Character', id)
    } catch (err) {
      if (err instanceof NotFoundError) throw err
      throw new RepositoryError('delete', err)
    }
  }
}
