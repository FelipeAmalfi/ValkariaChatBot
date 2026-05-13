import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_SIZE: z.coerce.number().default(10),

  NEO4J_URI: z.string().min(1, 'NEO4J_URI is required'),
  NEO4J_USER: z.string().min(1, 'NEO4J_USER is required'),
  NEO4J_PASSWORD: z.string().min(1, 'NEO4J_PASSWORD is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),

  AI_DEFAULT_MODEL: z.string().default('mistralai/mistral-7b-instruct:free'),
  AI_CHAT_MODEL: z.string().default('mistralai/mistral-7b-instruct:free'),
  AI_FALLBACK_MODEL: z.string().default('google/gemma-3-1b-it:free'),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
})

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  return result.data
}
