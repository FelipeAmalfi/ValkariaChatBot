import type { GraphDependencies } from '../dependencies.js'
import type { ValkáriaState } from '../state.js'

export function responseNode(_deps: GraphDependencies) {
  return async (state: ValkáriaState): Promise<Partial<ValkáriaState>> => {
    // Phase 2: generate dynamic responses using character data + RAG
    // For now: return a base response acknowledging the intent

    const responses: Record<string, string> = {
      chat: 'Bem-vindo ao mundo de Valkária! Como posso ajudá-lo em sua jornada?',
      ask_character: `Você perguntou sobre o personagem "${state.slots.characterName ?? '...'}". Isso será implementado na Fase 2.`,
      ask_location: `Você perguntou sobre "${state.slots.locationName ?? '...'}". O mapa de Valkária estará disponível em breve.`,
      ask_lore: `Interessante questão sobre "${state.slots.topic ?? 'o mundo'}". A lore completa de Valkária chegará na Fase 2.`,
      unknown: 'Não entendi bem sua pergunta. Pode reformular?',
    }

    const intent = state.intent ?? 'unknown'
    const response = responses[intent] ?? responses['unknown']!

    return { response }
  }
}
