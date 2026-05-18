import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildApp, TEST_JWT_SECRET } from './helpers/buildApp.js'
import { NotFoundError, UnauthorizedError } from '../../src/core/domain/errors/AppError.js'
import { JwtTokenService } from '../../src/infrastructure/auth/JwtTokenService.js'
import type { FastifyInstance } from 'fastify'

const VALID_CHALLENGE_ID = '550e8400-e29b-41d4-a716-446655440000'

const mockPlayer = {
  id: 'player-uuid-1',
  name: 'Lyriel',
  class: 'Ranger',
  race: 'Elfa',
  background: 'Criada nas florestas de Candessah entre os elfos guardiões',
  personality: 'Introvertida mas extremamente leal a seus aliados',
  interests: 'Arqueria, rastreamento de criaturas e poções herbais',
  createdAt: new Date().toISOString(),
}

const validRegisterPayload = {
  name: 'Lyriel',
  class: 'Ranger',
  race: 'Elfa',
  background: 'Criada nas florestas de Candessah entre os elfos',
  personality: 'Introvertida mas extremamente leal',
  interests: 'Arqueria, rastreamento e herbologia',
}

// ── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/players/register', () => {
  let app: FastifyInstance
  const realTokenService = new JwtTokenService(TEST_JWT_SECRET, '1h')

  afterEach(async () => {
    await app?.close()
  })

  it('returns 201 with player data when called with valid DM token', async () => {
    const dmToken = await realTokenService.sign({ sub: 'dm', name: 'DM', role: 'DM' })
    app = (await buildApp({
      registerPlayerUseCase: { execute: vi.fn().mockResolvedValue({ player: mockPlayer }) },
      tokenService: {
        sign: vi.fn(),
        verify: vi.fn().mockImplementation((t: string) => realTokenService.verify(t)),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/register',
      headers: { authorization: `Bearer ${dmToken}` },
      payload: validRegisterPayload,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBe('player-uuid-1')
    expect(body.name).toBe('Lyriel')
    expect(body.class).toBe('Ranger')
    expect(body.race).toBe('Elfa')
  })

  it('returns 401 when no auth token is provided', async () => {
    app = (await buildApp()).app
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/register',
      payload: validRegisterPayload,
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when token has PLAYER role', async () => {
    const playerToken = await realTokenService.sign({ sub: 'p1', name: 'Lyriel', role: 'PLAYER' })
    app = (await buildApp({
      tokenService: {
        sign: vi.fn(),
        verify: vi.fn().mockImplementation((t: string) => realTokenService.verify(t)),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/register',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: validRegisterPayload,
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 400 on missing required fields (checked before auth call)', async () => {
    const dmToken = await realTokenService.sign({ sub: 'dm', name: 'DM', role: 'DM' })
    app = (await buildApp({
      tokenService: {
        sign: vi.fn(),
        verify: vi.fn().mockImplementation((t: string) => realTokenService.verify(t)),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/register',
      headers: { authorization: `Bearer ${dmToken}` },
      payload: { name: 'Lyriel' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when background is too short (< 10 chars)', async () => {
    const dmToken = await realTokenService.sign({ sub: 'dm', name: 'DM', role: 'DM' })
    app = (await buildApp({
      tokenService: {
        sign: vi.fn(),
        verify: vi.fn().mockImplementation((t: string) => realTokenService.verify(t)),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/register',
      headers: { authorization: `Bearer ${dmToken}` },
      payload: { ...validRegisterPayload, background: 'curto' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ── Challenge ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/players/challenge', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('returns challenge when player exists', async () => {
    app = (await buildApp({
      initiatePlayerAuthUseCase: {
        execute: vi.fn().mockResolvedValue({
          challengeId: VALID_CHALLENGE_ID,
          question: 'Qual foi sua maior caçada?',
          playerName: 'Lyriel',
        }),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/challenge',
      payload: { playerName: 'Lyriel' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.challengeId).toBe(VALID_CHALLENGE_ID)
    expect(body.question).toBeTruthy()
    expect(body.playerName).toBe('Lyriel')
  })

  it('returns 404 when player does not exist', async () => {
    app = (await buildApp({
      initiatePlayerAuthUseCase: {
        execute: vi.fn().mockRejectedValue(new NotFoundError('Player', 'Inexistente')),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/challenge',
      payload: { playerName: 'Inexistente' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ── Verify ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/players/verify', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('returns token on correct answer', async () => {
    app = (await buildApp({
      validatePlayerAuthUseCase: {
        execute: vi.fn().mockResolvedValue({
          token: 'jwt-token-abc',
          playerId: 'player-uuid-1',
          playerName: 'Lyriel',
        }),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/verify',
      payload: { challengeId: VALID_CHALLENGE_ID, answer: 'A caçada do dragão vermelho nas montanhas geladas' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBe('jwt-token-abc')
    expect(body.playerName).toBe('Lyriel')
  })

  it('returns 401 on wrong answer', async () => {
    app = (await buildApp({
      validatePlayerAuthUseCase: {
        execute: vi.fn().mockRejectedValue(new UnauthorizedError('Answer did not match')),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/verify',
      payload: { challengeId: VALID_CHALLENGE_ID, answer: 'Resposta errada completamente diferente' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when challengeId is not a valid UUID', async () => {
    app = (await buildApp()).app
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/players/verify',
      payload: { challengeId: 'not-a-uuid', answer: 'qualquer resposta aqui' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ── DM login ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/dm/login', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('returns token on correct DM password', async () => {
    app = (await buildApp({
      authenticateDMUseCase: { execute: vi.fn().mockResolvedValue({ token: 'dm-jwt-token' }) },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/dm/login',
      payload: { password: 'correct-password' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBe('dm-jwt-token')
  })

  it('returns 401 on wrong DM password', async () => {
    app = (await buildApp({
      authenticateDMUseCase: {
        execute: vi.fn().mockRejectedValue(new UnauthorizedError('Wrong password')),
      },
    })).app

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/dm/login',
      payload: { password: 'wrong-password' },
    })
    expect(res.statusCode).toBe(401)
  })
})
