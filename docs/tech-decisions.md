# Decisões Tecnológicas — ValkáriaChatBot

Cada tecnologia foi escolhida com um propósito específico. Este documento registra o raciocínio por trás de cada escolha para facilitar avaliações futuras e onboarding.

---

## Monorepo: npm workspaces + Turborepo

**Escolhido:** npm workspaces + Turborepo 2  
**Considerado:** pnpm workspaces, Yarn Berry, Nx

**Motivo:**
- npm workspaces está embutido no Node.js/npm sem instalação adicional — dependência zero de ferramentas externas
- Turborepo oferece cache de build incremental sem configuração complexa (apenas `turbo.json`) — builds paralelos com dependências declaradas
- Alternativas como Nx têm maior curva de configuração para um projeto de escopo similar

**Impacto:** `npm run dev` inicia API e Web em paralelo com um único comando; `npm run build` garante que `@valkaria/shared` seja compilado antes dos apps que dependem dele.

---

## Backend: Fastify v5

**Escolhido:** Fastify 5 + TypeScript ESM  
**Considerado:** Express 5, Hono, NestJS

**Motivo:**
- Fastify v5 é o framework Node.js mais performático em benchmarks reais (routing, serialização JSON via fast-json-stringify)
- API de plugins nativa (`FastifyPluginAsync`) facilita composição sem acoplamento — cada controller é um plugin independente
- Suporte nativo a TypeScript com decorações de tipo para `request.user` via `fastify.d.ts`
- NestJS foi descartado por adicionar overhead de decorators e IoC container — este projeto usa DI manual via `container.ts`

**Impacto:** Controllers são funções puras testáveis. O `errorHandler` global captura `AppError` e mapeia para HTTP sem try/catch por rota.

---

## GraphQL: Mercurius

**Escolhido:** Mercurius 16 (plugin Fastify nativo)  
**Considerado:** Apollo Server, GraphQL Yoga

**Motivo (ADR-001):**
- Mercurius é escrito especificamente para Fastify — usa o loop de eventos do Fastify diretamente, sem servidor HTTP separado como Apollo exige
- Menor overhead por query (~30% mais rápido em benchmarks vs Apollo Server)
- GraphiQL integrado em desenvolvimento sem configuração extra
- Apollo Server em modo standalone exige adaptação de request/reply que duplica camadas

**Impacto:** GraphQL disponível em `/graphql` com zero configuração extra além do plugin. Usado principalmente para health check e consultas ad-hoc; a maioria das operações do chat usa REST.

---

## Orquestração de IA: LangGraph (`@langchain/langgraph`)

**Escolhido:** LangGraph 1.x com `StateGraph` e `MemorySaver`  
**Considerado:** Chain simples LangChain, orquestração manual, CrewAI

**Motivo:**
- Um chatbot de RPG com 24 intents diferentes precisa de roteamento condicional — uma chain linear não suporta isso sem `if/else` manual que se torna impossível de manter
- `StateGraph` externaliza toda a lógica de estado em `ValkáriaStateAnnotation`, tornando cada nó uma função pura com inputs/outputs bem definidos
- `MemorySaver` persiste o estado completo por `thread_id` sem banco adicional — checkpointing gratuito para desenvolvimento
- A granularidade de 16 nós permite testar, modificar e monitorar cada etapa independentemente
- CrewAI e agentes multi-modelo foram descartados pela complexidade desnecessária para este caso

**Impacto:** Novos intents são adicionados criando um nó + uma branch no router — sem alterar nós existentes. O REPL `graph:dev` permite testar o grafo em isolamento.

---

## Provider de LLM: OpenRouter

**Escolhido:** OpenRouter com modelos gratuitos  
**Considerado:** OpenAI direto, Anthropic direto, Ollama local

