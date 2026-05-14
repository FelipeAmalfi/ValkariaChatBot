export const Role = {
  PLAYER: 'PLAYER',
  DM: 'DM',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export interface JwtPayload {
  sub: string
  name: string
  role: Role
  iat?: number
  exp?: number
}
