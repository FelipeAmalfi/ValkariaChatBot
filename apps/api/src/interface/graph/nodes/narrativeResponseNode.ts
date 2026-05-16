import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'
import type { SessionContext } from '../../../core/application/ports/SessionContextStore.js'

const NARRATOR_PERSONA =
  'Você é o narrador de Candessah, uma cidade de repouso em Valkária — um mundo de fantasia rico em lore. ' +
  'Responda SEMPRE em português brasileiro. Mantenha um tom narrativo de RPG, evocativo e imersivo. ' +
  'Nunca invente fatos além do contexto fornecido. ' +
  'Se não tiver informação suficiente, diga que não sabe mas mantenha o tom narrativo.'

const FALLBACK_RESPONSE =
  'Os ventos de Candessah sussurram, mas não trazem resposta desta vez. Tente reformular sua pergunta, aventureiro.'

const MEMORY_SUMMARY_MAX_CHARS = 300

function buildSystemPrompt(sessionContext?: SessionContext): string {
  const lines: string[] = [NARRATOR_PERSONA]

  if (sessionContext) {
    const { currentRole, playerName, memorySummary, recentContext } = sessionContext

    // Role-based contextualisation
    if (currentRole === 'DM') {
      lines.push(
        '\nVocê está falando com o Mestre. Forneça detalhes completos: motivações ocultas de NPCs, ' +
        'informações de bastidores, dados de afinidade e contexto narrativo profundo.',
      )
    } else if (currentRole === 'PLAYER') {
      lines.push(
        `\nVocê está falando com o jogador${playerName ? ` ${playerName}` : ' aventureiro'}. ` +
        'Mantenha o tom narrativo e revele apenas o que o personagem poderia saber no mundo.',
      )
    } else {
      lines.push(
        '\nO visitante ainda não se identificou. Trate-o como um forasteiro misterioso. ' +
        'Convide-o gentilmente a se apresentar como jogador ou mestre quando apropriado.',
      )
    }

    // Memory injection
    if (memorySummary) {
      const trimmed = memorySummary.slice(0, MEMORY_SUMMARY_MAX_CHARS)
      lines.push(`\nHistórico da sessão: ${trimmed}`)
    }
    if (recentContext.length > 0) {
      const recent = recentContext.slice(-3).join(' | ')
      lines.push(`\nContexto recente: ${recent}`)
    }
  }

  return lines.join('\n')
}

function buildUserPrompt(state: ValkáriaState): string {
  const parts: string[] = []

  if (state.aggregatedContext) {
    parts.push(`Contexto recuperado:\n${state.aggregatedContext}`)
  }

  if (state.retrievalError) {
    parts.push(
      `Nota: a recuperação de contexto falhou (${state.retrievalError}). ` +
      'Responda com o que você sabe ou admita que não tem informação suficiente, mantendo o tom narrativo.',
    )
  }

  parts.push(`Mensagem do usuário: ${state.message}`)

  if (state.intent) {
    parts.push(`Intent identificada: ${state.intent}`)
  }

  if (state.intent === 'recommend_npcs') {
    parts.push(
      'Formate a resposta como uma recomendação narrativa. ' +
      'Para cada NPC recomendado, escreva uma frase evocativa que conecte o personagem ao perfil do jogador. ' +
      'Comece com uma abertura imersiva como "Os ventos de Candessah te guiam até..." ou similar. ' +
      'Apresente no máximo 3 NPCs. Não liste dados brutos — traduza em narrativa.',
    )
  }

  parts.push('Responda em português brasileiro, com tom narrativo de RPG.')

  return parts.join('\n\n')
}

export function narrativeResponseNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    try {
      const aiResponse = await deps.aiProvider.complete({
        messages: [
          { role: 'system', content: buildSystemPrompt(state.sessionContext) },
          { role: 'user', content: buildUserPrompt(state) },
        ],
        task: 'chat',
        temperature: 0.7,
      })

      console.log(JSON.stringify({
        event: 'response_generated',
        intent: state.intent,
        role: state.sessionContext?.currentRole ?? 'guest',
        hasMemory: !!state.sessionContext?.memorySummary,
        contextLength: state.aggregatedContext?.length ?? 0,
      }))

      return { response: aiResponse.content }
    } catch {
      return { response: FALLBACK_RESPONSE }
    }
  }
}
