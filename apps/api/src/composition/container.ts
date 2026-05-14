import { MemorySaver } from '@langchain/langgraph'
import type pg from 'pg'
import type { Driver as Neo4jDriver } from 'neo4j-driver'
import type { Redis } from 'ioredis'
import type { Env } from '../shared/config/env.js'
import { createModelConfig } from '../shared/config/modelConfig.js'
import { PgCharacterRepository } from '../infrastructure/database/repositories/PgCharacterRepository.js'
import { PgPlayerRepository } from '../infrastructure/database/repositories/PgPlayerRepository.js'
import { PgVectorRetriever } from '../infrastructure/vector/PgVectorRetriever.js'
import { OpenRouterProvider } from '../infrastructure/ai/OpenRouterProvider.js'
import { RedisAuthChallengeStore } from '../infrastructure/auth/RedisAuthChallengeStore.js'
import { EmbeddingSemanticAuthService } from '../infrastructure/auth/EmbeddingSemanticAuthService.js'
import { JwtTokenService } from '../infrastructure/auth/JwtTokenService.js'
import { GetCharacterUseCase } from '../core/application/use-cases/GetCharacterUseCase.js'
import { RegisterPlayerUseCase } from '../core/application/use-cases/RegisterPlayerUseCase.js'
import { InitiatePlayerAuthUseCase } from '../core/application/use-cases/InitiatePlayerAuthUseCase.js'
import { ValidatePlayerAuthUseCase } from '../core/application/use-cases/ValidatePlayerAuthUseCase.js'
import { AuthenticateDMUseCase } from '../core/application/use-cases/AuthenticateDMUseCase.js'
import { buildValkáriaGraph } from '../interface/graph/builder.js'
import type { CharacterRepository } from '../core/application/ports/CharacterRepository.js'
import type { VectorRetriever } from '../core/application/ports/VectorRetriever.js'
import type { AIProvider } from '../core/application/ports/AIProvider.js'
import type { PlayerRepository } from '../core/application/ports/PlayerRepository.js'
import type { AuthChallengeStore } from '../core/application/ports/AuthChallengeStore.js'
import type { SemanticAuthService } from '../core/application/ports/SemanticAuthService.js'
import type { TokenService } from '../core/application/ports/TokenService.js'
import type { ValkáriaGraph } from '../interface/graph/builder.js'

export interface Container {
  // Infrastructure
  pgPool: pg.Pool
  neo4jDriver: Neo4jDriver
  redisClient: Redis

  // Repositories
  characterRepository: CharacterRepository
  playerRepository: PlayerRepository
  vectorRetriever: VectorRetriever

  // Auth Services
  tokenService: TokenService
  authChallengeStore: AuthChallengeStore
  semanticAuthService: SemanticAuthService

  // AI
  aiProvider: AIProvider

  // Use Cases
  getCharacterUseCase: GetCharacterUseCase
  registerPlayerUseCase: RegisterPlayerUseCase
  initiatePlayerAuthUseCase: InitiatePlayerAuthUseCase
  validatePlayerAuthUseCase: ValidatePlayerAuthUseCase
  authenticateDMUseCase: AuthenticateDMUseCase

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
  const playerRepository = new PgPlayerRepository(pgPool)
  const vectorRetriever = new PgVectorRetriever(pgPool, modelConfig.embeddingDimensions)
  const aiProvider = new OpenRouterProvider(
    modelConfig,
    env.OPENROUTER_API_KEY,
    env.OPENROUTER_BASE_URL,
  )

  // Auth infrastructure
  const tokenService = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN)
  const authChallengeStore = new RedisAuthChallengeStore(redisClient)
  const semanticAuthService = new EmbeddingSemanticAuthService(aiProvider)

  // Use Cases
  const getCharacterUseCase = new GetCharacterUseCase({ characterRepository })
  const registerPlayerUseCase = new RegisterPlayerUseCase({ playerRepository })
  const initiatePlayerAuthUseCase = new InitiatePlayerAuthUseCase({
    playerRepository,
    challengeStore: authChallengeStore,
    semanticAuthService,
    aiProvider,
  })
  const validatePlayerAuthUseCase = new ValidatePlayerAuthUseCase({
    challengeStore: authChallengeStore,
    semanticAuthService,
    tokenService,
    playerRepository,
    semanticThreshold: env.SEMANTIC_AUTH_THRESHOLD,
  })
  const authenticateDMUseCase = new AuthenticateDMUseCase({
    tokenService,
    dmPassword: env.DM_PASSWORD,
  })

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
    playerRepository,
    vectorRetriever,
    tokenService,
    authChallengeStore,
    semanticAuthService,
    aiProvider,
    getCharacterUseCase,
    registerPlayerUseCase,
    initiatePlayerAuthUseCase,
    validatePlayerAuthUseCase,
    authenticateDMUseCase,
    graph,
    checkpointer,
  }
}
