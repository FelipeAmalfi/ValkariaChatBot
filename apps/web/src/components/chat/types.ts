export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  intent?: string
}

export type AffinityLevel = 'none' | 'cordial' | 'loyal' | 'intimate'

export interface NpcCardData {
  name: string
  location: string
  affinityLevel?: AffinityLevel
  affinityScore?: number
  description?: string
}
