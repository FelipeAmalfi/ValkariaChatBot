import type { ID, Timestamp } from '@valkaria/shared'

export type CharacterRole = 'npc' | 'merchant' | 'quest_giver' | 'enemy' | 'ally' | 'neutral'

export type CharacterFaction =
  | 'valkaria_order'
  | 'shadow_guild'
  | 'merchant_league'
  | 'free_cities'
  | 'neutral'
  | string

export interface Character {
  id: ID
  name: string
  description: string | null
  role: CharacterRole
  faction: CharacterFaction | null
  locationId: ID | null
  metadata: Record<string, unknown>
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateCharacterInput {
  name: string
  description?: string
  role: CharacterRole
  faction?: CharacterFaction
  locationId?: ID
  metadata?: Record<string, unknown>
}

export interface UpdateCharacterInput {
  name?: string
  description?: string
  role?: CharacterRole
  faction?: CharacterFaction
  locationId?: ID | null
  metadata?: Record<string, unknown>
}
