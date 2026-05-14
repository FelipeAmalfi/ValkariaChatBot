export interface MemoryEntry {
  threadId: string
  playerId?: string
  summary: string
  turnCount: number
  createdAt: Date
  updatedAt: Date
}

export interface MemoryEngine {
  /** Append a new user message to the short-term sliding window in the session */
  appendToShortTerm(threadId: string, message: string): Promise<string[]>

  /** Load the persisted conversation summary for this thread */
  loadSummary(threadId: string): Promise<MemoryEntry | null>

  /** Generate and persist a new summary from recent messages */
  summarize(threadId: string, playerId: string | undefined, recentMessages: string[]): Promise<MemoryEntry>

  /** Get a formatted memory block for prompt injection */
  getMemoryBlock(threadId: string): Promise<string>
}
