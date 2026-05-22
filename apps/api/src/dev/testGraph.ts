import 'dotenv/config'
import * as readline from 'readline'
import { loadEnv } from '../shared/config/env.js'
import { createPgPool, checkPgConnection, closePgPool } from '../infrastructure/database/pgPool.js'
import {
  createNeo4jDriver,
  checkNeo4jConnection,
  closeNeo4jDriver,
} from '../infrastructure/database/neo4jClient.js'
import {
  createRedisClient,
  checkRedisConnection,
  closeRedisClient,
} from '../infrastructure/database/redisClient.js'
import { createContainer } from '../composition/container.js'

const THREAD_ID = 'dev-session-001'

async function main() {
  console.log('ValkáriaChatBot — LangGraph Dev Runner')
  console.log('Conectando à infraestrutura local...\n')

  const env = loadEnv()
  const pgPool = createPgPool(env.DATABASE_URL, env.DATABASE_POOL_SIZE)
  const neo4jDriver = createNeo4jDriver({
    uri: env.NEO4J_URI,
    user: env.NEO4J_USER,
    password: env.NEO4J_PASSWORD,
  })
  const redisClient = createRedisClient(env.REDIS_URL)

  const [pgOk, neo4jOk, redisOk] = await Promise.all([
    checkPgConnection(pgPool),
    checkNeo4jConnection(neo4jDriver),
    checkRedisConnection(redisClient),
  ])

  if (!pgOk) throw new Error('PostgreSQL connection failed')
  if (!neo4jOk) throw new Error('Neo4j connection failed')
  if (!redisOk) throw new Error('Redis connection failed')

  console.log('✓ PostgreSQL  ✓ Neo4j  ✓ Redis\n')
  console.log(`thread_id: ${THREAD_ID}`)
  console.log('Digite sua mensagem e pressione Enter. /exit para sair.\n')

  const { graph } = createContainer(pgPool, neo4jDriver, redisClient, env)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const prompt = () => rl.question('você > ', handleInput)

  const handleInput = async (input: string) => {
    const message = input.trim()
    if (!message) return prompt()
    if (message === '/exit') {
      await shutdown()
      return
    }

    try {
      const result = await graph.invoke(
        { message },
        { configurable: { thread_id: THREAD_ID } },
      )
      console.log(`\nvalkária > ${result.response ?? '(sem resposta)'}\n`)
    } catch (err) {
      console.error('Erro no grafo:', err)
    }

    prompt()
  }

  const shutdown = async () => {
    rl.close()
    await Promise.all([closePgPool(), closeNeo4jDriver(), closeRedisClient()])
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown())
  prompt()
}

main().catch((err) => {
  console.error('Falha ao iniciar:', err)
  process.exit(1)
})
