import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../../core/domain/value-objects/Role.js'
import type { TokenService } from '../../core/application/ports/TokenService.js'
import { UnauthorizedError } from '../../core/domain/errors/AppError.js'

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  async sign(payload: JwtPayload): Promise<string> {
    const { iat: _iat, exp: _exp, ...clean } = payload
    return jwt.sign(clean, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions)
  }

  async verify(token: string): Promise<JwtPayload> {
    try {
      return jwt.verify(token, this.secret) as JwtPayload
    } catch {
      throw new UnauthorizedError('Invalid or expired token')
    }
  }
}
