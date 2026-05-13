import type { ValkáriaState } from './state.js'

export function routeByIntent(state: ValkáriaState): string {
  switch (state.intent) {
    case 'ask_character':
      return 'response'
    case 'ask_location':
      return 'response'
    case 'ask_lore':
      return 'response'
    case 'chat':
      return 'response'
    case 'unknown':
    default:
      return 'response'
  }
}
