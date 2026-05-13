import { MemorySaver } from '@langchain/langgraph'
import type pg from 'pg'
import type { Driver as Neo4jDriver } from 'neo4j-driver'
import type { Redis } from 'ioredis'
import type { Env } from '../shared/config/env.js'
import { createModelConfig } from '../shared/config/modelConfig.js'
import { PgCharacterRepository } from '../infrastructure/database/repositories/PgCharacterRepository.js'
import { PgVectorRetriever } from '../infrastructure/vector/PgVectorRetriever.js'
import { OpenRouterProvider } from '../infrastructure/ai/OpenRouterProvider.js'
import { GetCharacterUseCase } from '../core/application/use-cases/GetCharacterUseCase.js'
import { buildValkáriaGraph } from '../interface/graph/builder.js'
import type { CharacterRepository } from '../core/application/ports/CharacterRepository.js'
import type { VectorRetriever } from '../core/application/ports/VectorRetriever.js'
import type { AIProvider } from '../core/application/ports/AIProvider.js'
import type { ValkáriaGraph } from '../interface/graph/builder.js'

export interface Container {
  // Infrastructure
  pgPool: pg.Pool
  neo4jDriver: Neo4jDriver
  redisClient: Redis

  // Repositories
  characterRepository: CharacterRepository
  vectorRetriever: VectorRetriever

  // AI
  aiProvider: AIProvider

  // Use Cases
  getCharacterUseCase: GetCharacterUseCase

  // Graph
  graph: ValkáriaGraph
  checkpointer: MemorySaver
}

export function createContainer(
  pgPool: pg.Pool,
  neo4jDriver: Neo4jDriver,
  redisClient: Redis,
  env: Env,
): Container {
  const modelConfig = createModelConfig(process.env)

  // Infrastructure
  const characterRepository = new PgCharacterRepository(pgPool)
  const vectorRetriever = new PgVectorRetriever(pgPool, modelConfig.embeddingDimensions)
  const aiProvider = new OpenRouterProvider(
    modelConfig,
    env.OPENROUTER_API_KEY,
    env.OPENROUTER_BASE_URL,
  )

  // Use Cases
  const getCharacterUseCase = new GetCharacterUseCase({ characterRepository })

  // LangGraph — MemorySaver is instantiated once per app process
  const checkpointer = new MemorySaver()
  const graph = buildValkáriaGraph(
    { aiProvider, characterRepository, vectorRetriever, getCharacterUseCase },
    checkpointer,
  )

  return {
    pgPool,
    neo4jDriver,
    redisClient,
    characterRepository,
    vectorRetriever,
    aiProvider,
    getCharacterUseCase,
    graph,
    checkpointer,
  }
}
