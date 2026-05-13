import { AIProviderError } from '../../core/domain/errors/AppError.js'
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelTask,
} from '../../core/application/ports/AIProvider.js'
import type { ModelConfig } from '../../shared/config/modelConfig.js'

interface OpenRouterCompletionResponse {
  id: string
  model: string
  choices: Array<{ message: { content: string } }>
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

interface OpenRouterEmbeddingResponse {
  model: string
  data: Array<{ embedding: number[] }>
  usage: { prompt_tokens: number; total_tokens: number }
}

export class OpenRouterProvider implements AIProvider {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    private readonly modelConfig: ModelConfig,
    apiKey: string,
    baseUrl = 'https://openrouter.ai/api/v1',
  ) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  getModelForTask(task: ModelTask): string {
    switch (task) {
      case 'chat':
        return this.modelConfig.chatModel
      case 'embedding':
        return this.modelConfig.embeddingModel
      case 'classification':
        return this.modelConfig.chatModel
      case 'summarization':
        return this.modelConfig.chatModel
      case 'extraction':
        return this.modelConfig.chatModel
      default:
        return this.modelConfig.defaultModel
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model ?? this.getModelForTask(request.task ?? 'chat')

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/valkaria-chatbot',
          'X-Title': 'ValkariaChatBot',
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          stream: false,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new AIProviderError(
          `OpenRouter API error ${response.status}: ${error}`,
        )
      }

      const data = (await response.json()) as OpenRouterCompletionResponse

      return {
        content: data.choices[0]?.message.content ?? '',
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      }
    } catch (err) {
      if (err instanceof AIProviderError) throw err
      throw new AIProviderError('Failed to call OpenRouter completion API', err)
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model ?? this.modelConfig.embeddingModel
    const input = Array.isArray(request.input) ? request.input : [request.input]

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/valkaria-chatbot',
          'X-Title': 'ValkariaChatBot',
        },
        body: JSON.stringify({ model, input }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new AIProviderError(`OpenRouter embeddings API error ${response.status}: ${error}`)
      }

      const data = (await response.json()) as OpenRouterEmbeddingResponse

      return {
        embeddings: data.data.map((d) => d.embedding),
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          totalTokens: data.usage.total_tokens,
        },
      }
    } catch (err) {
      if (err instanceof AIProviderError) throw err
      throw new AIProviderError('Failed to call OpenRouter embeddings API', err)
    }
  }
}
