/**
 * Ingestion script — run with:
 *   pnpm --filter @valkaria/api ingest
 *   tsx src/infrastructure/ingestion/runIngestion.ts
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { loadEnv } from '../../shared/config/env.js'
import { createModelConfig } from '../../shared/config/modelConfig.js'
import { createPgPool, closePgPool } from '../database/pgPool.js'
import { createNeo4jDriver, closeNeo4jDriver } from '../database/neo4jClient.js'
import { OpenRouterProvider } from '../ai/OpenRouterProvider.js'
import { IngestionPipeline } from './IngestionPipeline.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

async function main(): Promise<void> {
  console.log('=== Valkaria Ingestion Pipeline ===')

  // Load and validate environment
  const env = (() => {
    try {
      return loadEnv()
    } catch (err) {
      console.error('Environment validation failed:', err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })()

  // Resolve CSV paths: from apps/api/src/infrastructure/ingestion/ up 5 levels to monorepo root
  const projectRoot = resolve(__dirname, '..', '..', '..', '..', '..')
  const locationsPath = resolve(projectRoot, 'locations.csv')
  const npcsPath = resolve(projectRoot, 'npcs.csv')

  console.log(`Locations CSV: ${locationsPath}`)
  console.log(`NPCs CSV:      ${npcsPath}`)

  // Create connections
  const pgPool = createPgPool(env.DATABASE_URL, env.DATABASE_POOL_SIZE)
  const neo4jDriver = createNeo4jDriver({
    uri: env.NEO4J_URI,
    user: env.NEO4J_USER,
    password: env.NEO4J_PASSWORD,
  })

  const modelConfig = createModelConfig(process.env)
  const aiProvider = new OpenRouterProvider(modelConfig, env.OPENROUTER_API_KEY, env.OPENROUTER_BASE_URL)

  const pipeline = new IngestionPipeline(pgPool, neo4jDriver, aiProvider, env.AI_EMBEDDING_DIMENSIONS)

  let exitCode = 0
  try {
    const result = await pipeline.run(locationsPath, npcsPath)

    console.log('\n=== Ingestion Complete ===')
    console.log(`Locations  — ingested: ${result.locations.ingested}, embeddings: ${result.locations.embeddings}`)
    console.log(`NPCs       — ingested: ${result.npcs.ingested}, embeddings: ${result.npcs.embeddings}`)
    console.log(`Neo4j      — nodes: ${result.neo4j.nodes}, relationships: ${result.neo4j.relationships}`)

    if (result.errors.length > 0) {
      console.warn(`\nErrors (${result.errors.length}):`)
      result.errors.forEach((e, i) => console.warn(`  ${i + 1}. ${e}`))
      exitCode = 1
    } else {
      console.log('\nAll items ingested without errors.')
    }
  } catch (err) {
    console.error('Fatal pipeline error:', err instanceof Error ? err.message : String(err))
    exitCode = 1
  } finally {
    await closePgPool()
    await closeNeo4jDriver()
    console.log('Connections closed.')
  }

  process.exit(exitCode)
}

main()
