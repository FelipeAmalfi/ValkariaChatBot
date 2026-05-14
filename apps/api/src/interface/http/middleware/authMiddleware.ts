import type { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '../../../core/domain/value-objects/Role.js'
import { UnauthorizedError, ForbiddenError } from '../../../core/domain/errors/AppError.js'
import type { TokenService } from '../../../core/application/ports/TokenService.js'

export interface AuthMiddleware {
  requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  requireDM: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  requirePlayer: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
}

export function createAuthMiddleware(tokenService: TokenService): AuthMiddleware {
  async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header')
    }
    const token = authHeader.slice(7)
    request.user = await tokenService.verify(token)
  }

  async function requireDM(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply)
    if (request.user.role !== Role.DM) {
      throw new ForbiddenError('DM access required')
    }
  }

  async function requirePlayer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply)
    if (request.user.role !== Role.PLAYER) {
      throw new ForbiddenError('Player access required')
    }
  }

  return { requireAuth, requireDM, requirePlayer }
}
