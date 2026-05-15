import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

export function feedbackNode(deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    const { playerId, slots, lastRecommendedNpcs } = state

    if (!playerId) {
      return {
        response:
          'Você precisa se identificar antes de avaliar recomendações, aventureiro. Diga seu nome para continuar.',
      }
    }

    const npcName = slots.affinityTarget ?? lastRecommendedNpcs[0]
    const sentiment = slots.feedbackSentiment

    if (!npcName) {
      return {
        response:
          'Não consegui identificar sobre qual NPC você está dando feedback. Mencione o nome do personagem na sua resposta.',
      }
    }

    if (!sentiment) {
      return {
        response:
          'Não ficou claro se a recomendação foi útil ou não. Pode dizer se faz sentido ou não para o seu personagem?',
      }
    }

    const helpful = sentiment === 'positive'

    try {
      await deps.feedbackRepository.save(playerId, npcName, helpful)
    } catch {
      return {
        response: `Não consegui registrar seu feedback sobre ${npcName}. Tente novamente mais tarde.`,
      }
    }

    const responseText = helpful
      ? `Anotado, aventureiro! Vou lembrar que ${npcName} é uma boa combinação para o seu perfil. As próximas recomendações levarão isso em conta.`
      : `Entendido. Vou reduzir a relevância de ${npcName} nas próximas recomendações para o seu personagem.`

    return { response: responseText }
  }
}
