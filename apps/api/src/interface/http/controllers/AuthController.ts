import type { FastifyPluginAsync } from 'fastify'
import type { RegisterPlayerUseCase } from '../../../core/application/use-cases/RegisterPlayerUseCase.js'
import type { InitiatePlayerAuthUseCase } from '../../../core/application/use-cases/InitiatePlayerAuthUseCase.js'
import type { ValidatePlayerAuthUseCase } from '../../../core/application/use-cases/ValidatePlayerAuthUseCase.js'
import type { AuthenticateDMUseCase } from '../../../core/application/use-cases/AuthenticateDMUseCase.js'
import type { TokenService } from '../../../core/application/ports/TokenService.js'
import { UnauthorizedError, ForbiddenError } from '../../../core/domain/errors/AppError.js'
import {
  RegisterPlayerSchema,
  InitiateAuthSchema,
  ValidateAuthSchema,
  AuthenticateDMSchema,
} from '../schemas/authSchemas.js'

export interface AuthControllerDeps {
  registerPlayerUseCase: RegisterPlayerUseCase
  initiatePlayerAuthUseCase: InitiatePlayerAuthUseCase
  validatePlayerAuthUseCase: ValidatePlayerAuthUseCase
  authenticateDMUseCase: AuthenticateDMUseCase
  tokenService: TokenService
}

export function AuthController(deps: AuthControllerDeps): FastifyPluginAsync {
  return async (app) => {
    // POST /players/register — DM auth required
    app.post('/players/register', async (req, reply) => {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError('DM auth required')
      const payload = await deps.tokenService.verify(authHeader.slice(7))
      if (payload.role !== 'DM') throw new ForbiddenError('DM access required')
      const body = RegisterPlayerSchema.parse(req.body)
      const { player } = await deps.registerPlayerUseCase.execute(body)
      return reply.status(201).send({
        id: player.id,
        name: player.name,
        class: player.class,
        race: player.race,
        createdAt: player.createdAt,
      })
    })

    // POST /players/challenge
    app.post('/players/challenge', async (req, reply) => {
      const { playerName } = InitiateAuthSchema.parse(req.body)
      const result = await deps.initiatePlayerAuthUseCase.execute(playerName)
      return reply.status(200).send(result)
    })

    // POST /players/verify
    app.post('/players/verify', async (req, reply) => {
      const body = ValidateAuthSchema.parse(req.body)
      const result = await deps.validatePlayerAuthUseCase.execute(body)
      return reply.status(200).send({ token: result.token, playerName: result.playerName })
    })

    // POST /dm/login
    app.post('/dm/login', async (req, reply) => {
      const { password } = AuthenticateDMSchema.parse(req.body)
      const { token } = await deps.authenticateDMUseCase.execute(password)
      return reply.status(200).send({ token })
    })
  }
}
