import type { ID, Timestamp } from '@valkaria/shared'

export interface Player {
  id: ID
  name: string
  class: string
  race: string
  background: string
  personality: string
  interests: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreatePlayerInput {
  name: string
  class: string
  race: string
  background: string
  personality: string
  interests: string
}

export type ChallengeField = 'background' | 'personality' | 'interests'
