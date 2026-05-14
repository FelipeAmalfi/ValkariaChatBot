import type pg from 'pg'
import type { RawLocation } from './CsvParser.js'

export interface IngestedLocation {
  id: string
  name: string
}

export class LocationIngester {
  constructor(private readonly pool: pg.Pool) {}

  async ingest(locations: RawLocation[]): Promise<{ results: IngestedLocation[]; errors: string[] }> {
    const results: IngestedLocation[] = []
    const errors: string[] = []

    for (const loc of locations) {
      try {
        const result = await this.pool.query<{ id: string; name: string }>(
          `INSERT INTO locations (
             name,
             description,
             short_description,
             full_description,
             services,
             honors,
             npc_names
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (name) DO UPDATE SET
             description       = EXCLUDED.description,
             short_description = EXCLUDED.short_description,
             full_description  = EXCLUDED.full_description,
             services          = EXCLUDED.services,
             honors            = EXCLUDED.honors,
             npc_names         = EXCLUDED.npc_names,
             updated_at        = NOW()
           RETURNING id, name`,
          [
            loc.name,
            loc.full_description,
            loc.short_description,
            loc.full_description,
            loc.services,
            loc.honors,
            loc.npcs,
          ],
        )

        const row = result.rows[0]
        if (row) {
          results.push({ id: row.id, name: row.name })
          console.log(`  [location] upserted: ${row.name}`)
        }
      } catch (err) {
        const msg = `LocationIngester: failed to upsert "${loc.name}": ${err instanceof Error ? err.message : String(err)}`
        console.error(msg)
        errors.push(msg)
      }
    }

    return { results, errors }
  }
}
