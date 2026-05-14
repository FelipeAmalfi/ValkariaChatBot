import type { Redis } from 'ioredis'
import type {
  SessionContext,
  SessionContextPatch,
  SessionContextStore,
} from '../../core/application/ports/SessionContextStore.js'

const KEY_PREFIX = 'session:ctx:'
const TTL_SECONDS = 60 * 60 * 24 // 24h

function key(threadId: string): string {
  return `${KEY_PREFIX}${threadId}`
}

function buildDefault(threadId: string): SessionContext {
  return {
    threadId,
    currentRole: 'guest',
    validationState: 'pending',
    affinityContext: [],
    recentContext: [],
    lastUpdated: new Date().toISOString(),
  }
}

export class RedisSessionContextStore implements SessionContextStore {
  constructor(private readonly redis: Redis) {}

  async load(threadId: string): Promise<SessionContext | null> {
    const raw = await this.redis.get(key(threadId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as SessionContext
    } catch {
      return null
    }
  }

  async save(ctx: SessionContext): Promise<void> {
    const updated: SessionContext = { ...ctx, lastUpdated: new Date().toISOString() }
    await this.redis.set(key(ctx.threadId), JSON.stringify(updated), 'EX', TTL_SECONDS)
  }

  async patch(threadId: string, patch: SessionContextPatch): Promise<SessionContext> {
    const existing = (await this.load(threadId)) ?? buildDefault(threadId)
    const updated: SessionContext = {
      ...existing,
      ...patch,
      threadId,
      lastUpdated: new Date().toISOString(),
    }
    await this.redis.set(key(threadId), JSON.stringify(updated), 'EX', TTL_SECONDS)
    return updated
  }

  async delete(threadId: string): Promise<void> {
    await this.redis.del(key(threadId))
  }

  async exists(threadId: string): Promise<boolean> {
    const count = await this.redis.exists(key(threadId))
    return count > 0
  }
}
