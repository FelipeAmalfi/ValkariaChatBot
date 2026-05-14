import { SecurityGuardrail } from '../../../core/security/SecurityGuardrail.js'
import type { ValkáriaState } from '../state.js'

const BLOCK_MESSAGE =
  'Não consigo processar essa solicitação. Por favor, use linguagem adequada ao contexto da narrativa.'

export function sanitizeNode() {
  return (state: ValkáriaState): Partial<ValkáriaState> & { blocked?: boolean } => {
    const result = SecurityGuardrail.check(state.message)

    if (!result.allowed) {
      return {
        response: BLOCK_MESSAGE,
        blocked: true,
      }
    }

    return {
      message: result.sanitizedInput,
      blocked: false,
    }
  }
}
