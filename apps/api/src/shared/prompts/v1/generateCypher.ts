import { z } from 'zod'
import type { Intent, Slots, Complexity } from './identifyIntent.js'

export const SingleCypherSchema = z.object({
  cypher: z.string().min(1),
  purpose: z.string(),
})

export const CypherResponseSchema = z.object({
  queries: z.array(SingleCypherSchema).min(1).max(5),
  explanation: z.string(),
})

export type CypherResponse = z.infer<typeof CypherResponseSchema>

const NEO4J_SCHEMA = {
  nodes: [
    { label: 'NPC', properties: ['name', 'description', 'location'] },
    { label: 'Location', properties: ['name', 'description', 'short_description', 'services', 'honors'] },
    { label: 'Interest', properties: ['name'] },
  ],
  relationships: [
    '(NPC)-[:LOCATED_IN]->(Location)',
    '(NPC)-[:LIKES]->(Interest)',
  ],
}

export function getCypherSystemPrompt(): string {
  return JSON.stringify({
    role: 'Cypher expert para o grafo RPG Valkária (Neo4j READ-only)',
    schema: NEO4J_SCHEMA,
    decomposition_rules: [
      'Queries simples (1 condição, 1 entidade): use 1 query',
      'Queries complexas (múltiplas entidades, condições OR, mais de 2 MATCH): decomponha em N queries menores (max 5)',
      'Cada query deve ser independente e retornar resultados úteis sozinha',
      "Exemplo: 'NPCs em A ou B' → 1 query para A + 1 query para B",
    ],
    security_rules: [
      'nunca use CREATE, MERGE, DELETE, SET, REMOVE ou DROP',
      'sempre inclua RETURN na query',
      'nunca use CALL, apoc, dbms ou LOAD CSV',
      'não inclua LIMIT (será adicionado automaticamente pelo sistema)',
      'max 1000 caracteres por query',
      'use toLower() para buscas case-insensitive',
    ],
    output_format:
      'JSON ONLY — sem markdown, sem texto extra: { "queries": [{"cypher": "<query>", "purpose": "<o que essa query busca>"}], "explanation": "<1-2 frases>" }. Max 5 queries.',
  })
}

export function getCypherUserPrompt(
  intent: Intent | undefined,
  slots: Partial<Slots>,
  complexity: Complexity | undefined,
): string {
  return JSON.stringify({
    intent,
    slots,
    complexity_hint:
      complexity === 'simple'
        ? 'Esta é uma busca simples — use apenas 1 query.'
        : 'Esta busca pode ser complexa — decomponha em múltiplas queries independentes se necessário (max 5).',
  })
}

export function getCypherCorrectionPrompt(
  intent: Intent | undefined,
  slots: Partial<Slots>,
  failedQueries: Array<{ cypher: string; purpose: string }> | undefined,
  errorMessage: string,
): string {
  return JSON.stringify({
    intent,
    slots,
    previous_attempt: failedQueries ?? [],
    error: errorMessage,
    instruction:
      'A tentativa anterior falhou com o erro acima. Corrija a query com base no erro. Mantenha o mesmo objetivo mas ajuste a sintaxe ou semântica conforme necessário.',
  })
}
