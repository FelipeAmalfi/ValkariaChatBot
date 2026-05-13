export type ModelTask = 'chat' | 'embedding' | 'classification' | 'summarization' | 'extraction'

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionRequest {
  messages: CompletionMessage[]
  model?: string
  task?: ModelTask
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface CompletionResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface EmbeddingRequest {
  input: string | string[]
  model?: string
  dimensions?: number
}

export interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}

export interface AIProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>
  getModelForTask(task: ModelTask): string
}
