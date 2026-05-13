import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import mercurius from 'mercurius'
import type { Env } from '../../shared/config/env.js'
import type { Container } from '../../composition/container.js'
import { registerErrorHandler } from './errorHandler.js'
import { ChatController } from './controllers/ChatController.js'
import { buildGraphQLSchema } from '../graphql/schema.js'

export async function createServer(env: Env, container: Container) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }),
    },
    trustProxy: true,
  })

  // Security plugins
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  })

  // GraphQL via Mercurius
  const { schema, resolvers } = buildGraphQLSchema(container)
  await app.register(mercurius, {
    schema,
    resolvers,
    graphiql: env.NODE_ENV === 'development',
    path: '/graphql',
  })

  // Error handler (must come before routes)
  registerErrorHandler(app)

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }))

  // HTTP controllers
  await app.register(ChatController({ graph: container.graph }), { prefix: '/api/v1' })

  return app
}
