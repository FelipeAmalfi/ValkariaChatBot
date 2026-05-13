import type { ID, Timestamp } from '@valkaria/shared'

export interface Location {
  id: ID
  name: string
  description: string | null
  region: string | null
  metadata: Record<string, unknown>
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateLocationInput {
  name: string
  description?: string
  region?: string
  metadata?: Record<string, unknown>
}
