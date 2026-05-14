import type { AIProvider } from '../../core/application/ports/AIProvider.js'
import type { CharacterRepository } from '../../core/application/ports/CharacterRepository.js'
import type { VectorRetriever } from '../../core/application/ports/VectorRetriever.js'
import type { NpcAffinityRepository } from '../../core/application/ports/NpcAffinityRepository.js'
import type { SessionContextStore } from '../../core/application/ports/SessionContextStore.js'
import type { MemoryEngine } from '../../core/application/ports/MemoryEngine.js'
import type { GraphRepository } from '../../core/application/ports/GraphRepository.js'
import type { LoreQueryService } from '../../core/application/ports/LoreQueryService.js'
import type { GetCharacterUseCase } from '../../core/application/use-cases/GetCharacterUseCase.js'
import type { InitiatePlayerAuthUseCase } from '../../core/application/use-cases/InitiatePlayerAuthUseCase.js'
import type { ValidatePlayerAuthUseCase } from '../../core/application/use-cases/ValidatePlayerAuthUseCase.js'
import type { AuthenticateDMUseCase } from '../../core/application/use-cases/AuthenticateDMUseCase.js'

export interface GraphDependencies {
  aiProvider: AIProvider
  characterRepository: CharacterRepository
  vectorRetriever: VectorRetriever
  affinityRepository: NpcAffinityRepository
  sessionContextStore: SessionContextStore
  memoryEngine: MemoryEngine
  graphRepository: GraphRepository
  loreQueryService: LoreQueryService
  getCharacterUseCase: GetCharacterUseCase
  initiatePlayerAuthUseCase: InitiatePlayerAuthUseCase
  validatePlayerAuthUseCase: ValidatePlayerAuthUseCase
  authenticateDMUseCase: AuthenticateDMUseCase
}
