export interface ModelConfig {
  defaultModel: string
  chatModel: string
  fallbackModel: string
  embeddingModel: string
  embeddingDimensions: number
}

export function createModelConfig(env: NodeJS.ProcessEnv): ModelConfig {
  return {
    defaultModel: env['AI_DEFAULT_MODEL'] ?? 'mistralai/mistral-7b-instruct:free',
    chatModel: env['AI_CHAT_MODEL'] ?? 'mistralai/mistral-7b-instruct:free',
    fallbackModel: env['AI_FALLBACK_MODEL'] ?? 'google/gemma-3-1b-it:free',
    embeddingModel: env['AI_EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
    embeddingDimensions: parseInt(env['AI_EMBEDDING_DIMENSIONS'] ?? '1536', 10),
  }
}
