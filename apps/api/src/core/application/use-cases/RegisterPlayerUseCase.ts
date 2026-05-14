import type { Player, CreatePlayerInput } from '../../domain/entities/Player.js'
import { ConflictError } from '../../domain/errors/AppError.js'
import type { PlayerRepository } from '../ports/PlayerRepository.js'

export interface RegisterPlayerUseCaseDeps {
  playerRepository: PlayerRepository
}

export interface RegisterPlayerOutput {
  player: Player
}

export class RegisterPlayerUseCase {
  constructor(private readonly deps: RegisterPlayerUseCaseDeps) {}

  async execute(input: CreatePlayerInput): Promise<RegisterPlayerOutput> {
    const exists = await this.deps.playerRepository.existsByName(input.name)
    if (exists) {
      throw new ConflictError(`Player name '${input.name}' is already taken`)
    }
    const player = await this.deps.playerRepository.create(input)
    return { player }
  }
}
