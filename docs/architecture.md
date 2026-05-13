# Arquitetura — ValkáriaChatBot

## Visão Geral

Monorepo com clean architecture no backend e arquitetura de componentes no frontend.

## Camadas do Backend (apps/api)

```
core/
  domain/          ← Entidades, erros, value objects (sem dependências externas)
  application/     ← Use cases e ports (interfaces) — depende só do domain

infrastructure/    ← Implementações concretas (PostgreSQL, Neo4j, Redis, OpenRouter)
interface/
  graph/           ← LangGraph StateGraph + nodes
  http/            ← Fastify controllers + schemas Zod
  graphql/         ← Mercurius schema + resolvers
shared/config/     ← Env validation, ModelConfig
composition/       ← container.ts: wiring de DI
```

## LangGraph (interface/graph)

```
state.ts           ← ValkáriaStateAnnotation: tipagem de estado global
builder.ts         ← buildValkáriaGraph(): monta o StateGraph
router.ts          ← routeByIntent(): roteamento condicional
dependencies.ts    ← GraphDependencies interface
nodes/
  identifyIntentNode.ts  ← Classifica intenção do usuário
  responseNode.ts        ← Gera resposta (RAG em Fase 2)
```

Regras de extensão (seguir ao adicionar novos nós):
1. Novo nó → factory em `nodes/`, registro em `builder.ts`, rota em `router.ts`
2. Novo intent → atualizar `identifyIntent.ts`, `state.ts`, `REQUIRED_SLOTS_BY_INTENT`, `router.ts`, `builder.ts`
3. Nós importam use-cases, nunca infrastructure diretamente
4. Novos campos no state devem ser opcionais (MemorySaver backward-compat)

## Padrão de Controllers

```typescript
export function MyController(deps: MyDeps): FastifyPluginAsync {
  return async (app) => {
    app.post('/route', async (req, reply) => {
      const body = MySchema.parse(req.body)   // Zod parse, not try/catch
      const result = await deps.useCase.execute(body)
      return reply.status(200).send(result)
    })
  }
}
```

## Error Hierarchy

```
AppError (base)
  ├── NotFoundError (404)
  ├── ValidationError (400)
  ├── UnauthorizedError (401)
  ├── ForbiddenError (403)
  ├── ConflictError (409)
  ├── InfrastructureError (500)
  ├── RepositoryError (500)
  └── AIProviderError (502)
```

O `errorHandler.ts` global captura todos — não adicionar try/catch por rota.

## Banco de Dados

| Banco | Uso |
|---|---|
| PostgreSQL + pgvector | Dados relacionais + busca semântica |
| Neo4j | Grafo de relacionamentos entre entidades do universo |
| Redis | Cache de sessões e rate limiting |

Tabela `langchain_pg_embedding` é compatível com LangChain PGVectorStore.

## OpenRouter Provider

Configurado via `ModelConfig` — nunca hardcode de modelo no código.

```typescript
const model = aiProvider.getModelForTask('chat')  // sempre via tarefa
```

Fallback strategy: Fase 2 implementará retry com `fallbackModel` quando o modelo primário falhar.

## Decisões de Design

| ADR | Decisão | Motivo |
|---|---|---|
| ADR-001 | Mercurius sobre Apollo Server | Performance nativa Fastify, menos overhead |
| ADR-002 | container.ts único | Simples, sem magic, 100% testável |
| ADR-003 | AppError hierarchy (não Result type) | Consistência com padrão existente nos skills |
| ADR-004 | langchain_pg_embedding table | Compatibilidade futura com LangChain PGVectorStore |
| ADR-005 | Zod de `zod/v3` | Consistência com projeto anterior |
| ADR-006 | MemorySaver para checkpointing | State persistido entre turns sem banco adicional |
