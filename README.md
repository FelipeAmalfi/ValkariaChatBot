# ValkáriaChatBot

Chatbot de RPG imersivo para o universo de **Valkária**. NPCs inteligentes com memória, afinidade e relacionamentos — orquestrados por um StateGraph LangGraph com 16 nós e autenticação narrativa por embeddings semânticos.

## Stack

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| Backend | Fastify v5 + TypeScript ESM | API REST + plugin de rotas |
| GraphQL | Mercurius | Schema + resolvers nativos Fastify |
| Orquestração de IA | LangGraph + LangChain.js | StateGraph com 16 nós e roteamento condicional |
| LLM / Embeddings | OpenRouter (Mistral 7B, Gemma 3) | Completions, classificação, embeddings semânticos |
| Banco relacional + vetor | PostgreSQL 15 + pgvector | Dados + busca semântica RAG |
| Banco de grafo | Neo4j 5 | Relacionamentos entre NPCs, facções e localizações |
| Cache / Sessão | Redis 7 | Sessão por thread_id, desafios de auth |
| Frontend | Next.js 15 + Apollo Client | App Router, React 19, Tailwind v4 |
| Monorepo | pnpm workspaces + Turborepo | Build paralelo com cache incremental |

## Início Rápido

**Pré-requisitos:** Node 20+, pnpm 9+, Docker

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env — mínimo obrigatório: OPENROUTER_API_KEY, JWT_SECRET, DM_PASSWORD

# 3. Subir infraestrutura local (Postgres, Redis, Neo4j)
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 4. Ingerir dados (NPCs e localizações dos CSVs)
pnpm --filter @valkaria/api ingest

# 5. Iniciar desenvolvimento
pnpm dev
```

URLs disponíveis após o passo 5:

| Serviço | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3000 |
| API (Fastify) | http://localhost:3001 |
| GraphiQL | http://localhost:3001/graphql |
| Neo4j Browser | http://localhost:7474 |

## Variáveis de Ambiente Obrigatórias

| Variável | Onde obter |
|----------|-----------|
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) — plano gratuito disponível |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `DM_PASSWORD` | qualquer string ≥ 8 chars |

Ver `.env.example` para todas as variáveis (banco, modelos, thresholds, etc).

## Scripts

```bash
pnpm dev                                    # API + Web em paralelo
pnpm build                                  # Build de produção (shared → api → web)
pnpm test                                   # Vitest em todos os workspaces
pnpm typecheck                              # tsc --noEmit em todos os workspaces
pnpm lint                                   # ESLint
pnpm --filter @valkaria/api ingest          # Pipeline CSV → PostgreSQL → Neo4j
pnpm --filter @valkaria/api graph:dev       # REPL interativo do LangGraph
```

## Desenvolvimento do Grafo LangGraph

Para testar o grafo em isolamento (sem servidor HTTP):

```bash
# Requer: Docker rodando + .env preenchido
pnpm --filter @valkaria/api graph:dev
```

Abre um prompt de chat no terminal com `thread_id` fixo (`dev-session-001`). Use `/exit` para sair.

## Estrutura do Monorepo

```
apps/
  api/          @valkaria/api — Fastify + LangGraph (porta 3001)
  web/          @valkaria/web — Next.js 15 (porta 3000)

packages/
  shared/       @valkaria/shared — Tipos TypeScript compartilhados

infrastructure/
  docker/       docker-compose.yml (Postgres/pgvector, Redis, Neo4j)
  scripts/      seed.ts, setup.sh

docs/
  architecture.md           Camadas e padrões da API
  tech-decisions.md         Por que cada tecnologia foi escolhida
  diagrams/
    monorepo.md             Estrutura e dependências do monorepo
    clean-architecture.md   Camadas, ports & adapters
    langgraph-flow.md       Fluxo completo do StateGraph (16 nós)
    database-schema.md      ERD PostgreSQL + Neo4j + Redis
    auth-flow.md            Autenticação semântica e DM
    ingestion-pipeline.md   Pipeline CSV → bancos
    deployment.md           Topologia de produção
```

## Deploy

| Serviço | Plataforma | Trigger |
|---------|-----------|---------|
| Web (`apps/web`) | Vercel | Push automático para `main` |
| API (`apps/api`) | Render | Manual via dashboard (após CI verde) |
| PostgreSQL + pgvector | Supabase | — |
| Neo4j | Neo4j Aura Free | — |
| Redis | Upstash | — |

**Build command (Render):**
```bash
pnpm install --frozen-lockfile && pnpm --filter @valkaria/shared build && pnpm --filter @valkaria/api build
```

**Vercel — configurações do dashboard:**
- Root Directory: `apps/web`
- Build Command: `cd ../.. && pnpm --filter @valkaria/shared build && pnpm --filter @valkaria/web build`

## Documentação

- [Arquitetura da API](docs/architecture.md) — Clean architecture, padrão de controllers, hierarquia de erros
- [Decisões Tecnológicas](docs/tech-decisions.md) — Por que cada tecnologia foi escolhida
- [Estrutura do Monorepo](docs/diagrams/monorepo.md)
- [Clean Architecture](docs/diagrams/clean-architecture.md) — Camadas, ports & adapters, DI
- [Fluxo LangGraph](docs/diagrams/langgraph-flow.md) — 16 nós, 4 roteadores, todos os caminhos
- [Schema de Banco de Dados](docs/diagrams/database-schema.md) — ERD PostgreSQL, Neo4j, Redis
- [Fluxo de Autenticação](docs/diagrams/auth-flow.md) — Auth semântica por embeddings + DM
- [Pipeline de Ingestão](docs/diagrams/ingestion-pipeline.md) — CSV → Postgres → Neo4j
- [Topologia de Deploy](docs/diagrams/deployment.md) — Produção e desenvolvimento local
