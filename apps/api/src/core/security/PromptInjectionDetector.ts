export interface DetectionResult {
  isInjection: boolean
  score: number
  patterns: string[]
}

interface InjectionPattern {
  name: string
  regex: RegExp
  weight: number
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    name: 'override_instructions',
    regex: /ignore\s+(previous|above|all)\s+instructions?/i,
    weight: 0.4,
  },
  {
    name: 'malicious_roleplay',
    regex: /(you\s+are\s+now|act\s+as|pretend\s+(you\s+are|to\s+be))(?!.*valkaria)/i,
    weight: 0.3,
  },
  {
    name: 'system_exfiltration',
    regex: /(system\s+prompt|your\s+instructions|your\s+rules)/i,
    weight: 0.35,
  },
  {
    name: 'bypass_attempt',
    regex: /(jailbreak|DAN|developer\s+mode|ignore\s+(your|all)\s+(rules|constraints))/i,
    weight: 0.5,
  },
  {
    name: 'code_injection',
    regex: /(```|\<script|\<\/script|eval\(|exec\()/i,
    weight: 0.3,
  },
  {
    name: 'sensitive_data_extraction',
    regex: /(database|password|secret|api.?key|token)/i,
    weight: 0.2,
  },
  {
    name: 'delimiter_injection',
    regex: /(\[INST\]|\[\/INST\]|<\|im_start\|>|<\|endoftext\|>|###)/i,
    weight: 0.45,
  },
  // Valkária-specific attack vectors in Brazilian Portuguese
  {
    name: 'identity_override_pt',
    regex: /(como\s+(mestre|dm|narrador|admin)\s+me\s+diga|agir?\s+como\s+(dm|mestre|narrador|admin|sistema)|esquece?\s+(as\s+)?regras|sair?\s+do\s+personagem|revelar?\s+(o\s+)?(sistema|instruções|prompt|regras))/i,
    weight: 0.55,
  },
  {
    name: 'context_exfiltration_pt',
    regex: /(mostre?\s+(o\s+)?(seu\s+)?(prompt|contexto|instruções)|qual\s+(é\s+)?(o\s+)?(seu|teu)\s+prompt|repita\s+(as\s+)?instruções|me\s+diga\s+(o\s+que\s+)?(você\s+)?(foi|é)\s+programad)/i,
    weight: 0.4,
  },
  {
    name: 'override_instructions_pt',
    regex: /(ignor[ea]\s+(as\s+)?(instruções|regras|restrições)\s+(anteriores?|acima)|desconsider[ae]\s+tudo|nova\s+instrução|novo\s+comando)/i,
    weight: 0.4,
  },
]

export class PromptInjectionDetector {
  static detect(input: string): DetectionResult {
    const matched: string[] = []
    let accumulatedScore = 0

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(input)) {
        matched.push(pattern.name)
        accumulatedScore += pattern.weight
      }
    }

    // Clamp score to [0, 1]
    const score = Math.min(accumulatedScore, 1)

    if (matched.length > 0) {
      console.warn('[SecurityGuardrail] Suspicious patterns detected', {
        patterns: matched,
        score,
      })
    }

    return {
      isInjection: score >= 0.6,
      score,
      patterns: matched,
    }
  }
}
