import { z } from 'zod'

export const RegisterPlayerSchema = z.object({
  name: z.string().min(2).max(100),
  class: z.string().min(2).max(100),
  race: z.string().min(2).max(100),
  background: z.string().min(10).max(10_000),
  personality: z.string().min(10).max(10_000),
  interests: z.string().min(10).max(10_000),
})
export type RegisterPlayerInput = z.infer<typeof RegisterPlayerSchema>

export const InitiateAuthSchema = z.object({
  playerName: z.string().min(1).max(100),
})
export type InitiateAuthInput = z.infer<typeof InitiateAuthSchema>

export const ValidateAuthSchema = z.object({
  challengeId: z.string().uuid(),
  answer: z.string().min(1).max(2000),
})
export type ValidateAuthInput = z.infer<typeof ValidateAuthSchema>

export const AuthenticateDMSchema = z.object({
  password: z.string().min(1),
})
export type AuthenticateDMInput = z.infer<typeof AuthenticateDMSchema>
