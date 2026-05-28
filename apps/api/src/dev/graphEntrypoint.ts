import { loadEnv } from '../shared/config/env.js'
import { createPgPool } from '../infrastructure/database/pgPool.js'
import { createNeo4jDriver } from '../infrastructure/database/neo4jClient.js'
import { createRedisClient } from '../infrastructure/database/redisClient.js'
import { createContainer } from '../composition/container.js'

const env = loadEnv()

const pgPool = createPgPool(env.DATABASE_URL, env.DATABASE_POOL_SIZE)
const neo4jDriver = createNeo4jDriver({
  uri: env.NEO4J_URI,
  user: env.NEO4J_USER,
  password: env.NEO4J_PASSWORD,
})
const redisClient = createRedisClient(env.REDIS_URL)

export const { graph } = createContainer(pgPool, neo4jDriver, redisClient, env)
