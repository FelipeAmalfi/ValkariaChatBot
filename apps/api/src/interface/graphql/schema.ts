import type { MercuriusContext } from 'mercurius'
import type { Container } from '../../composition/container.js'
import { healthResolver } from './resolvers/health.js'

declare module 'mercurius' {
  interface MercuriusContext {
    request: import('fastify').FastifyRequest
  }
}

const typeDefs = `
  type HealthStatus {
    status: String!
    timestamp: String!
    version: String!
  }

  # ── Lore types (world data — safe to expose) ──────────────────────────────

  type Npc {
    name: String!
    description: String
    personality: String
    location: String
    interests: [String!]
    faction: String
  }

  type Location {
    name: String!
    description: String
    short_description: String
    services: [String!]
  }

  type ChatResponse {
    response: String!
    threadId: String!
    intent: String
  }

  enum AffinityLevel {
    none
    cordial
    loyal
    intimate
  }

  type AffinityEntry {
    npcName: String!
    level: AffinityLevel!
    score: Int!
    interactionCount: Int!
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

    # NPC queries — max depth 2, pagination required for lists
    npc(name: String!): Npc
    npcs(location: String, faction: String, interest: String, page: Int, pageSize: Int): [Npc!]!

    # Location queries
    location(name: String!): Location
    locations(page: Int, pageSize: Int): [Location!]!

    # Affinity queries
    affinity(playerName: String!, npcName: String!): AffinityEntry
    affinities(playerName: String!): [AffinityEntry!]!

    # Player list — DM only
    players(page: Int, pageSize: Int): [PlayerProfile!]!
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
    updateAffinity(playerName: String!, npcName: String!, score: Int!): AffinityEntry!
  }
`

export function buildGraphQLSchema(container: Container) {
  const resolvers = {
    ...healthResolver,
    Query: {
      ...healthResolver.Query,

      npc: async (_: unknown, args: { name: string }) => {
        const result = await container.loreQueryService.query(
          'npc',
          ['name', 'description', 'personality', 'location', 'interests', 'faction'],
          { name: args.name },
        )
        return result.data[0] ?? null
      },

      npcs: async (
        _: unknown,
        args: { location?: string; faction?: string; interest?: string; page?: number; pageSize?: number },
      ) => {
        const result = await container.loreQueryService.query(
          'npc',
          ['name', 'description', 'personality', 'location', 'interests', 'faction'],
          { location: args.location, faction: args.faction, interest: args.interest },
        )
        const page = Math.max(1, args.page ?? 1)
        const size = Math.min(args.pageSize ?? 20, 50)
        return result.data.slice((page - 1) * size, page * size)
      },

      location: async (_: unknown, args: { name: string }) => {
        const result = await container.loreQueryService.query(
          'location',
          ['name', 'description', 'short_description', 'services'],
          { name: args.name },
        )
        return result.data[0] ?? null
      },

      affinity: async (_: unknown, args: { playerName: string; npcName: string }) => {
        const player = await container.playerRepository.findByName(args.playerName)
        if (!player) return null
        const entry = await container.affinityRepository.findByPlayerAndNpc(player.id, args.npcName)
        if (!entry) return null
        return {
          npcName: entry.npcName,
          level: entry.level,
          score: entry.score,
          interactionCount: entry.interactionCount,
        }
      },

      players: async (
        _: unknown,
        args: { page?: number; pageSize?: number },
      ) => {
        const players = await container.playerRepository.findAll(args.page, args.pageSize)
        return players.map((p) => ({
          id: p.id,
          name: p.name,
          class: p.class,
          race: p.race,
          createdAt: p.createdAt,
        }))
      },

      affinities: async (_: unknown, args: { playerName: string }) => {
        const player = await container.playerRepository.findByName(args.playerName)
        if (!player) return []
        const entries = await container.affinityRepository.findAllByPlayer(player.id)
        return entries.map((e) => ({
          npcName: e.npcName,
          level: e.level,
          score: e.score,
          interactionCount: e.interactionCount,
        }))
      },

      locations: async (_: unknown, args: { page?: number; pageSize?: number }) => {
        const result = await container.loreQueryService.query('location', [
          'name',
          'description',
          'short_description',
          'services',
        ])
        const page = Math.max(1, args.page ?? 1)
        const size = Math.min(args.pageSize ?? 20, 50)
        return result.data.slice((page - 1) * size, page * size)
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
        context: MercuriusContext,
      ) => {
        const authHeader = context.request?.headers?.authorization
        if (!authHeader?.startsWith('Bearer ')) throw new Error('DM auth required')
        const payload = await container.tokenService.verify(authHeader.slice(7))
        if (payload.role !== 'DM') throw new Error('DM access required')
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

      updateAffinity: async (
        _: unknown,
        args: { playerName: string; npcName: string; score: number },
      ) => {
        const player = await container.playerRepository.findByName(args.playerName)
        if (!player) throw new Error(`Player "${args.playerName}" não encontrado`)
        const current = await container.affinityRepository.findByPlayerAndNpc(player.id, args.npcName)
        const delta = args.score - (current?.score ?? 0)
        const updated = await container.affinityRepository.upsert(player.id, args.npcName, delta)
        return {
          npcName: updated.npcName,
          level: updated.level,
          score: updated.score,
          interactionCount: updated.interactionCount,
        }
      },
    },
  }

  return { schema: typeDefs, resolvers }
}
