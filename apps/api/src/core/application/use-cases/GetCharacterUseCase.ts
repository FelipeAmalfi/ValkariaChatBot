import type { ID } from '@valkaria/shared'
import type { Character } from '../../../core/domain/entities/Character.js'
import { NotFoundError } from '../../domain/errors/AppError.js'
import type { CharacterRepository } from '../ports/CharacterRepository.js'

export interface GetCharacterUseCaseDeps {
  characterRepository: CharacterRepository
}

export class GetCharacterUseCase {
  constructor(private readonly deps: GetCharacterUseCaseDeps) {}

  async execute(id: ID): Promise<Character> {
    const character = await this.deps.characterRepository.findById(id)
    if (!character) {
      throw new NotFoundError('Character', id)
    }
    return character
  }
}
