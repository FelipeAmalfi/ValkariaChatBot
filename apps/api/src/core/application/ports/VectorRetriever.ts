export interface RetrievedDocument {
  id: string
  content: string
  score: number
  metadata: Record<string, unknown>
}

export interface VectorSearchFilters {
  faction?: string
  role?: string
  locationId?: string
  type?: string        // 'npc' | 'location'
  location_name?: string
  [key: string]: unknown
}

export interface VectorRetriever {
  /** Full-text semantic search — embeds query internally and calls searchByVector */
  search(query: string, topK?: number, filters?: VectorSearchFilters): Promise<RetrievedDocument[]>

  /** Low-level vector search — accepts pre-computed embedding */
  searchByVector(
    embedding: number[],
    topK?: number,
    filters?: VectorSearchFilters,
  ): Promise<RetrievedDocument[]>

  /** Upsert documents with pre-computed embeddings */
  addDocumentsWithEmbeddings(
    documents: Array<{
      id: string
      content: string
      metadata: Record<string, unknown>
      embedding: number[]
    }>,
  ): Promise<void>

  ensureTable(): Promise<void>
}
