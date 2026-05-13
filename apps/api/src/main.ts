import 'dotenv/config'
import { loadEnv } from './shared/config/env.js'
import { createPgPool, checkPgConnection, closePgPool } from './infrastructure/database/pgPool.js'
import {
  createNeo4jDriver,
  checkNeo4jConnection,
  closeNeo4jDriver,
} from './infrastructure/database/neo4jClient.js'
import {
  createRedisClient,
  checkRedisConnection,
  closeRedisClient,
} from './infrastructure/database/redisClient.js'
import { createContainer } from './composition/container.js'
import { createServer } from './interface/http/server.js'

async function bootstrap() {
  const env = loadEnv()

  // Initialize infrastructure connections
  const pgPool = createPgPool(env.DATABASE_URL, env.DATABASE_POOL_SIZE)
  const neo4jDriver = createNeo4jDriver({
    uri: env.NEO4J_URI,
    user: env.NEO4J_USER,
    password: env.NEO4J_PASSWORD,
  })
  const redisClient = createRedisClient(env.REDIS_URL)

  // Verify connections
  const [pgOk, neo4jOk, redisOk] = await Promise.all([
    checkPgConnection(pgPool),
    checkNeo4jConnection(neo4jDriver),
    checkRedisConnection(redisClient),
  ])

  if (!pgOk) throw new Error('PostgreSQL connection failed')
  if (!neo4jOk) throw new Error('Neo4j connection failed')
  if (!redisOk) throw new Error('Redis connection failed')

  // Build DI container
  const container = createContainer(pgPool, neo4jDriver, redisClient, env)

  // Create and start Fastify server
  const server = await createServer(env, container)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}. Shutting down gracefully...`)
    await server.close()
    await Promise.all([closePgPool(), closeNeo4jDriver(), closeRedisClient()])
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  await server.listen({ port: env.API_PORT, host: env.API_HOST })
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
