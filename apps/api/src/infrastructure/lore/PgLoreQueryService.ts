import type pg from 'pg'
import type {
  LoreEntity,
  LoreQueryFilters,
  LoreQueryResult,
  LoreQueryService,
} from '../../core/application/ports/LoreQueryService.js'

const NPC_FIELD_MAP: Record<string, string> = {
  name: 'name',
  description: 'description',
  personality: 'personality',
  location: 'location_name',
  interests: 'interests',
  faction: 'faction',
  role: 'role',
}

const LOCATION_FIELD_MAP: Record<string, string> = {
  name: 'name',
  description: 'full_description',
  short_description: 'short_description',
  services: 'services',
}

const ENTITY_TABLE: Record<LoreEntity, string> = {
  npc: 'characters',
  location: 'locations',
}

const MAX_RESULTS = 50

export class PgLoreQueryService implements LoreQueryService {
  constructor(private readonly pool: pg.Pool) {}

  async query(
    entity: LoreEntity,
    requestedFields: string[],
    filters?: LoreQueryFilters,
  ): Promise<LoreQueryResult> {
    const fieldMap = entity === 'npc' ? NPC_FIELD_MAP : LOCATION_FIELD_MAP
    const table = ENTITY_TABLE[entity]

    const validFields = requestedFields.filter((f) => fieldMap[f])
    if (validFields.length === 0) validFields.push('name')

    const selectCols = [...new Set(validFields.map((f) => fieldMap[f]))]

    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (entity === 'npc') {
      conditions.push(`role = 'npc'`)
    }

    if (filters?.name) {
      conditions.push(`name ILIKE $${idx++}`)
      params.push(`%${filters.name}%`)
    }
    if (filters?.location && entity === 'npc') {
      conditions.push(`location_name ILIKE $${idx++}`)
      params.push(`%${filters.location}%`)
    }
    if (filters?.faction) {
      conditions.push(`faction ILIKE $${idx++}`)
      params.push(`%${filters.faction}%`)
    }
    if (filters?.interest && entity === 'npc') {
      conditions.push(`EXISTS (SELECT 1 FROM unnest(interests) AS i WHERE i ILIKE $${idx++})`)
      params.push(`%${filters.interest}%`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT ${selectCols.join(', ')} FROM ${table} ${where} ORDER BY name LIMIT ${MAX_RESULTS}`

    const result = await this.pool.query(sql, params)

    const colToField: Record<string, string> = {}
    for (const f of validFields) {
      const col = fieldMap[f]
      if (col) colToField[col] = f
    }

    const data = result.rows.map((row) => {
      const mapped: Record<string, unknown> = {}
      for (const [col, val] of Object.entries(row)) {
        mapped[colToField[col] ?? col] = val
      }
      return mapped
    })

    return { entity, fields: validFields, data }
  }
}
