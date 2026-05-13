import type { ID, Pagination, PaginationInput } from '@valkaria/shared'
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '../../domain/entities/Character.js'

export interface CharacterFilters {
  faction?: string
  role?: string
  locationId?: ID
}

export interface CharacterRepository {
  findById(id: ID): Promise<Character | null>
  findByName(name: string): Promise<Character | null>
  findAll(filters?: CharacterFilters, pagination?: PaginationInput): Promise<Character[]>
  count(filters?: CharacterFilters): Promise<number>
  findAllPaginated(
    filters?: CharacterFilters,
    pagination?: PaginationInput,
  ): Promise<{ data: Character[]; pagination: Pagination }>
  create(input: CreateCharacterInput): Promise<Character>
  update(id: ID, input: UpdateCharacterInput): Promise<Character>
  delete(id: ID): Promise<void>
}
