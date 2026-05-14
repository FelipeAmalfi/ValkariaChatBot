import type { CharacterRepository } from '../../../core/application/ports/CharacterRepository.js'
import type { VectorRetriever } from '../../../core/application/ports/VectorRetriever.js'
import type { NpcAffinityRepository } from '../../../core/application/ports/NpcAffinityRepository.js'
import { createGetNpcByNameTool } from './getNpcByName.js'
import { createSearchLoreTool } from './searchLore.js'
import { createGetAffinityTool } from './getAffinity.js'
import { createIncreaseAffinityTool } from './increaseAffinity.js'
import { createRecommendNpcTool } from './recommendNpc.js'
import type { Tool, ToolRegistry } from './types.js'

export interface ToolDependencies {
  characterRepository: CharacterRepository
  vectorRetriever: VectorRetriever
  affinityRepository: NpcAffinityRepository
}

export function buildToolRegistry(deps: ToolDependencies): ToolRegistry {
  const tools: Tool[] = [
    createGetNpcByNameTool(deps.characterRepository),
    createSearchLoreTool(deps.vectorRetriever),
    createGetAffinityTool(deps.affinityRepository),
    createIncreaseAffinityTool(deps.affinityRepository),
    createRecommendNpcTool(deps.vectorRetriever, deps.affinityRepository),
  ]

  const registry: ToolRegistry = new Map()
  for (const tool of tools) {
    registry.set(tool.name, tool)
  }
  return registry
}
