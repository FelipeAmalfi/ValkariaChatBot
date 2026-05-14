export interface SemanticAuthService {
  embed(text: string): Promise<number[]>
  cosineSimilarity(a: number[], b: number[]): number
  validateAnswer(answerText: string, fieldEmbedding: number[], threshold: number): Promise<boolean>
}
