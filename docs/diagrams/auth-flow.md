# Fluxo de Autenticação

O sistema tem dois tipos de autenticação: **jogadores** (identidade narrativa via embeddings) e **DM** (senha via variável de ambiente).

## Autenticação de Jogador — Semântica por Embeddings

A autenticação não usa senha. O jogador prova quem é respondendo uma pergunta sobre o background do seu personagem. A resposta é validada por similaridade cossenoidal com o embedding do campo original.

```mermaid
sequenceDiagram
    actor Jogador
    participant API as API (Fastify)
    participant UC as InitiatePlayerAuth<br/>UseCase
    participant DB as PostgreSQL<br/>(players)
    participant AI as OpenRouter<br/>(Embeddings)
    participant Redis as Redis<br/>(Auth Challenges)
    participant JWT as JwtTokenService

    Jogador->>API: POST /auth/initiate<br/>{ playerName: "Nymeria" }
    API->>UC: execute({ playerName })
    UC->>DB: findByName("Nymeria")
    DB-->>UC: Player { background, personality, interests }

    UC->>UC: Sorteia campo aleatório<br/>(background | personality | interests)
    UC->>AI: embed(campo_selecionado)
    AI-->>UC: fieldEmbedding[1536]

    UC->>AI: complete(generateAuthQuestion prompt)<br/>com conteúdo do campo
    AI-->>UC: pergunta narrativa gerada

    UC->>Redis: save(AuthChallenge)<br/>TTL = 5 min
    Redis-->>UC: ok

    UC-->>API: { challengeId, question, playerName }
    API-->>Jogador: { challengeId, question }

    Note over Jogador: Jogador lê a pergunta e<br/>responde como seu personagem

    Jogador->>API: POST /auth/validate<br/>{ challengeId, answer: "Vim de..." }
    API->>UC2: ValidatePlayerAuthUseCase.execute
    UC2->>Redis: find(challengeId)
    Redis-->>UC2: AuthChallenge { fieldEmbedding, playerId, expiresAt }

    UC2->>UC2: Verifica expiração

    UC2->>AI: embed(answer)
    AI-->>UC2: answerEmbedding[1536]

    UC2->>UC2: cosineSimilarity(fieldEmbedding, answerEmbedding)
    Note over UC2: threshold = SEMANTIC_AUTH_THRESHOLD (0.6)

    alt Similaridade ≥ threshold
        UC2->>Redis: delete(challengeId)
        UC2->>JWT: sign({ playerId, role: PLAYER })
        JWT-->>UC2: token
        UC2-->>API: { token, playerId, playerName }
        API-->>Jogador: { token } ✅
    else Similaridade < threshold
        UC2-->>API: UnauthorizedError
        API-->>Jogador: 401 Unauthorized ❌
    end
```

## Autenticação de DM — Senha

O Dungeon Master autentica com uma senha definida em variável de ambiente (`DM_PASSWORD`). Sem banco de dados envolvido.

```mermaid
sequenceDiagram
    actor DM
    participant API as API (Fastify)
    participant UC as AuthenticateDMUseCase
    participant JWT as JwtTokenService

    DM->>API: POST /auth/dm<br/>{ password: "..." }
    API->>UC: execute({ password })

    UC->>UC: comparação com process.env.DM_PASSWORD

    alt Senha correta
        UC->>JWT: sign({ role: DM })
        JWT-->>UC: token
        UC-->>API: { token, role: 'DM' }
        API-->>DM: { token } ✅
    else Senha errada
        UC-->>API: UnauthorizedError
        API-->>DM: 401 Unauthorized ❌
    end
```

## Auth Narrativa no LangGraph (identityFlowNode)

Quando o intent é `identify_player` ou `identify_dm`, o grafo gerencia o fluxo de autenticação em **dois turnos**:

```mermaid
sequenceDiagram
    actor Jogador
    participant Graph as LangGraph
    participant Session as Redis Session

    Jogador->>Graph: "Sou Nymeria"
    Graph->>Graph: identifyIntent → identify_player
    Graph->>Graph: identityFlowNode (turno 1)
    Graph->>Graph: InitiatePlayerAuthUseCase
    Graph-->>Jogador: "Nymeria, [pergunta narrativa]?"
    Graph->>Session: salva challengeId na sessão

    Jogador->>Graph: "Vim das montanhas de Vael..."
    Graph->>Graph: identifyIntent → identify_player<br/>slots.pendingAnswer = resposta
    Graph->>Graph: identityFlowNode (turno 2)
    Graph->>Graph: ValidatePlayerAuthUseCase
    Session-->>Graph: challengeId

    alt Validado
        Graph->>Session: atualiza validationState = 'validated'<br/>salva playerId, playerRole
        Graph-->>Jogador: "Bem-vinda, Nymeria!" ✅
    else Negado
        Graph->>Session: atualiza validationState = 'denied'
        Graph-->>Jogador: "Não reconheço você..." ❌
    end
```

## Middleware de Autenticação HTTP

Para rotas protegidas, o `authMiddleware` valida o JWT do header `Authorization: Bearer <token>`:

```
Request → authMiddleware → verifica JWT → injeta request.user { playerId, role }
                        ↓ token inválido → 401 UnauthorizedError
```

O `x-thread-id` header (não cookie) identifica a sessão LangGraph — sem cookies de sessão.

## Segurança Adicional

| Mecanismo | Onde | Propósito |
|-----------|------|-----------|
| `InputSanitizer` | sanitizeNode | Remove padrões perigosos antes de qualquer processamento |
| `PromptInjectionDetector` | sanitizeNode | Detecta tentativas de injeção de prompt |
| `CypherGuardrail` | cypherExecuteNode | Valida queries Cypher antes de executar no Neo4j |
| Rate limiting | Fastify global | `@fastify/rate-limit` — 100 req/min por IP (padrão) |
| Helmet | Fastify global | Headers de segurança HTTP |
