# ValkáriaChatBot

Chatbot de RPG baseado no universo de Valkária, construído com LangGraph, RAG, Neo4j, e OpenRouter.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Fastify v5 + TypeScript + Mercurius (GraphQL) |
| IA | LangChain.js + LangGraph + OpenRouter |
| Banco de dados | PostgreSQL + pgvector + Neo4j + Redis |
| Frontend | Next.js 15 + Tailwind + shadcn/ui |
| Monorepo | pnpm workspaces + Turborepo |

## Início Rápido

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite .env com suas chaves

# 3. Subir serviços
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 4. Iniciar desenvolvimento
pnpm dev
```

## Apps

- **API**: `http://localhost:3001` (Fastify + GraphQL)
- **Web**: `http://localhost:3000` (Next.js)
- **GraphiQL**: `http://localhost:3001/graphql` (dev only)
- **Neo4j Browser**: `http://localhost:7474`

## Scripts

```bash
pnpm dev          # Todos os apps em paralelo
pnpm build        # Build de produção
pnpm lint         # Lint de todos os packages
pnpm typecheck    # Verificação de tipos
pnpm test         # Testes unitários
```

## Estrutura

```
apps/
  api/   — Fastify + GraphQL + LangGraph
  web/   — Next.js + Tailwind

packages/
  shared/ — Tipos compartilhados

infrastructure/
  docker/ — Docker Compose
  scripts/ — Scripts de setup e seed
```

Veja [docs/architecture.md](docs/architecture.md) para detalhes da arquitetura.
