# LangGraph — Fluxo do StateGraph

## Visão Geral

O `ValkáriaGraph` é um `StateGraph` compilado com **16 nós** e **4 roteadores condicionais**. Todo o estado da conversa vive em `ValkáriaStateAnnotation` e é persistido por `thread_id` via `MemorySaver`.

## Fluxo Completo

```mermaid
flowchart TD
    START([START]) --> sanitize

    sanitize{sanitize}
    sanitize -->|blocked = true| END1([END])
    sanitize -->|blocked = false| identifyIntent

    identifyIntent[identifyIntent\nClassifica intent + extrai slots via LLM]
    identifyIntent --> sessionLoad

    sessionLoad[sessionLoad\nCarrega SessionContext do Redis]
    sessionLoad --> routeIntent{Roteamento\npor intent}

    routeIntent -->|identify_player\nidentify_dm| identityFlow
    routeIntent -->|ask_memory| memoryNode
    routeIntent -->|ask_affinity| affinityNode
    routeIntent -->|chat / unknown| narrativeResponse
    routeIntent -->|recommend_npcs| recommendationNode
    routeIntent -->|feedback_recommendation| feedbackNode
    routeIntent -->|ask_relationship\nsearch_npcs\nsearch_locations\n+ slots presentes| cypherGenerate
    routeIntent -->|ask_relationship\nsearch_npcs\nsearch_locations\n+ sem slots| simpleRetrieval
    routeIntent -->|MULTISTEP_INTENTS\nou complexity=multistep| planner
    routeIntent -->|demais intents| simpleRetrieval

    identityFlow[identityFlow\nAuth player 2 turnos\nou DM por senha]
    identityFlow --> narrativeResponse

    memoryNode[memoryNode\nFormata resumo de memória]
    memoryNode --> turnPersistence

    affinityNode[affinityNode\nBusca snapshot de afinidade]
    affinityNode --> narrativeResponse

    recommendationNode[recommendationNode\nRecomendação baseada em perfil]
    recommendationNode --> narrativeResponse

    feedbackNode[feedbackNode\nRegistra feedback de recomendação]
    feedbackNode --> turnPersistence

    cypherGenerate[cypherGenerate\nLLM gera query Cypher]
    cypherGenerate --> cypherExecute

    cypherExecute[cypherExecute\nExecuta Cypher no Neo4j]
    cypherExecute --> routeCypher{Resultado\ndo Cypher?}
    routeCypher -->|sem erro| narrativeResponse
    routeCypher -->|erro + retries ≤ 1| cypherGenerate
    routeCypher -->|erro + retries > 1| narrativeResponse

    planner[planner\nLLM gera plano multi-step]
    planner --> routePlanner{Plano\nexiste?}
    routePlanner -->|steps.length > 0| retrievalOrchestrator
    routePlanner -->|sem steps| simpleRetrieval

    simpleRetrieval[simpleRetrieval\nBusca vetorial + repositório]
    simpleRetrieval --> narrativeResponse

    retrievalOrchestrator[retrievalOrchestrator\nExecuta steps do plano]
    retrievalOrchestrator --> narrativeResponse

    narrativeResponse[narrativeResponse\nLLM gera resposta narrativa\ncom contexto RAG injetado]
    narrativeResponse --> turnPersistence

    turnPersistence[turnPersistence\nPersiste turno no MemoryEngine\nPostgreSQL + Redis]
    turnPersistence --> END2([END])
```

## Nós — Responsabilidades

| Nó | Tipo | Inputs principais | Outputs principais |
|----|------|-------------------|-------------------|
| `sanitize` | Sync | `message` | `blocked` |
| `identifyIntent` | Async LLM | `message`, `sessionContext` | `intent`, `slots`, `complexity`, `confidence` |
| `sessionLoad` | Async | `playerId`, config.thread_id | `sessionContext` |
| `identityFlow` | Async LLM | `message`, `slots` | `sessionContext`, `playerId`, `playerRole` |
| `simpleRetrieval` | Async | `message`, `intent`, `slots` | `retrievalResults`, `aggregatedContext` |
| `graphRetrieval` | Async | `slots`, `intent` | `retrievalResults`, `aggregatedContext` |
| `cypherGenerate` | Async LLM | `message`, `lastCypherError` | `lastCypherQueries` |
| `cypherExecute` | Async | `lastCypherQueries` | `retrievalResults`, `lastCypherError`, `cypherRetryCount` |
| `planner` | Async LLM | `message`, `slots`, `intent` | `plannerPlan` |
| `retrievalOrchestrator` | Async | `plannerPlan`, `slots` | `retrievalResults`, `aggregatedContext` |
| `affinityNode` | Async | `intent`, `slots`, `playerId` | `retrievalResults`, `aggregatedContext` |
| `memoryNode` | Sync | `sessionContext` | `response` |
| `recommendationNode` | Async | `playerProfile`, `intent`, `slots` | `lastRecommendedNpcs`, `response` |
| `feedbackNode` | Async | `slots`, `lastRecommendedNpcs`, `playerId` | `actionSuccess` |
| `narrativeResponse` | Async LLM | `aggregatedContext`, `retrievalResults`, `intent`, `message` | `response` |
| `turnPersistence` | Async | todo o estado | (efeitos colaterais) |

