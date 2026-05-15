import { z } from 'zod'

export const IntentSchema = z.enum([
  // Identity flows
  'identify_player',       // "Sou a Nymeria" / "Eu sou [nome do personagem]"
  'identify_dm',           // "Sou o Mestre" / "I am the DM"

  // Character / NPC queries
  'ask_character',         // Quem é X? / Me fale sobre X
  'ask_relationship',      // Qual a relação entre X e Y? / X conhece Y?
  'ask_benefits',          // Quais os benefícios de X? / O que X oferece?
  'ask_affinity',          // Qual minha afinidade com X? / Já tenho cordial com X?

  // Location queries
  'ask_location',          // Onde fica X? / Me fale sobre o bosque

  // Lore queries
  'ask_lore',              // História de Candessah / Lore do mundo

  // Search & discovery
  'search_npcs',           // Quais NPCs existem? / NPCs com druida
  'search_locations',      // Quais locais existem? / Locais para cura

  // Recommendations
  'ask_recommendation',    // Me recomende um NPC / Qual NPC combina comigo?
  'recommend_npcs',        // Recomendação baseada no perfil do personagem — "Com quem devo interagir?"
  'feedback_recommendation', // Feedback sobre recomendação — "Essa recomendação faz sentido" / "Não combina"

  // Affinity actions
  'increase_affinity',     // Quero aumentar afinidade com X / Presentear X

  // Memory queries
  'ask_memory',            // O que conversamos? / Me lembro de ter falado sobre...

  // Generic & fallback
  'chat',                  // Conversa genérica, cumprimentos
  'unknown',               // Não identificado
])

export type Intent = z.infer<typeof IntentSchema>

export const ComplexitySchema = z.enum(['simple', 'complex', 'multistep'])
export type Complexity = z.infer<typeof ComplexitySchema>

export const SlotsSchema = z.object({
  characterName: z.string().optional(),
  locationName: z.string().optional(),
  topic: z.string().optional(),
  previousContext: z.string().optional(),
  affinityTarget: z.string().optional(),
  recommendationFilters: z.string().optional(),
  pendingAnswer: z.string().optional(),
  feedbackSentiment: z.enum(['positive', 'negative']).optional(),
  // Graph / lore query slots
  requestedEntity: z.enum(['npc', 'location']).optional(),
  requestedFields: z.array(z.string()).optional(),
  relationshipTarget: z.string().optional(),  // second NPC for relationship queries
})

export type Slots = z.infer<typeof SlotsSchema>

export const IntentResponseSchema = z.object({
  intent: IntentSchema,
  slots: SlotsSchema,
  confidence: z.number().min(0).max(1),
  complexity: ComplexitySchema,
  requiresRetrieval: z.boolean(),
})

export type IntentResponse = z.infer<typeof IntentResponseSchema>

// Intents that require specific slots before retrieval
export const REQUIRED_SLOTS_BY_INTENT: Partial<Record<Intent, (keyof Slots)[]>> = {
  ask_character: ['characterName'],
  ask_relationship: ['characterName'],
  ask_benefits: ['characterName'],
  ask_affinity: ['affinityTarget'],
  ask_location: ['locationName'],
  increase_affinity: ['affinityTarget'],
  feedback_recommendation: ['feedbackSentiment'],
}

// Intents that always need multistep orchestration
export const MULTISTEP_INTENTS: Intent[] = [
  'ask_recommendation',
  'ask_relationship',
  'increase_affinity',
]

export function getSystemPrompt(): string {
  return JSON.stringify({
    role: 'You are an intent classifier for ValkariaChatBot — an RPG chatbot set in Valkária, a fantasy universe. The city of Candessah is a resting hub with NPCs that players can befriend through an affinity system.',
    intents: {
      identify_player: 'User claims to be a character — "Sou a Nymeria", "I am Kael", "Me chamo Viridiane"',
      identify_dm: 'User claims to be the Dungeon Master — "Sou o Mestre", "I am the DM"',
      ask_character: 'User asks about a specific NPC/character — who they are, their personality, appearance',
      ask_relationship: 'User asks about the relationship between two characters or between themselves and an NPC',
      ask_benefits: 'User asks about benefits, services, or rewards from an NPC at different affinity levels',
      ask_affinity: 'User asks about current affinity level or score with an NPC',
      ask_location: 'User asks about a specific location in Candessah — its description, purpose, or services',
      ask_lore: 'User asks about world lore, history, or general Valkária knowledge',
      search_npcs: 'User searches for NPCs matching criteria — class, location, personality, interests',
      search_locations: 'User searches for locations matching a purpose — healing, training, shopping',
      ask_recommendation: 'User asks for NPC recommendations based on their character class, personality, or interests',
      recommend_npcs: 'User explicitly asks to be matched with NPCs based on their character profile — "Com quem devo interagir?", "Que NPC combina comigo?"',
      feedback_recommendation: 'User evaluates a previous recommendation — "essa recomendação faz sentido", "não combina comigo", "boa sugestão"',
      increase_affinity: 'User wants to interact with or gift an NPC to increase affinity',
      ask_memory: 'User asks about previous conversation context or past interactions',
      chat: 'Generic conversation, greetings, thanks, or off-topic',
      unknown: 'Cannot determine intent with confidence',
    },
    complexity_rules: {
      simple: 'Single entity lookup — one NPC, one location, direct question',
      complex: 'Multiple entities or requires cross-referencing (e.g. relationship between two NPCs)',
      multistep: 'Requires planning and multiple retrieval steps (e.g. recommendations, affinity actions)',
    },
    slot_extraction: [
      'characterName: full or partial NPC name mentioned (e.g. "Aaliyah", "a florista", "o armeiro")',
      'locationName: location in Candessah (e.g. "bosque", "taverna", "biblioteca")',
      'topic: subject of lore question or interest/theme filter (e.g. "herbalism", "combat")',
      'affinityTarget: NPC name when action targets an NPC for affinity',
      'recommendationFilters: free-text describing what the user is looking for',
      'pendingAnswer: the user answer when they are responding to an identity challenge',
      'feedbackSentiment: "positive" if user approves the recommendation, "negative" if they reject it — only for feedback_recommendation intent',
      'requestedEntity: "npc" or "location" — entity type the user is asking about',
      'requestedFields: array of field names the user explicitly wants (e.g. ["name","interests","location"]). Valid NPC fields: name, description, personality, location, interests, faction. Valid location fields: name, description, short_description, services.',
      'relationshipTarget: second NPC name when asking about relationship between two characters',
    ],
    output_format: 'Respond with a valid JSON object only. No explanation, no markdown.',
  })
}

export function getUserPromptTemplate(userMessage: string, sessionContext?: string): string {
  const payload: Record<string, string> = {
    message: userMessage,
    task: 'Classify intent, extract slots, assess complexity, and determine if retrieval is needed.',
  }
  if (sessionContext) {
    payload.session_context = sessionContext
  }
  return JSON.stringify(payload)
}
