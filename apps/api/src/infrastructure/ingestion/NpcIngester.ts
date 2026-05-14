import type pg from 'pg'
import type { RawNpc } from './CsvParser.js'

export interface IngestedNpc {
  id: string
  name: string
}

export class NpcIngester {
  constructor(private readonly pool: pg.Pool) {}

  async ingest(npcs: RawNpc[]): Promise<{ results: IngestedNpc[]; errors: string[] }> {
    const results: IngestedNpc[] = []
    const errors: string[] = []

    for (const npc of npcs) {
      try {
        const result = await this.pool.query<{ id: string; name: string }>(
          `INSERT INTO characters (
             name,
             description,
             role,
             faction,
             location_name,
             likes,
             dislikes,
             benefits_cordial,
             benefits_loyal,
             benefits_intimate,
             last_demand
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (name) DO UPDATE SET
             description       = EXCLUDED.description,
             role              = EXCLUDED.role,
             faction           = EXCLUDED.faction,
             location_name     = EXCLUDED.location_name,
             likes             = EXCLUDED.likes,
             dislikes          = EXCLUDED.dislikes,
             benefits_cordial  = EXCLUDED.benefits_cordial,
             benefits_loyal    = EXCLUDED.benefits_loyal,
             benefits_intimate = EXCLUDED.benefits_intimate,
             last_demand       = EXCLUDED.last_demand,
             updated_at        = NOW()
           RETURNING id, name`,
          [
            npc.name,
            npc.description,
            'npc',
            'neutral',
            npc.location,
            npc.likes,
            npc.dislikes,
            npc.benefits_cordial,
            npc.benefits_loyal,
            npc.benefits_intimate,
            npc.last_demand,
          ],
        )

        const row = result.rows[0]
        if (row) {
          results.push({ id: row.id, name: row.name })
          console.log(`  [npc] upserted: ${row.name}`)
        }
      } catch (err) {
        const msg = `NpcIngester: failed to upsert "${npc.name}": ${err instanceof Error ? err.message : String(err)}`
        console.error(msg)
        errors.push(msg)
      }
    }

    return { results, errors }
  }
}
