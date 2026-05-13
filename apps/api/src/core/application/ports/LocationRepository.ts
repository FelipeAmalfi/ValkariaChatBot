import type { ID, PaginationInput } from '@valkaria/shared'
import type { CreateLocationInput, Location } from '../../domain/entities/Location.js'

export interface LocationRepository {
  findById(id: ID): Promise<Location | null>
  findByName(name: string): Promise<Location | null>
  findAll(pagination?: PaginationInput): Promise<Location[]>
  create(input: CreateLocationInput): Promise<Location>
  delete(id: ID): Promise<void>
}
