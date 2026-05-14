import { UnauthorizedError } from '../../domain/errors/AppError.js'
import { Role } from '../../domain/value-objects/Role.js'
import type { AuthChallengeStore } from '../ports/AuthChallengeStore.js'
import type { SemanticAuthService } from '../ports/SemanticAuthService.js'
import type { TokenService } from '../ports/TokenService.js'
import type { PlayerRepository } from '../ports/PlayerRepository.js'

export interface ValidatePlayerAuthDeps {
  challengeStore: AuthChallengeStore
  semanticAuthService: SemanticAuthService
  tokenService: TokenService
  playerRepository: PlayerRepository
  semanticThreshold: number
}

export interface ValidatePlayerAuthInput {
  challengeId: string
  answer: string
}

export interface ValidatePlayerAuthOutput {
  token: string
  playerId: string
  playerName: string
}

export class ValidatePlayerAuthUseCase {
  constructor(private readonly deps: ValidatePlayerAuthDeps) {}

  async execute(input: ValidatePlayerAuthInput): Promise<ValidatePlayerAuthOutput> {
    const challenge = await this.deps.challengeStore.find(input.challengeId)
    if (!challenge) {
      throw new UnauthorizedError('Challenge not found or expired')
    }

    // Always delete — one-time use, regardless of result
    await this.deps.challengeStore.delete(input.challengeId)

    const passed = await this.deps.semanticAuthService.validateAnswer(
      input.answer,
      challenge.fieldEmbedding,
      this.deps.semanticThreshold,
    )

    if (!passed) {
      throw new UnauthorizedError('Answer did not match. Identity not verified.')
    }

    const player = await this.deps.playerRepository.findById(challenge.playerId)
    if (!player) {
      throw new UnauthorizedError('Player no longer exists')
    }

    const token = await this.deps.tokenService.sign({
      sub: player.id,
      name: player.name,
      role: Role.PLAYER,
    })

    return { token, playerId: player.id, playerName: player.name }
  }
}
