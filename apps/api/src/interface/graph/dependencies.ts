import type { AIProvider } from '../../core/application/ports/AIProvider.js'
import type { CharacterRepository } from '../../core/application/ports/CharacterRepository.js'
import type { VectorRetriever } from '../../core/application/ports/VectorRetriever.js'
import type { GetCharacterUseCase } from '../../core/application/use-cases/GetCharacterUseCase.js'

export interface GraphDependencies {
  aiProvider: AIProvider
  characterRepository: CharacterRepository
  vectorRetriever: VectorRetriever
  getCharacterUseCase: GetCharacterUseCase
}
