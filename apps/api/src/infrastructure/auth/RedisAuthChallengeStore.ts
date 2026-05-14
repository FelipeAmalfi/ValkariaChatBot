import type { Redis } from 'ioredis'
import type { AuthChallenge, AuthChallengeStore } from '../../core/application/ports/AuthChallengeStore.js'
import { InfrastructureError } from '../../core/domain/errors/AppError.js'

const KEY_PREFIX = 'auth:challenge:'

export class RedisAuthChallengeStore implements AuthChallengeStore {
  constructor(private readonly redis: Redis) {}

  async save(challenge: AuthChallenge, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(
        `${KEY_PREFIX}${challenge.challengeId}`,
        JSON.stringify(challenge),
        'EX',
        ttlSeconds,
      )
    } catch (err) {
      throw new InfrastructureError('Failed to save auth challenge')
    }
  }

  async find(challengeId: string): Promise<AuthChallenge | null> {
    try {
      const raw = await this.redis.get(`${KEY_PREFIX}${challengeId}`)
      if (!raw) return null
      return JSON.parse(raw) as AuthChallenge
    } catch (err) {
      throw new InfrastructureError('Failed to retrieve auth challenge')
    }
  }

  async delete(challengeId: string): Promise<void> {
    try {
      await this.redis.del(`${KEY_PREFIX}${challengeId}`)
    } catch (err) {
      throw new InfrastructureError('Failed to delete auth challenge')
    }
  }
}
