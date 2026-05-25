# Topologia de Deploy

## Produção

```mermaid
graph TD
    subgraph "Usuário"
        browser["🌐 Browser"]
    end

    subgraph "Vercel (Edge Network)"
        nextjs["@valkaria/web\nNext.js 15\nauto-deploy: push main"]
    end

    subgraph "Render (Cloud Run)"
        api["@valkaria/api\nFastify v5\ndeploy: manual pós CI"]
    end

    subgraph "Supabase"
        pg["PostgreSQL + pgvector\n10 tabelas\nplano gratuito"]
    end

    subgraph "Neo4j Aura Free"
        neo4j["Neo4j 5\nGrafo de relacionamentos\nAPOC habilitado"]
    end

    subgraph "Upstash"
        redis["Redis\n256MB\nLRU eviction"]
    end

    subgraph "OpenRouter"
        llm["LLMs gratuitos\nMistral 7B / Gemma 3\nEmbeddings text-embedding-3-small"]
    end

    browser -->|"HTTPS"| nextjs
    nextjs -->|"REST + GraphQL\nHTTPS"| api
    api -->|"SSL"| pg
    api -->|"Bolt (7687)"| neo4j
    api -->|"TLS"| redis
    api -->|"HTTPS"| llm
```

## Serviços de Produção

| Serviço | Plataforma | Plano | Trigger de Deploy |
|---------|-----------|-------|-------------------|
| Web (`apps/web`) | Vercel | Free | Push automático para `main` via GitHub |
| API (`apps/api`) | Render | Free | Manual pelo dashboard após CI verde |
| PostgreSQL + pgvector | Supabase | Free | — (managed) |
| Neo4j | Neo4j Aura Free | Free | — (managed) |
| Redis | Upstash | Free | — (managed) |
| LLMs | OpenRouter | Pay-per-use | — (API) |

## Comandos de Build

### Render (API)

```bash
pnpm install --frozen-lockfile && \
pnpm --filter @valkaria/shared build && \
pnpm --filter @valkaria/api build
```

O Render injeta `PORT` automaticamente; a API lê via `API_PORT ?? PORT`.

### Vercel (Web)

Configurações no dashboard:
- **Root Directory**: `apps/web`
- **Framework**: Next.js (auto-detectado)
- **Build Command**: `cd ../.. && pnpm --filter @valkaria/shared build && pnpm --filter @valkaria/web build`

## Variáveis de Ambiente por Serviço

### Render (API)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...supabase.co/...
NEO4J_URI=neo4j+s://...databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
REDIS_URL=rediss://...upstash.io
OPENROUTER_API_KEY=sk-or-...
JWT_SECRET=<32+ chars>
DM_PASSWORD=<8+ chars>
FRONTEND_URL=https://valkaria.vercel.app
```

### Vercel (Web)

```bash
NEXT_PUBLIC_API_URL=https://valkaria-api.onrender.com
NEXT_PUBLIC_GRAPHQL_URL=https://valkaria-api.onrender.com/graphql
```

## Configurações Críticas de Produção

### CORS

`FRONTEND_URL` no Render deve ser a URL exata do Vercel (ex: `https://valkaria.vercel.app`). Sem trailing slash.

### Cookies Cross-Origin

Qualquer `reply.setCookie` em produção requer:
```typescript
{ sameSite: 'none', secure: true }
```

### Sessão

Identificada pelo header `x-thread-id` — sem cookies de sessão. O frontend envia o `threadId` retornado pela primeira resposta do chat.

## Desenvolvimento Local

```mermaid
graph LR
    subgraph "Docker (local)"
        pg_local["PostgreSQL:5432\npgvector/pgvector:pg15"]
        redis_local["Redis:6379\nredis:7-alpine"]
        neo4j_local["Neo4j:7474/7687\nneo4j:5.15"]
    end

    subgraph "Processos locais"
        api_local["API :3001\ntsx watch"]
        web_local["Web :3000\nnext dev"]
    end

    api_local --> pg_local
    api_local --> redis_local
    api_local --> neo4j_local
    web_local --> api_local
```

```bash
# Subir infra
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Rodar apps
pnpm dev
```

URLs de desenvolvimento:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **GraphiQL**: http://localhost:3001/graphql
- **Neo4j Browser**: http://localhost:7474
