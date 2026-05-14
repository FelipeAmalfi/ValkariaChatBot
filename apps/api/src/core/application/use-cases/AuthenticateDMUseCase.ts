import { UnauthorizedError } from '../../domain/errors/AppError.js'
import { Role } from '../../domain/value-objects/Role.js'
import type { TokenService } from '../ports/TokenService.js'

export interface AuthenticateDMDeps {
  tokenService: TokenService
  dmPassword: string
}

export interface AuthenticateDMOutput {
  token: string
}

export class AuthenticateDMUseCase {
  constructor(private readonly deps: AuthenticateDMDeps) {}

  async execute(password: string): Promise<AuthenticateDMOutput> {
    if (password !== this.deps.dmPassword) {
      throw new UnauthorizedError('Invalid DM credentials')
    }
    const token = await this.deps.tokenService.sign({
      sub: 'dm',
      name: 'Dungeon Master',
      role: Role.DM,
    })
    return { token }
  }
}
