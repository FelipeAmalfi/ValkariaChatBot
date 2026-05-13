# Design do Sistema de IA — ValkáriaChatBot

## Visão Geral

O sistema usa LangGraph para orchestração multi-step, com OpenRouter como provider de LLM e pgvector para RAG.

## LangGraph StateGraph (Fase 1 — Base)

```
START → identifyIntent → response → END
```

Expansão planejada para Fase 2:
```
START → identifyIntent → [ask_character → fetchCharacter → response]
                       → [ask_location → fetchLocation → response]
                       → [ask_lore → ragSearch → response]
                       → [chat → response]
                       → END
```

## Conversational Memory

`MemorySaver` persiste o estado completo do `ValkáriaStateAnnotation` por `thread_id`.

- `thread_id` vem do body HTTP: `{ message, threadId }` 
- Se não enviado, um UUID é gerado automaticamente
- Slots acumulam entre turnos: `{ ...prev, ...newSlots }` (nunca substituição total)
- Campos de ação (`actionSuccess`, `actionError`, `actionData`) são resetados a cada turno

## OpenRouter — Modelos Gratuitos

| Tarefa | Modelo padrão |
|---|---|
| chat | mistralai/mistral-7b-instruct:free |
| classification | mistralai/mistral-7b-instruct:free |
| fallback | google/gemma-3-1b-it:free |
| embedding | text-embedding-3-small (pago, baixo custo) |

Troca de modelo: alterar `.env` — sem mudança de código.

## RAG Pipeline (Fase 2)

1. `scripts/seed.ts` — ingere `npcs.csv` e `locations.csv`
2. Gera embeddings via OpenRouter (text-embedding-3-small, 1536 dims)
3. Armazena em `langchain_pg_embedding` com metadata por tipo de entidade
4. `PgVectorRetriever.searchByVector()` faz busca por similaridade coseno
5. `SCORE_THRESHOLD = 0.3` — documentar justificativa ao alterar

## Neo4j — Grafo de Relacionamentos (Fase 2)

Relacionamentos planejados:
```cypher
(:Character)-[:LOCATED_IN]->(:Location)
(:Character)-[:ALLIED_WITH]->(:Character)
(:Character)-[:ENEMY_OF]->(:Character)
(:Character)-[:MEMBER_OF]->(:Faction)
(:Location)-[:PART_OF]->(:Region)
```

## Intents (Fase 1 — Base)

| Intent | Slots Requeridos | Ação |
|---|---|---|
| chat | — | resposta genérica |
| ask_character | characterName | busca NPC (Fase 2) |
| ask_location | locationName | busca location (Fase 2) |
| ask_lore | topic | busca RAG (Fase 2) |
| unknown | — | fallback |

## Extensão de Intents

Seguir o skill `create_intent`:
1. `identifyIntent.ts` — adicionar ao IntentSchema e examples
2. `state.ts` — adicionar ao intent enum (manter em sync)
3. `identifyIntentNode.ts` — adicionar a REQUIRED_SLOTS_BY_INTENT
4. `router.ts` — adicionar branch de roteamento
5. `builder.ts` — adicionar nó e edge
6. `dependencies.ts` — adicionar use-case ao GraphDependencies
7. `container.ts` — instanciar e wired use-case

## Prompt Engineering

Prompts em `src/shared/prompts/v1/`.

- `getSystemPrompt()` → `JSON.stringify(object)` — padrão mantido
- `getUserPromptTemplate(data)` → `JSON.stringify({ scenario, details })`
- Versionar prompts: criar `v2/` sem remover `v1/`
- Nunca expor IDs numéricos de banco em prompts
