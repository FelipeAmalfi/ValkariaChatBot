import { gql } from '@apollo/client'

// ── Chat ─────────────────────────────────────────────────────────────────────

export const CHAT_MUTATION = gql`
  mutation Chat($message: String!, $threadId: String) {
    chat(message: $message, threadId: $threadId) {
      response
      threadId
      intent
    }
  }
`

export interface ChatResponse {
  response: string
  threadId: string
  intent?: string
}

export interface ChatMutationResult {
  chat: ChatResponse
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const AUTHENTICATE_DM = gql`
  mutation AuthenticateDM($password: String!) {
    authenticateDM(password: $password) {
      token
    }
  }
`

export interface AuthenticateDMMutationResult {
  authenticateDM: { token: string }
}

// ── Player management (DM only) ───────────────────────────────────────────────

export const REGISTER_PLAYER = gql`
  mutation RegisterPlayer(
    $name: String!
    $class: String!
    $race: String!
    $background: String!
    $personality: String!
    $interests: String!
  ) {
    registerPlayer(
      name: $name
      class: $class
      race: $race
      background: $background
      personality: $personality
      interests: $interests
    ) {
      id
      name
      class
      race
      createdAt
    }
  }
`

export interface PlayerProfile {
  id: string
  name: string
  class: string
  race: string
  createdAt: string
}

export interface RegisterPlayerMutationResult {
  registerPlayer: PlayerProfile
}

export const LIST_PLAYERS = gql`
  query ListPlayers {
    players {
      id
      name
      class
      race
      createdAt
    }
  }
`

export interface ListPlayersQueryResult {
  players: PlayerProfile[]
}

// ── Affinity ──────────────────────────────────────────────────────────────────

export const GET_AFFINITIES = gql`
  query GetAffinities($playerName: String!) {
    affinities(playerName: $playerName) {
      npcName
      level
      score
      interactionCount
    }
  }
`

export type AffinityLevel = 'none' | 'cordial' | 'loyal' | 'intimate'

export interface AffinityEntry {
  npcName: string
  level: AffinityLevel
  score: number
  interactionCount: number
}

export interface GetAffinitiesQueryResult {
  affinities: AffinityEntry[]
}

// ── NPC ───────────────────────────────────────────────────────────────────────

export const GET_NPC = gql`
  query GetNpc($name: String!) {
    npc(name: $name) {
      name
      description
      location
    }
  }
`

export interface NpcQueryResult {
  npc: { name: string; description?: string; location?: string } | null
}
