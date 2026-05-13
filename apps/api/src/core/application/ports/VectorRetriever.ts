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
  [key: string]: unknown
}

export interface VectorRetriever {
  search(
    query: string,
    topK?: number,
    filters?: VectorSearchFilters,
  ): Promise<RetrievedDocument[]>
  addDocuments(documents: Array<{ id: string; content: string; metadata: Record<string, unknown> }>): Promise<void>
  ensureTable(): Promise<void>
}
