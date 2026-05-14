import { InputSanitizer } from './InputSanitizer.js'
import { PromptInjectionDetector } from './PromptInjectionDetector.js'

export interface GuardrailResult {
  allowed: boolean
  sanitizedInput: string
  injectionScore: number
  blockedPatterns: string[]
  reason?: string
}

export class SecurityGuardrail {
  static readonly INJECTION_THRESHOLD = 0.6

  static check(rawInput: string): GuardrailResult {
    const sanitized = InputSanitizer.sanitize(rawInput)
    const detection = PromptInjectionDetector.detect(sanitized)

    if (detection.score >= SecurityGuardrail.INJECTION_THRESHOLD) {
      return {
        allowed: false,
        sanitizedInput: sanitized,
        injectionScore: detection.score,
        blockedPatterns: detection.patterns,
        reason: 'Entrada bloqueada por suspeita de manipulação do sistema.',
      }
    }

    return {
      allowed: true,
      sanitizedInput: sanitized,
      injectionScore: detection.score,
      blockedPatterns: detection.patterns,
    }
  }
}
