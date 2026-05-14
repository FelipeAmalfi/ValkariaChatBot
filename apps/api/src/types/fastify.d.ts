import type { JwtPayload } from '../core/domain/value-objects/Role.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}
