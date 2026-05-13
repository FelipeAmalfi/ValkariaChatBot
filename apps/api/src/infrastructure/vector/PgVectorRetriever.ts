import type pg from 'pg'
import { RepositoryError } from '../../core/domain/errors/AppError.js'
import type {
  RetrievedDocument,
  VectorRetriever,
  VectorSearchFilters,
} from '../../core/application/ports/VectorRetriever.js'

const SCORE_THRESHOLD = 0.3
const TABLE_NAME = 'langchain_pg_embedding'
const DEFAULT_TOP_K = 5

export class PgVectorRetriever implements VectorRetriever {
  constructor(
    private readonly pool: pg.Pool,
    private readonly embeddingDimensions: number,
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
    _query: string,
    topK: number = DEFAULT_TOP_K,
    filters?: VectorSearchFilters,
  ): Promise<RetrievedDocument[]> {
    // Embedding generation happens in the AI layer — this method receives a pre-computed vector.
    // For Phase 2: the caller will pass the embedding vector, not raw text.
    // Returning empty array as placeholder until embeddings are implemented.
    void _query
    void topK
    void filters
    return []
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

  async addDocuments(
    documents: Array<{ id: string; content: string; metadata: Record<string, unknown> }>,
  ): Promise<void> {
    // Embedding generation will be done by the ingestion pipeline in Phase 2.
    // This is a placeholder that stores documents without embeddings for now.
    void documents
    throw new Error(
      'addDocuments requires embedding generation — implement in Phase 2 ingestion script.',
    )
  }
}