**Motivo:**
- OpenRouter agrega múltiplos provedores com uma única API key e formato OpenAI-compatible — troca de modelo é uma variável de ambiente, sem mudança de código
- Modelos gratuitos disponíveis (`mistralai/mistral-7b-instruct:free`, `google/gemma-3-1b-it:free`) permitem desenvolvimento sem custo
- O `OpenRouterProvider` abstrai o provedor atrás do port `AIProvider` — migrar para OpenAI ou Anthropic direto requer apenas trocar a implementação no `container.ts`
- Ollama local foi considerado mas exigiria infra adicional em produção

**Impacto:** Modelo configurável por tarefa (`chat`, `classification`, `summarization`, `extraction`, `embedding`). O `ModelConfig` lido de env — nunca hardcode no código de negócio.

---

## Banco Relacional + Vetor: PostgreSQL + pgvector

**Escolhido:** PostgreSQL 15 com extensão `pgvector`  
**Considerado:** PostgreSQL + Pinecone separado, Weaviate, Qdrant

**Motivo:**
- Consolidar dados relacionais e vetoriais no mesmo banco elimina uma dependência de infraestrutura e simplifica transações
- `pgvector` com índice IVFFlat oferece performance adequada para o volume esperado (milhares de documentos) sem custo adicional
- A tabela `langchain_pg_embedding` é compatível com `LangChain PGVectorStore` — possibilidade de integração futura sem migração
- Pinecone/Weaviate separados duplicariam custos e complexidade operacional
- Em produção: Supabase oferece PostgreSQL + pgvector no plano gratuito

**Impacto:** `PgVectorRetriever` faz busca por similaridade cossenoidal com `SCORE_THRESHOLD = 0.3`. Player embeddings usam alpha-drift para evolução gradual do perfil semântico.

---

## Banco de Grafo: Neo4j

**Escolhido:** Neo4j 5 com APOC  
**Considerado:** PostgreSQL com tabelas de adjacência, Amazon Neptune, DGraph

**Motivo:**
- Relacionamentos entre NPCs (ALLIED_WITH, ENEMY_OF, MEMBER_OF) são consultas de grafo por natureza — em SQL relacional, queries multi-hop (amigos de amigos) se tornam JOINs recursivos impráticos
- Neo4j com Cypher permite queries como "NPCs que compartilham interesses com X e estão na mesma localização" em uma única linha
- O `CypherGenerateNode` usa LLM para gerar Cypher dinamicamente — Cypher é mais legível para LLMs que SQL com múltiplos JOINs
- Amazon Neptune é caro; DGraph tem menor adoção e tooling
- Em produção: Neo4j Aura Free tem 200K nós gratuitos

**Impacto:** Queries de relacionamento complexas são delegadas ao LLM via `cypherGenerate` + `cypherExecute` com retry automático e `CypherGuardrail` para segurança.

---

## Cache e Sessão: Redis

**Escolhido:** Redis 7 com ioredis  
**Considerado:** Memcached, Redis gerenciado (ElastiCache), sessão em PostgreSQL

**Motivo:**
- Sessões de conversa precisam de acesso rápido a cada turno do LangGraph — PostgreSQL adicionaria latência desnecessária para dados transitórios
- Redis TTL nativo simplifica expiração de sessões e desafios de auth (5min para challenges, 24h para sessões) sem cron jobs
- ioredis tem suporte nativo a TypeScript e reconexão automática
- A escolha de header `x-thread-id` (não cookie) para identificar sessões evita complicações de CORS e `sameSite` no frontend
- Em produção: Upstash Redis com 256MB e LRU eviction

**Impacto:** `RedisSessionContextStore` é o único ponto de leitura/escrita de sessão — `patch()` permite atualizações parciais sem sobrescrever o contexto completo.

---

## Frontend: Next.js 15 + Apollo Client

**Escolhido:** Next.js 15 (App Router) + Apollo Client 3 + Tailwind v4 + shadcn/ui  
**Considerado:** Remix, SvelteKit, React + Vite puro

**Motivo:**
- Next.js 15 com App Router oferece Server Components, cache nativo e deploy automático no Vercel sem configuração
- Apollo Client é a escolha natural para consumir a API GraphQL — cache normalizado, hooks React, e suporte a streaming
- Tailwind v4 + shadcn/ui acelera a construção de UI sem CSS custom — componentes acessíveis e customizáveis
- React 19 com Server Actions estava sendo avaliado, mas Apollo Client é mais maduro para a necessidade atual

