import type { Container } from '../../composition/container.js'
import { healthResolver } from './resolvers/health.js'

const typeDefs = `
  type HealthStatus {
    status: String!
    timestamp: String!
    version: String!
  }

  type Character {
    id: ID!
    name: String!
    description: String
    role: String!
    faction: String
    locationId: ID
    createdAt: String!
    updatedAt: String!
  }

  type ChatResponse {
    response: String!
    threadId: String!
    intent: String
  }

  enum Role {
    PLAYER
    DM
  }

  type PlayerProfile {
    id: ID!
    name: String!
    class: String!
    race: String!
    createdAt: String!
  }

  type ChallengeResponse {
    challengeId: String!
    question: String!
    playerName: String!
  }

  type AuthToken {
    token: String!
    playerName: String
  }

  type Query {
    health: HealthStatus!
    character(id: ID!): Character
    characters(faction: String, role: String, page: Int, pageSize: Int): [Character!]!
  }

  type Mutation {
    chat(message: String!, threadId: String): ChatResponse!
    registerPlayer(
      name: String!
      class: String!
      race: String!
      background: String!
      personality: String!
      interests: String!
    ): PlayerProfile!
    initiatePlayerAuth(playerName: String!): ChallengeResponse!
    verifyPlayerAuth(challengeId: String!, answer: String!): AuthToken!
    authenticateDM(password: String!): AuthToken!
  }
`

export function buildGraphQLSchema(container: Container) {
  const resolvers = {
    ...healthResolver,
    Query: {
      ...healthResolver.Query,

      character: async (_: unknown, args: { id: string }) => {
        return container.characterRepository.findById(args.id)
      },

      characters: async (
        _: unknown,
        args: { faction?: string; role?: string; page?: number; pageSize?: number },
      ) => {
        return container.characterRepository.findAll(
          { faction: args.faction, role: args.role },
          { page: args.page, pageSize: args.pageSize },
        )
      },
    },

    Mutation: {
      chat: async (_: unknown, args: { message: string; threadId?: string }) => {
        const { randomUUID } = await import('node:crypto')
        const threadId = args.threadId ?? randomUUID()
        const result = await container.graph.invoke(
          { message: args.message },
          { configurable: { thread_id: threadId } },
        )
        return {
          response: result.response ?? 'No response generated.',
          threadId,
          intent: result.intent,
        }
      },

      registerPlayer: async (
        _: unknown,
        args: {
          name: string
          class: string
          race: string
          background: string
          personality: string
          interests: string
        },
      ) => {
        const { player } = await container.registerPlayerUseCase.execute(args)
        return {
          id: player.id,
          name: player.name,
          class: player.class,
          race: player.race,
          createdAt: player.createdAt,
        }
      },

      initiatePlayerAuth: async (_: unknown, args: { playerName: string }) => {
        return container.initiatePlayerAuthUseCase.execute(args.playerName)
      },

      verifyPlayerAuth: async (
        _: unknown,
        args: { challengeId: string; answer: string },
      ) => {
        const result = await container.validatePlayerAuthUseCase.execute(args)
        return { token: result.token, playerName: result.playerName }
      },

      authenticateDM: async (_: unknown, args: { password: string }) => {
        const { token } = await container.authenticateDMUseCase.execute(args.password)
        return { token, playerName: null }
      },
    },
  }

  return { schema: typeDefs, resolvers }
}