## State Shape — `ValkáriaStateAnnotation`

```typescript
// ─── Entrada
message: string

// ─── Segurança
blocked: boolean                // sanitize → true encerra imediatamente

// ─── Classificação
intent: Intent | undefined      // 24 intents possíveis
complexity: 'simple' | 'complex' | 'multistep'
confidence: number
requiresRetrieval: boolean
slots: Partial<Slots>           // acumulam entre turnos (reducer merge)

// ─── Sessão e Identidade
sessionContext: SessionContext | undefined
playerRole: Role | undefined
playerId: string | undefined

// ─── Recuperação
retrievalResults: unknown[]
plannerPlan: PlannerPlan | undefined
aggregatedContext: string | undefined
retrievalError: string | undefined

// ─── Pipeline Cypher
lastCypherQueries: Array<{ cypher: string; purpose: string }>
lastCypherError: string | undefined
cypherRetryCount: number

// ─── Resposta
response: string | undefined
lastRecommendedNpcs: string[]

// ─── Resultados de ação (resetados a cada turno)
actionSuccess: boolean | undefined
actionError: string | undefined
actionData: unknown
```

## Intents e Roteamento

| Intent | Rota para | Slots requeridos |
|--------|-----------|-----------------|
| `identify_player` | identityFlow | — |
| `identify_dm` | identityFlow | — |
| `ask_character` | simpleRetrieval | `characterName` |
| `ask_benefits` | simpleRetrieval | `characterName` |
| `ask_relationship` | cypherGenerate ou simpleRetrieval | `characterName` |
| `ask_location` | simpleRetrieval | `locationName` |
| `ask_lore` | simpleRetrieval | `topic` |
| `ask_affinity` | affinityNode | `affinityTarget` |
| `increase_affinity` | planner (multistep) | `affinityTarget` |
| `search_npcs` | cypherGenerate ou simpleRetrieval | — |
| `search_locations` | cypherGenerate ou simpleRetrieval | — |
| `ask_recommendation` | planner (multistep) | — |
| `recommend_npcs` | recommendationNode | — |
| `feedback_recommendation` | feedbackNode | `feedbackSentiment` |
| `ask_memory` | memoryNode | — |
| `chat` | narrativeResponse | — |
| `unknown` | narrativeResponse | — |

**MULTISTEP_INTENTS** (sempre passam pelo planner): `ask_recommendation`, `ask_relationship`, `increase_affinity`

## Slots Disponíveis

| Slot | Tipo | Preenchido por |
|------|------|----------------|
| `characterName` | string | identifyIntent |
| `locationName` | string | identifyIntent |
| `topic` | string | identifyIntent |
| `affinityTarget` | string | identifyIntent |
| `recommendationFilters` | string | identifyIntent |
| `pendingAnswer` | string | identityFlow (2º turno) |
| `feedbackSentiment` | `'positive' \| 'negative'` | identifyIntent |
| `requestedEntity` | `'npc' \| 'location'` | identifyIntent |
| `requestedFields` | string[] | identifyIntent |
| `relationshipTarget` | string | identifyIntent |
| `previousContext` | string | identifyIntent |

## Ferramentas LLM (Tools Registry)

Registradas no `narrativeResponseNode` para chamadas tool-use:

| Ferramenta | Função |
|------------|--------|
| `getNpcByName` | Lookup de personagem por nome |
| `searchLore` | Busca semântica vetorial |
| `getAffinity` | Consulta nível de afinidade |
| `increaseAffinity` | Atualiza score de afinidade |
| `recommendNpc` | Recomendação vetorizada de NPC |
