import { z } from 'zod'

export const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  threadId: z.string().uuid('threadId must be a valid UUID').optional(),
})

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>

export const ChatResponseSchema = z.object({
  response: z.string(),
  threadId: z.string(),
  intent: z.string().optional(),
})

export type ChatResponse = z.infer<typeof ChatResponseSchema>
