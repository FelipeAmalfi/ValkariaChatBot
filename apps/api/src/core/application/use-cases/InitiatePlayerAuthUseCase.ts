import { randomUUID } from 'node:crypto'
import type { ChallengeField } from '../../domain/entities/Player.js'
import { NotFoundError } from '../../domain/errors/AppError.js'
import type { PlayerRepository } from '../ports/PlayerRepository.js'
import type { AuthChallengeStore, AuthChallenge } from '../ports/AuthChallengeStore.js'
import type { SemanticAuthService } from '../ports/SemanticAuthService.js'
import type { AIProvider } from '../ports/AIProvider.js'
import {
  getSystemPrompt,
  getUserPromptTemplate,
} from '../../../shared/prompts/v1/generateAuthQuestion.js'

const CHALLENGE_TTL_SECONDS = 300
const CHALLENGE_FIELDS: ChallengeField[] = ['background', 'personality', 'interests']

export interface InitiatePlayerAuthDeps {
  playerRepository: PlayerRepository
  challengeStore: AuthChallengeStore
  semanticAuthService: SemanticAuthService
  aiProvider: AIProvider
}

export interface InitiatePlayerAuthOutput {
  challengeId: string
  question: string
  playerName: string
}

export class InitiatePlayerAuthUseCase {
  constructor(private readonly deps: InitiatePlayerAuthDeps) {}

  async execute(playerName: string): Promise<InitiatePlayerAuthOutput> {
    const player = await this.deps.playerRepository.findByName(playerName)
    if (!player) {
      throw new NotFoundError('Player', playerName)
    }

    const field = CHALLENGE_FIELDS[Math.floor(Math.random() * CHALLENGE_FIELDS.length)]!
    const fieldContent = player[field]

    const aiResponse = await this.deps.aiProvider.complete({
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: getUserPromptTemplate(fieldContent) },
      ],
      task: 'extraction',
      temperature: 0.4,
      maxTokens: 100,
    })
    const question = aiResponse.content.trim()

    const fieldEmbedding = await this.deps.semanticAuthService.embed(fieldContent)

    const challenge: AuthChallenge = {
      challengeId: randomUUID(),
      playerId: player.id,
      fieldContent,
      question,
      fieldEmbedding,
      field,
      expiresAt: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
    }

    await this.deps.challengeStore.save(challenge, CHALLENGE_TTL_SECONDS)

    return {
      challengeId: challenge.challengeId,
      question,
      playerName: player.name,
    }
  }
}
