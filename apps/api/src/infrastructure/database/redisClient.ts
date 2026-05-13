import { Redis } from 'ioredis'
import { InfrastructureError } from '../../core/domain/errors/AppError.js'

let redisClient: Redis | null = null

export function createRedisClient(url: string): Redis {
  if (redisClient) return redisClient

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) return null
      return Math.min(times * 200, 2_000)
    },
    lazyConnect: true,
  })

  client.on('error', (err: Error) => {
    console.error('Redis client error:', err)
  })

  redisClient = client
  return redisClient
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new InfrastructureError('Redis client not initialized. Call createRedisClient() first.')
  }
  return redisClient
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

export async function checkRedisConnection(client: Redis): Promise<boolean> {
  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
