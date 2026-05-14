import type { Role } from '../../domain/value-objects/Role.js'

export interface AffinitySnapshot {
  npcName: string
  level: 'none' | 'cordial' | 'loyal' | 'intimate'
  score: number
}

export interface SessionContext {
  threadId: string
  playerId?: string
  playerName?: string
  currentRole: Role | 'guest'
  validationState: 'pending' | 'challenged' | 'validated' | 'denied'
  challengeId?: string           // Redis challenge key awaiting answer
  affinityContext: AffinitySnapshot[]
  memorySummary?: string
  recentContext: string[]        // last N user messages (sliding window)
  currentLocation?: string
  recommendationContext?: string
  lastUpdated: string            // ISO timestamp
}

export type SessionContextPatch = Partial<Omit<SessionContext, 'threadId' | 'lastUpdated'>>

export interface SessionContextStore {
  load(threadId: string): Promise<SessionContext | null>
  save(ctx: SessionContext): Promise<void>
  patch(threadId: string, patch: SessionContextPatch): Promise<SessionContext>
  delete(threadId: string): Promise<void>
  exists(threadId: string): Promise<boolean>
}
