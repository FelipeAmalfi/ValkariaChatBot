import type { ID } from '@valkaria/shared'
import type { Player, CreatePlayerInput } from '../../domain/entities/Player.js'

export interface PlayerRepository {
  findById(id: ID): Promise<Player | null>
  findByName(name: string): Promise<Player | null>
  findAll(page?: number, pageSize?: number): Promise<Player[]>
  create(input: CreatePlayerInput): Promise<Player>
  existsByName(name: string): Promise<boolean>
}
