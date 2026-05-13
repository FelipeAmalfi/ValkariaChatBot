import { z } from 'zod'

// Phase 2 will expand this with full Valkaria-specific intents.
// Following the pattern from skills: IntentSchema defines the exact enum
// that must be mirrored in src/interface/graph/state.ts.

export const IntentSchema = z.enum([
  'chat',            // Generic conversation
  'ask_character',   // Questions about NPCs/characters
  'ask_location',    // Questions about world locations
  'ask_lore',        // World lore and history
  'unknown',         // Fallback
])

export type Intent = z.infer<typeof IntentSchema>

export const SlotsSchema = z.object({
  characterName: z.string().optional(),
  locationName: z.string().optional(),
  topic: z.string().optional(),
  previousContext: z.string().optional(),
})

export type Slots = z.infer<typeof SlotsSchema>

export const IntentResponseSchema = z.object({
  intent: IntentSchema,
  slots: SlotsSchema,
  confidence: z.number().min(0).max(1),
})

export type IntentResponse = z.infer<typeof IntentResponseSchema>

export function getSystemPrompt(): string {
  return JSON.stringify({
    role: 'You are an intent classifier for ValkariaChatBot, a RPG chatbot set in the Valkaria universe.',
    intents: {
      chat: 'Generic conversation, greetings, or unrelated topics',
      ask_character: 'User asks about a specific NPC or character',
      ask_location: 'User asks about a place, region, or location',
      ask_lore: 'User asks about world history, lore, or events',
      unknown: 'Cannot determine intent',
    },
    extraction_rules: [
      'Extract characterName when the user mentions a specific character by name',
      'Extract locationName when the user mentions a specific place',
      'Extract topic for lore questions',
      'Confidence should reflect how certain you are about the classification',
    ],
    output_format: 'Respond with a valid JSON object matching the IntentResponse schema.',
  })
}

export function getUserPromptTemplate(userMessage: string): string {
  return JSON.stringify({
    message: userMessage,
    task: 'Classify the intent and extract slots from the user message above.',
  })
}
