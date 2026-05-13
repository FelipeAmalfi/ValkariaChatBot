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

  type Query {
    health: HealthStatus!
    character(id: ID!): Character
    characters(faction: String, role: String, page: Int, pageSize: Int): [Character!]!
  }

  type Mutation {
    chat(message: String!, threadId: String): ChatResponse!
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
    },
  }

  return { schema: typeDefs, resolvers }
}