**Impacto:** Deploy automático no Vercel a cada push em `main`. `AuthContext` gerencia estado de autenticação no cliente. Componentes de chat (`ChatWindow`, `NpcCard`, `AffinityBadge`) isolados em `components/chat/`.

---

## Autenticação: JWT + Semântica por Embeddings

**Escolhido:** JWT (jsonwebtoken) para sessão HTTP + embeddings para identidade narrativa  
**Considerado:** Auth.js (NextAuth), Passport.js, auth baseada em OTP/e-mail

**Motivo:**
- Em um RPG, o jogador **é** seu personagem — fazer login com usuário/senha quebra a imersão narrativa
- Auth semântica via embeddings permite ao jogador "provar" sua identidade respondendo como seu personagem responderia — threshold de similaridade cossenoidal configurable (`SEMANTIC_AUTH_THRESHOLD=0.6`)
- JWT stateless simplifica o backend — o token carrega `playerId` e `role` sem consulta ao banco a cada request
- Auth.js/NextAuth foi descartado por acrescentar complexidade de provider OAuth desnecessária; o projeto tem um único tipo de auth custom

**Impacto (ADR para DM):** `DM_PASSWORD` em variável de ambiente — sem tabela de credenciais no banco, sem risco de vazamento via SQL injection.

---

## DI: container.ts manual

**Escolhido:** Composição manual em `composition/container.ts`  
**Considerado:** InversifyJS, TSyringe, NestJS IoC

**Motivo (ADR-002):**
- Um único arquivo de wiring explícito é 100% rastreável — nenhuma "magia" de decorators ou reflection
- Erros de dependência circular aparecem em tempo de compilação TypeScript, não em runtime
- Frameworks de IoC adicionam overhead de decorators (`@Injectable`, `@Inject`) que aumentam o boilerplate sem benefício proporcional para este tamanho de projeto
- O `container.ts` serve como mapa de toda a arquitetura — novo desenvolvedor entende o sistema lendo um único arquivo

**Impacto:** `GraphDependencies` é um subset explícito do container passado ao grafo — os nós recebem apenas o que precisam, sem acesso ao container completo.

---

## Checkpointing LangGraph: MemorySaver

**Escolhido:** `MemorySaver` (in-memory) do LangGraph  
**Considerado:** `PostgresSaver`, `RedisSaver`, nenhum checkpointing

**Motivo (ADR-006):**
- `MemorySaver` persiste o estado completo do `ValkáriaStateAnnotation` por `thread_id` sem banco adicional em desenvolvimento
- Os campos de ação (`actionSuccess`, `actionError`, `actionData`) são resetados a cada turno via reducer — o checkpointer persiste o restante automaticamente
- Slots acumulam entre turnos (`{ ...prev, ...newSlots }`) — isso é comportamento do reducer, não do checkpointer
- Migração para `PostgresSaver` em produção é possível trocando a instância no `container.ts` sem alterar nenhum nó

**Impacto:** `dev-session-001` é o thread fixo no REPL `graph:dev` — permite retomar conversas de teste sem reiniciar o processo.

---

## Versionamento de Prompts: `prompts/v1/`

**Escolhido:** Diretórios versionados (`v1/`, `v2/`, ...)  
**Considerado:** Variáveis de ambiente, banco de dados de prompts, sem versionamento

**Motivo:**
- Prompts são código — mudanças têm impacto direto no comportamento do sistema e devem ser rastreadas no git
- Diretórios versionados permitem A/B testing e rollback imediato sem deploy
- A convenção `getSystemPrompt()` / `getUserPromptTemplate()` padroniza a interface de prompts independente do conteúdo

**Impacto:** Ao evoluir um prompt, cria-se `v2/` sem remover `v1/`. O nó que usa o prompt seleciona a versão explicitamente.
