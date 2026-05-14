import type { CharacterRepository } from '../../../core/application/ports/CharacterRepository.js'
import type { Tool, ToolOutput } from './types.js'

interface Input {
  name: string
  [key: string]: unknown
}

export function createGetNpcByNameTool(characterRepository: CharacterRepository): Tool<Input> {
  return {
    name: 'getNpcByName',
    description: 'Busca um NPC pelo nome exato ou parcial',
    async execute(input: Input, correlationId: string): Promise<ToolOutput> {
      try {
        const character = await characterRepository.findByName(input.name)
        if (!character) {
          return { success: false, error: `NPC "${input.name}" não encontrado.`, correlationId }
        }
        return { success: true, data: character, correlationId }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          correlationId,
        }
      }
    },
  }
}
