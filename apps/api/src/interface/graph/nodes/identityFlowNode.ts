import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import type { SessionContext } from '../../../core/application/ports/SessionContextStore.js'
import { Role } from '../../../core/domain/value-objects/Role.js'

function buildDefaultSession(threadId: string): SessionContext {
  return {
    threadId,
    currentRole: 'guest',
    validationState: 'pending',
    affinityContext: [],
    recentContext: [],
    lastUpdated: new Date().toISOString(),
  }
}

export function identityFlowNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    try {
      const { intent, slots, sessionContext } = state
      const threadId = sessionContext?.threadId ?? slots.previousContext ?? 'unknown'

      // ── DM identification ───────────────────────────────────────────────────
      if (intent === 'identify_dm') {
        // The actual DM password verification happens on the next turn
        // when slots.pendingAnswer carries the password
        if (sessionContext?.validationState === 'challenged' && slots.pendingAnswer) {
          try {
            const result = await deps.authenticateDMUseCase.execute(slots.pendingAnswer)
            const updatedSession: SessionContext = {
              ...(sessionContext ?? buildDefaultSession(threadId)),
              currentRole: Role.DM,
              validationState: 'validated',
              lastUpdated: new Date().toISOString(),
            }
            await deps.sessionContextStore.save(updatedSession)
            return {
              sessionContext: updatedSession,
              actionData: result,
              aggregatedContext: JSON.stringify({
                directive: 'dm_authenticated',
                instruction:
                  'O Mestre foi autenticado com sucesso. Dê-lhe as boas-vindas com tom solene e narrativo.',
              }),
            }
          } catch {
            const updatedSession: SessionContext = {
              ...(sessionContext ?? buildDefaultSession(threadId)),
              validationState: 'denied',
              lastUpdated: new Date().toISOString(),
            }
            await deps.sessionContextStore.save(updatedSession)
            return {
              sessionContext: updatedSession,
              aggregatedContext: JSON.stringify({
                directive: 'dm_auth_failed',
                instruction: 'A senha do Mestre está incorreta. Informe que pode tentar novamente.',
              }),
            }
          }
        }

        // First turn — request DM password
        const challenged: SessionContext = {
          ...(sessionContext ?? buildDefaultSession(threadId)),
          validationState: 'challenged',
          lastUpdated: new Date().toISOString(),
        }
        await deps.sessionContextStore.save(challenged)
        return {
          sessionContext: challenged,
          aggregatedContext: JSON.stringify({
            directive: 'ask_dm_password',
            instruction:
              'Solicite ao Mestre a senha de forma narrativa e imersiva. Mantenha o tom de oráculo guardião.',
          }),
        }
      }

      // ── Player identification ───────────────────────────────────────────────
      if (intent === 'identify_player') {
        const validationState = sessionContext?.validationState ?? 'pending'

        // Already validated — welcome back
        if (validationState === 'validated') {
          return {
            aggregatedContext: JSON.stringify({
              directive: 'identity_already_validated',
              playerName: sessionContext?.playerName ?? 'aventureiro',
              instruction: `O jogador já foi autenticado como ${sessionContext?.playerName ?? 'aventureiro'}. Dê-lhe boas-vindas de volta com tom narrativo.`,
            }),
          }
        }

        // Turn 2 — validate answer against the challenge
        if (validationState === 'challenged' && slots.pendingAnswer) {
          const challengeId = sessionContext?.challengeId
          if (!challengeId) {
            return {
              aggregatedContext: JSON.stringify({
                directive: 'identity_challenge_expired',
                instruction:
                  'O desafio de identidade expirou ou não foi encontrado. Peça ao jogador que declare seu nome novamente.',
              }),
            }
          }
          try {
            const result = await deps.validatePlayerAuthUseCase.execute({
              challengeId,
              answer: slots.pendingAnswer,
            })
            const validated: SessionContext = {
              ...(sessionContext ?? buildDefaultSession(threadId)),
              currentRole: Role.PLAYER,
              validationState: 'validated',
              playerId: result.playerId,
              playerName: result.playerName,
              challengeId: undefined,
              lastUpdated: new Date().toISOString(),
            }
            await deps.sessionContextStore.save(validated)
            return {
              sessionContext: validated,
              playerId: result.playerId,
              playerRole: Role.PLAYER,
              actionData: result,
              aggregatedContext: JSON.stringify({
                directive: 'identity_validated',
                playerName: result.playerName,
                instruction: `A identidade de ${result.playerName} foi confirmada! Dê-lhe as boas-vindas com tom épico e narrativo.`,
              }),
            }
          } catch {
            const denied: SessionContext = {
              ...(sessionContext ?? buildDefaultSession(threadId)),
              validationState: 'denied',
              challengeId: undefined,
              lastUpdated: new Date().toISOString(),
            }
            await deps.sessionContextStore.save(denied)
            return {
              sessionContext: denied,
              aggregatedContext: JSON.stringify({
                directive: 'identity_denied',
                instruction:
                  'A resposta ao desafio de identidade não foi convincente. Informe narrativamente que a identidade não pôde ser confirmada e que pode tentar novamente.',
              }),
            }
          }
        }

        // Turn 1 — issue challenge
        const characterName = slots.characterName ?? 'aventureiro'
        try {
          const challenge = await deps.initiatePlayerAuthUseCase.execute(characterName)
          const challenged: SessionContext = {
            ...(sessionContext ?? buildDefaultSession(threadId)),
            validationState: 'challenged',
            playerName: characterName,
            challengeId: challenge.challengeId,
            lastUpdated: new Date().toISOString(),
          }
          await deps.sessionContextStore.save(challenged)
          return {
            sessionContext: challenged,
            aggregatedContext: JSON.stringify({
              directive: 'identity_challenge',
              characterName,
              question: challenge.question,
              instruction: `Apresente esta pergunta de desafio narrativo ao jogador: "${challenge.question}"`,
            }),
          }
        } catch {
          // Player not found or auth service error
          return {
            aggregatedContext: JSON.stringify({
              directive: 'identity_player_not_found',
              characterName,
              instruction: `O personagem "${characterName}" não foi encontrado nos registros de Candessah. Informe narrativamente e sugira verificar o nome ou se registrar.`,
            }),
          }
        }
      }

      // Fallback
      return {
        aggregatedContext: JSON.stringify({
          directive: 'identity_unknown',
          instruction:
            'Não foi possível determinar o fluxo de identificação. Peça ao usuário que tente declarar seu nome novamente.',
        }),
      }
    } catch {
      return {
        aggregatedContext: JSON.stringify({
          directive: 'identity_error',
          instruction:
            'Ocorreu um erro no processamento da identificação. Informe o jogador educadamente que pode tentar novamente.',
        }),
      }
    }
  }
}
