import type { ID } from '@valkaria/shared'
import type { ChallengeField } from '../../domain/entities/Player.js'

export interface AuthChallenge {
  challengeId: string
  playerId: ID
  fieldContent: string
  question: string
  fieldEmbedding: number[]
  field: ChallengeField
  expiresAt: number
}

export interface AuthChallengeStore {
  save(challenge: AuthChallenge, ttlSeconds: number): Promise<void>
  find(challengeId: string): Promise<AuthChallenge | null>
  delete(challengeId: string): Promise<void>
}
