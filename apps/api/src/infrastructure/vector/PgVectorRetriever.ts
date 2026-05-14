import type pg from 'pg'
import { RepositoryError } from '../../core/domain/errors/AppError.js'
import type {
  RetrievedDocument,
  VectorRetriever,
  VectorSearchFilters,
} from '../../core/application/ports/VectorRetriever.js'
import type { AIProvider } from '../../core/application/ports/AIProvider.js'

const SCORE_THRESHOLD = 0.3
const TABLE_NAME = 'langchain_pg_embedding'
const DEFAULT_TOP_K = 5

export class PgVectorRetriever implements VectorRetriever {
  constructor(
    private readonly pool: pg.Pool,
    private readonly embeddingDimensions: number,
    private readonly aiProvider: AIProvider,
  ) {}

  async ensureTable(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          uuid        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          collection_id UUID,
          embedding   vector(${this.embeddingDimensions}),
          document    TEXT,
          cmetadata   JSONB DEFAULT '{}',
          custom_id   VARCHAR(255)
        )
      `)
    } catch (err) {
      throw new RepositoryError('ensureTable', err)
    }
  }

  async search(
    query: string,
    topK: number = DEFAULT_TOP_K,
    filters?: VectorSearchFilters,
  ): Promise<RetrievedDocument[]> {
    try {
      const embeddingResponse = await this.aiProvider.embed({ input: query })
      const embedding = embeddingResponse.embeddings[0]
      if (!embedding || embedding.length === 0) return []
      return this.searchByVector(embedding, topK, filters)
    } catch (err) {
      throw new RepositoryError('search', err)
    }
  }

  async searchByVector(
    embedding: number[],
    topK: number = DEFAULT_TOP_K,
    filters?: VectorSearchFilters,
  ): Promise<RetrievedDocument[]> {
    try {
      const conditions: string[] = []
      const params: unknown[] = [`[${embedding.join(',')}]`, topK]
      let idx = 3

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined) {
            conditions.push(`cmetadata->>'${key}' = $${idx++}`)
            params.push(String(value))
          }
        }
      }

      const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

      const result = await this.pool.query(
        `SELECT
           uuid,
           document,
           cmetadata,
           1 - (embedding <=> $1::vector) AS score
         FROM ${TABLE_NAME}
         WHERE 1 - (embedding <=> $1::vector) >= ${SCORE_THRESHOLD}
           ${where}
         ORDER BY score DESC
         LIMIT $2`,
        params,
      )

      return result.rows.map((row) => ({
        id: row.uuid as string,
        content: row.document as string,
        score: parseFloat(row.score as string),
        metadata: row.cmetadata as Record<string, unknown>,
      }))
    } catch (err) {
      throw new RepositoryError('searchByVector', err)
    }
  }

  async addDocumentsWithEmbeddings(
    documents: Array<{
      id: string
      content: string
      metadata: Record<string, unknown>
      embedding: number[]
    }>,
  ): Promise<void> {
    if (documents.length === 0) return
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      for (const doc of documents) {
        await client.query(
          `INSERT INTO ${TABLE_NAME} (collection_id, embedding, document, cmetadata, custom_id)
           VALUES (NULL, $1::vector, $2, $3::jsonb, $4)
           ON CONFLICT (custom_id) DO UPDATE
             SET embedding = EXCLUDED.embedding,
                 document  = EXCLUDED.document,
                 cmetadata = EXCLUDED.cmetadata`,
          [
            `[${doc.embedding.join(',')}]`,
            doc.content,
            JSON.stringify(doc.metadata),
            doc.id,
          ],
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw new RepositoryError('addDocumentsWithEmbeddings', err)
    } finally {
      client.release()
    }
  }
}
