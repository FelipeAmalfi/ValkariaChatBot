export type LoreEntity = 'npc' | 'location'

export const NPC_ALLOWED_FIELDS = [
  'name',
  'description',
  'personality',
  'location',
  'interests',
  'faction',
  'role',
] as const

export const LOCATION_ALLOWED_FIELDS = [
  'name',
  'description',
  'short_description',
  'services',
] as const

export type NpcField = (typeof NPC_ALLOWED_FIELDS)[number]
export type LocationField = (typeof LOCATION_ALLOWED_FIELDS)[number]
export type LoreField = NpcField | LocationField

export interface LoreQueryFilters {
  location?: string
  faction?: string
  interest?: string
  name?: string
}

export interface LoreQueryResult {
  entity: LoreEntity
  fields: string[]
  data: Record<string, unknown>[]
}

export interface LoreQueryService {
  query(
    entity: LoreEntity,
    fields: string[],
    filters?: LoreQueryFilters,
  ): Promise<LoreQueryResult>
}
