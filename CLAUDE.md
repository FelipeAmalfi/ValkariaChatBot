# ValkariaChatBot — Claude Code Guide

## Visão Geral

Monorepo pnpm + Turbo. RPG chatbot com NPCs inteligentes via LangGraph.

```
apps/
  api/    Fastify + Mercurius (GraphQL) + LangGraph
  web/    Next.js 15 + Apollo Client
packages/
  shared/ Tipos compartilhados
infrastructure/
  docker/ docker-compose (Postgres/pgvector, Redis, Neo4j)
```

## Setup Local

### Pré-requisitos

- Node 20+, pnpm 9+, Docker

### 1. Dependências

```bash
pnpm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas chaves (OpenRouter obrigatório)
```

Variáveis obrigatórias para rodar localmente:

| Variável | Onde obter |
|---|---|
| `OPENROUTER_API_KEY` | openrouter.ai |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `DM_PASSWORD` | qualquer string ≥8 chars |

### 3. Subir infraestrutura local

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### 4. Rodar em dev

```bash
pnpm dev          # API (porta 3001) + Web (porta 3000) em paralelo
```

## Testes

```bash
pnpm test          # Vitest — todos os workspaces
pnpm typecheck     # TypeScript — todos os workspaces
pnpm lint          # ESLint
pnpm build         # Build de produção (valida tudo)
```

## Arquitetura da API

Clean Architecture por camada:

```
src/
  core/           Entidades e interfaces de domínio
  application/    Use cases
  infrastructure/ Repositórios (Postgres, Neo4j, Redis)
  interface/      HTTP controllers + GraphQL resolvers
  composition/    container.ts — wiring de DI
  shared/         config/env.ts — Zod env validation
```

O grafo LangGraph fica em `src/infrastructure/ai/graph/`.

## Deploy

| Serviço | Plataforma | Trigger |
|---|---|---|
| Web (`apps/web`) | Vercel | Push para `main` (auto via GitHub integration) |
| API (`apps/api`) | Render | Manual via dashboard (após CI verde) |
| PostgreSQL + pgvector | Supabase | — |
| Neo4j | Neo4j Aura Free | — |
| Redis | Upstash | — |

### Variáveis de produção

Veja `.env.production.example` — copie cada bloco para o dashboard do serviço correspondente.

### Render — comando de build

```
pnpm install --frozen-lockfile && pnpm --filter @valkaria/shared build && pnpm --filter @valkaria/api build
```

Render injeta `PORT` automaticamente; o servidor lê via `API_PORT ?? PORT`.

### Vercel — monorepo

Configure no dashboard:
- **Root Directory**: `apps/web`
- **Framework**: Next.js
- **Build Command**: `cd ../.. && pnpm --filter @valkaria/shared build && pnpm --filter @valkaria/web build`

## Decisões Relevantes

- **CORS**: `FRONTEND_URL` no Render deve ser a URL exata do Vercel (ex: `https://valkaria.vercel.app`).
- **Cookies cross-origin**: qualquer `reply.setCookie` em produção deve usar `{ sameSite: 'none', secure: true }`.
- **Auth narrativa**: jogadores se autenticam por similaridade semântica de embeddings; DM por senha via `DM_PASSWORD`.
- **Sessão**: armazenada no Redis, acessada por `x-thread-id` header — sem cookies de sessão.
