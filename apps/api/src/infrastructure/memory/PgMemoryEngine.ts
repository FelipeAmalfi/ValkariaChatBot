import type pg from 'pg'
import type { AIProvider } from '../../core/application/ports/AIProvider.js'
import type { SessionContextStore } from '../../core/application/ports/SessionContextStore.js'
import type { MemoryEngine, MemoryEntry } from '../../core/application/ports/MemoryEngine.js'
import { RepositoryError } from '../../core/domain/errors/AppError.js'

const MAX_SHORT_TERM = 10       // últimas N mensagens mantidas no sliding window
const SUMMARIZE_THRESHOLD = 8   // sumariza quando short-term atinge este tamanho

const SUMMARY_SYSTEM_PROMPT = `Você é um assistente de memória para um chatbot de RPG ambientado em Valkária.
Sua tarefa é criar um resumo conciso (máximo 3 frases) do contexto conversacional fornecido.
Foque em: nome do personagem, NPCs mencionados, locais visitados, e contexto narrativo relevante.
Responda apenas com o resumo, sem introdução ou formatação adicional.`

export class PgMemoryEngine implements MemoryEngine {
  constructor(
    private readonly pool: pg.Pool,
    private readonly aiProvider: AIProvider,
    private readonly sessionStore: SessionContextStore,
  ) {}

  async appendToShortTerm(threadId: string, message: string): Promise<string[]> {
    const ctx = await this.sessionStore.load(threadId)
    const current = ctx?.recentContext ?? []
    const updated = [...current, message].slice(-MAX_SHORT_TERM)

    await this.sessionStore.patch(threadId, { recentContext: updated })

    // Auto-summarize when threshold reached
    if (updated.length >= SUMMARIZE_THRESHOLD) {
      const playerId = ctx?.playerId
      await this.summarize(threadId, playerId, updated).catch(() => {
        // summarization failure is non-fatal
      })
    }

    return updated
  }

  async loadSummary(threadId: string): Promise<MemoryEntry | null> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM memory_summaries WHERE thread_id = $1 ORDER BY updated_at DESC LIMIT 1`,
        [threadId],
      )
      if (!result.rows[0]) return null
      const row = result.rows[0] as Record<string, unknown>
      return {
        threadId: row.thread_id as string,
        playerId: row.player_id as string | undefined,
        summary: row.summary as string,
        turnCount: row.turn_count as number,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      }
    } catch (err) {
      throw new RepositoryError('loadSummary', err)
    }
  }

  async summarize(
    threadId: string,
    playerId: string | undefined,
    recentMessages: string[],
  ): Promise<MemoryEntry> {
    const conversation = recentMessages.join('\n')
    const completion = await this.aiProvider.complete({
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: conversation },
      ],
      task: 'summarization',
      temperature: 0.3,
      maxTokens: 200,
    })

    const summary = completion.content.trim()

    try {
      // Check if a summary already exists for this thread
      const existing = await this.pool.query(
        'SELECT id FROM memory_summaries WHERE thread_id = $1 LIMIT 1',
        [threadId],
      )

      let result
      if (existing.rows[0]) {
        result = await this.pool.query(
          `UPDATE memory_summaries SET
             summary    = $1,
             player_id  = COALESCE($2, player_id),
             turn_count = turn_count + $3,
             updated_at = NOW()
           WHERE thread_id = $4
           RETURNING *`,
          [summary, playerId ?? null, recentMessages.length, threadId],
        )
      } else {
        result = await this.pool.query(
          `INSERT INTO memory_summaries (thread_id, player_id, summary, turn_count)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [threadId, playerId ?? null, summary, recentMessages.length],
        )
      }
      const row = result.rows[0] as Record<string, unknown>
      const entry: MemoryEntry = {
        threadId: row.thread_id as string,
        playerId: row.player_id as string | undefined,
        summary: row.summary as string,
        turnCount: row.turn_count as number,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      }

      // Update session with summary
      await this.sessionStore.patch(threadId, { memorySummary: summary })

      return entry
    } catch (err) {
      throw new RepositoryError('summarize', err)
    }
  }

  async getMemoryBlock(threadId: string): Promise<string> {
    const ctx = await this.sessionStore.load(threadId)
    const summary = ctx?.memorySummary
    const recent = ctx?.recentContext ?? []

    const parts: string[] = []
    if (summary) parts.push(`Resumo anterior: ${summary}`)
    if (recent.length > 0) parts.push(`Contexto recente:\n${recent.slice(-3).join('\n')}`)

    return parts.join('\n\n')
  }
}
