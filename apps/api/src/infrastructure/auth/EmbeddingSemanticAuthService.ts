import type { AIProvider } from '../../core/application/ports/AIProvider.js'
import type { SemanticAuthService } from '../../core/application/ports/SemanticAuthService.js'
import { AIProviderError } from '../../core/domain/errors/AppError.js'

export class EmbeddingSemanticAuthService implements SemanticAuthService {
  constructor(private readonly aiProvider: AIProvider) {}

  async embed(text: string): Promise<number[]> {
    const response = await this.aiProvider.embed({ input: text })
    const embedding = response.embeddings[0]
    if (!embedding || embedding.length === 0) {
      throw new AIProviderError('Empty embedding returned from AI provider')
    }
    return embedding
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Embedding dimension mismatch')
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!
      normA += a[i]! ** 2
      normB += b[i]! ** 2
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dot / denom
  }

  async validateAnswer(
    answerText: string,
    fieldEmbedding: number[],
    threshold: number,
  ): Promise<boolean> {
    const answerEmbedding = await this.embed(answerText)
    const similarity = this.cosineSimilarity(answerEmbedding, fieldEmbedding)
    return similarity >= threshold
  }
}
