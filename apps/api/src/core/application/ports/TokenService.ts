import type { JwtPayload } from '../../domain/value-objects/Role.js'

export interface TokenService {
  sign(payload: JwtPayload): Promise<string>
  verify(token: string): Promise<JwtPayload>
}
