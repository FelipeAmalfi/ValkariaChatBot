import { vi } from 'vitest'
import { createServer } from '../../../src/interface/http/server.js'
import type { Container } from '../../../src/composition/container.js'
import type { Env } from '../../../src/shared/config/env.js'

export const TEST_JWT_SECRET = 'test-secret-key-minimum-32-chars!!'
export const TEST_DM_PASSWORD = 'dm-pass-test'

export const testEnv: Env = {
  NODE_ENV: 'test',
  API_PORT: 3001,
  API_HOST: '127.0.0.1',
  LOG_LEVEL: 'error',
  DATABASE_URL: 'postgres://test',
  DATABASE_POOL_SIZE: 1,
  NEO4J_URI: 'bolt://test',
  NEO4J_USER: 'test',
  NEO4J_PASSWORD: 'test',
  REDIS_URL: 'redis://test',
  OPENROUTER_API_KEY: 'test-key',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  AI_DEFAULT_MODEL: 'test-model',
  AI_CHAT_MODEL: 'test-model',
  AI_FALLBACK_MODEL: 'test-model',
  AI_EMBEDDING_MODEL: 'test-embedding',
  AI_EMBEDDING_DIMENSIONS: 1536,
  JWT_SECRET: TEST_JWT_SECRET,
  JWT_EXPIRES_IN: '1h',
  CORS_ORIGIN: 'http://localhost:3000',
  RATE_LIMIT_MAX: 1000,
  RATE_LIMIT_WINDOW_MS: 60000,
  DM_PASSWORD: TEST_DM_PASSWORD,
  SEMANTIC_AUTH_THRESHOLD: 0.6,
}

export interface AppMocks {
  registerPlayerUseCase: { execute: ReturnType<typeof vi.fn> }
  initiatePlayerAuthUseCase: { execute: ReturnType<typeof vi.fn> }
  validatePlayerAuthUseCase: { execute: ReturnType<typeof vi.fn> }
  authenticateDMUseCase: { execute: ReturnType<typeof vi.fn> }
  graph: { invoke: ReturnType<typeof vi.fn> }
  sessionContextStore: { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> }
  tokenService: { sign: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> }
  playerRepository: { findByName: ReturnType<typeof vi.fn>; findAll: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> }
  affinityRepository: { findByPlayerAndNpc: ReturnType<typeof vi.fn>; findAllByPlayer: ReturnType<typeof vi.fn> }
  loreQueryService: { query: ReturnType<typeof vi.fn> }
}

export function buildMocks(overrides: Partial<AppMocks> = {}): AppMocks {
  return {
    registerPlayerUseCase: { execute: vi.fn() },
    initiatePlayerAuthUseCase: { execute: vi.fn() },
    validatePlayerAuthUseCase: { execute: vi.fn() },
    authenticateDMUseCase: { execute: vi.fn() },
    graph: { invoke: vi.fn().mockResolvedValue({ response: 'test response', intent: 'chat' }) },
    sessionContextStore: { load: vi.fn().mockResolvedValue(null), save: vi.fn() },
    tokenService: { sign: vi.fn().mockResolvedValue('mock-token'), verify: vi.fn() },
    playerRepository: {
      findByName: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
    },
    affinityRepository: {
      findByPlayerAndNpc: vi.fn().mockResolvedValue(null),
      findAllByPlayer: vi.fn().mockResolvedValue([]),
    },
    loreQueryService: { query: vi.fn().mockResolvedValue({ data: [] }) },
    ...overrides,
  }
}

export async function buildApp(mocks?: Partial<AppMocks>) {
  const m = buildMocks(mocks)
  const container = m as unknown as Container
  const app = await createServer(testEnv, container)
  return { app, mocks: m }
}
