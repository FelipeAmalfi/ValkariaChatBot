import type pg from 'pg'
import type { AIProvider } from '../../core/application/ports/AIProvider.js'
import type { RawLocation, RawNpc } from './CsvParser.js'
import type { IngestedLocation } from './LocationIngester.js'
import type { IngestedNpc } from './NpcIngester.js'

const BATCH_SIZE = 10
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

const COLLECTION_NPCS = 'valkaria_npcs'
const COLLECTION_LOCATIONS = 'valkaria_locations'

interface EmbedTarget {
  customId: string
  text: string
  document: string
  collection: string
  metadata: Record<string, unknown>
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function embedWithRetry(
  aiProvider: AIProvider,
  texts: string[],
  attempt = 1,
): Promise<number[][]> {
  try {
    const response = await aiProvider.embed({ input: texts })
    return response.embeddings
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err
    console.warn(`  [embedding] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`)
    await sleep(RETRY_DELAY_MS * attempt)
    return embedWithRetry(aiProvider, texts, attempt + 1)
  }
}

export class EmbeddingIngester {
  constructor(
    private readonly pool: pg.Pool,
    private readonly aiProvider: AIProvider,
    private readonly embeddingDimensions: number,
  ) {}

  async ingestNpcs(
    npcs: RawNpc[],
    ingestedNpcs: IngestedNpc[],
  ): Promise<{ count: number; errors: string[] }> {
    const idByName = new Map(ingestedNpcs.map((n) => [n.name, n.id]))

    const targets: EmbedTarget[] = npcs
      .map((npc) => {
        const id = idByName.get(npc.name)
        if (!id) return null

        const text = [
          npc.name,
          npc.description,
          npc.likes.join(' '),
          npc.benefits_cordial,
        ]
          .filter(Boolean)
          .join(' ')

        const document = [
          npc.name,
          npc.description,
          npc.likes.length > 0 ? `Gosta de: ${npc.likes.join(', ')}` : '',
          npc.dislikes.length > 0 ? `Não gosta de: ${npc.dislikes.join(', ')}` : '',
          npc.benefits_cordial ? `Benefícios cordial: ${npc.benefits_cordial}` : '',
          npc.benefits_loyal ? `Benefícios leal: ${npc.benefits_loyal}` : '',
          npc.benefits_intimate ? `Benefícios íntimo: ${npc.benefits_intimate}` : '',
          npc.last_demand ? `Última demanda: ${npc.last_demand}` : '',
        ]
          .filter(Boolean)
          .join('\n')

        const metadata: Record<string, unknown> = {
          name: npc.name,
          type: 'npc',
          location_name: npc.location,
          likes: npc.likes,
          dislikes: npc.dislikes,
        }

        return { customId: id, text, document, collection: COLLECTION_NPCS, metadata }
      })
      .filter((t): t is EmbedTarget => t !== null)

    return this.embedAndStore(targets)
  }

  async ingestLocations(
    locations: RawLocation[],
    ingestedLocations: IngestedLocation[],
  ): Promise<{ count: number; errors: string[] }> {
    const idByName = new Map(ingestedLocations.map((l) => [l.name, l.id]))

    const targets: EmbedTarget[] = locations
      .map((loc) => {
        const id = idByName.get(loc.name)
        if (!id) return null

        const text = [loc.name, loc.short_description, loc.services]
          .filter(Boolean)
          .join(' ')

        const document = [
          loc.name,
          loc.short_description,
          loc.full_description,
          loc.services ? `Serviços: ${loc.services}` : '',
          loc.honors ? `Honrarias: ${loc.honors}` : '',
          loc.npcs.length > 0 ? `NPCs: ${loc.npcs.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n')

        const metadata: Record<string, unknown> = {
          name: loc.name,
          type: 'location',
        }

        return { customId: id, text, document, collection: COLLECTION_LOCATIONS, metadata }
      })
      .filter((t): t is EmbedTarget => t !== null)

    return this.embedAndStore(targets)
  }

  private async embedAndStore(
    targets: EmbedTarget[],
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = []
    let count = 0

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE)
      const texts = batch.map((t) => t.text)

      console.log(
        `  [embedding] processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)...`,
      )

      let embeddings: number[][]
      try {
        embeddings = await embedWithRetry(this.aiProvider, texts)
      } catch (err) {
        const msg = `EmbeddingIngester: batch ${Math.floor(i / BATCH_SIZE) + 1} failed after ${MAX_RETRIES} attempts: ${err instanceof Error ? err.message : String(err)}`
        console.error(msg)
        errors.push(msg)
        continue
      }

      for (let j = 0; j < batch.length; j++) {
        const target = batch[j]!
        const embedding = embeddings[j]

        if (!embedding || embedding.length === 0) {
          const msg = `EmbeddingIngester: empty embedding for "${target.metadata['name'] as string}"`
          console.error(msg)
          errors.push(msg)
          continue
        }

        try {
          await this.pool.query(
            `INSERT INTO langchain_pg_embedding
               (collection_id, embedding, document, cmetadata, custom_id)
             VALUES
               ($1, $2::vector, $3, $4, $5)
             ON CONFLICT (custom_id) DO UPDATE SET
               embedding     = EXCLUDED.embedding,
               document      = EXCLUDED.document,
               cmetadata     = EXCLUDED.cmetadata,
               collection_id = EXCLUDED.collection_id`,
            [
              target.collection,
              `[${embedding.join(',')}]`,
              target.document,
              JSON.stringify(target.metadata),
              target.customId,
            ],
          )
          count++
          console.log(`  [embedding] stored: ${target.metadata['name'] as string}`)
        } catch (err) {
          const msg = `EmbeddingIngester: failed to store embedding for "${target.metadata['name'] as string}": ${err instanceof Error ? err.message : String(err)}`
          console.error(msg)
          errors.push(msg)
        }
      }
    }

    return { count, errors }
  }
}
