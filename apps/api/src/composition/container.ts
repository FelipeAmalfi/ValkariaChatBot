import { MemorySaver } from '@langchain/langgraph'
import type pg from 'pg'
import type { Driver as Neo4jDriver } from 'neo4j-driver'
import type { Redis } from 'ioredis'
import type { Env } from '../shared/config/env.js'
import { createModelConfig } from '../shared/config/modelConfig.js'
import { PgCharacterRepository } from '../infrastructure/database/repositories/PgCharacterRepository.js'
import { PgPlayerRepository } from '../infrastructure/database/repositories/PgPlayerRepository.js'
import { PgNpcAffinityRepository } from '../infrastructure/database/repositories/PgNpcAffinityRepository.js'
import { Neo4jGraphRepository } from '../infrastructure/database/repositories/Neo4jGraphRepository.js'
import { PgLoreQueryService } from '../infrastructure/lore/PgLoreQueryService.js'
import { PgVectorRetriever } from '../infrastructure/vector/PgVectorRetriever.js'
import { OpenRouterProvider } from '../infrastructure/ai/OpenRouterProvider.js'
import { RedisAuthChallengeStore } from '../infrastructure/auth/RedisAuthChallengeStore.js'
import { EmbeddingSemanticAuthService } from '../infrastructure/auth/EmbeddingSemanticAuthService.js'
import { JwtTokenService } from '../infrastructure/auth/JwtTokenService.js'
import { RedisSessionContextStore } from '../infrastructure/session/RedisSessionContextStore.js'
import { PgMemoryEngine } from '../infrastructure/memory/PgMemoryEngine.js'
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
import type { NpcAffinityRepository } from '../core/application/ports/NpcAffinityRepository.js'
import type { GraphRepository } from '../core/application/ports/GraphRepository.js'
import type { LoreQueryService } from '../core/application/ports/LoreQueryService.js'
import type { AuthChallengeStore } from '../core/application/ports/AuthChallengeStore.js'
import type { SemanticAuthService } from '../core/application/ports/SemanticAuthService.js'
import type { TokenService } from '../core/application/ports/TokenService.js'
import type { SessionContextStore } from '../core/application/ports/SessionContextStore.js'
import type { MemoryEngine } from '../core/application/ports/MemoryEngine.js'
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
  affinityRepository: NpcAffinityRepository
  graphRepository: GraphRepository
  loreQueryService: LoreQueryService

  // Session & Memory
  sessionContextStore: SessionContextStore
  memoryEngine: MemoryEngine

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

  // AI first — needed by vectorRetriever
  const aiProvider = new OpenRouterProvider(
    modelConfig,
    env.OPENROUTER_API_KEY,
    env.OPENROUTER_BASE_URL,
  )

  // Infrastructure
  const characterRepository = new PgCharacterRepository(pgPool)
  const playerRepository = new PgPlayerRepository(pgPool)
  const affinityRepository = new PgNpcAffinityRepository(pgPool)
  const graphRepository = new Neo4jGraphRepository(neo4jDriver)
  const loreQueryService = new PgLoreQueryService(pgPool)
  const vectorRetriever = new PgVectorRetriever(pgPool, modelConfig.embeddingDimensions, aiProvider)

  // Session & Memory
  const sessionContextStore = new RedisSessionContextStore(redisClient)
  const memoryEngine = new PgMemoryEngine(pgPool, aiProvider, sessionContextStore)

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
    {
      aiProvider,
      characterRepository,
      vectorRetriever,
      affinityRepository,
      sessionContextStore,
      memoryEngine,
      graphRepository,
      loreQueryService,
      getCharacterUseCase,
      initiatePlayerAuthUseCase,
      validatePlayerAuthUseCase,
      authenticateDMUseCase,
    },
    checkpointer,
  )

  return {
    pgPool,
    neo4jDriver,
    redisClient,
    characterRepository,
    playerRepository,
    vectorRetriever,
    affinityRepository,
    graphRepository,
    loreQueryService,
    sessionContextStore,
    memoryEngine,
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
