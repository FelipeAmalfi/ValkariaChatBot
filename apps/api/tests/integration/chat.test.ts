import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildApp } from './helpers/buildApp.js'
import type { FastifyInstance } from 'fastify'

describe('POST /api/v1/chat — default graph response', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = (await buildApp({
      graph: {
        invoke: vi.fn().mockResolvedValue({
          response: 'Bem-vindo a Candessah, aventureiro.',
          intent: 'chat',
        }),
      },
    })).app
  })

  afterEach(async () => {
    await app?.close()
  })

  it('returns 200 with response and threadId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      payload: { message: 'Olá, quem és tu?' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.response).toBe('Bem-vindo a Candessah, aventureiro.')
    expect(body.threadId).toBeTruthy()
    expect(body.intent).toBe('chat')
  })

  it('preserves provided threadId (must be valid UUID)', async () => {
    const fixedThreadId = '550e8400-e29b-41d4-a716-446655440000'
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      payload: { message: 'Teste', threadId: fixedThreadId },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().threadId).toBe(fixedThreadId)
  })

  it('returns 400 when message is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/v1/chat — graph returns no response', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = (await buildApp({
      graph: {
        invoke: vi.fn().mockResolvedValue({ response: undefined, intent: 'chat' }),
      },
    })).app
  })

  afterEach(async () => {
    await app?.close()
  })

  it('falls back to "No response generated." when graph omits response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      payload: { message: 'Olá' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().response).toBe('No response generated.')
  })
})

describe('GET /api/me', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('returns guest state when no threadId header', async () => {
    app = (await buildApp()).app
    const response = await app.inject({ method: 'GET', url: '/api/me' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.role).toBe('guest')
    expect(body.playerName).toBeNull()
  })

  it('returns session data when threadId matches a stored session', async () => {
    app = (await buildApp({
      sessionContextStore: {
        load: vi.fn().mockResolvedValue({
          playerName: 'Lyriel',
          currentRole: 'PLAYER',
          validationState: 'validated',
        }),
        save: vi.fn(),
      },
    })).app
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { 'x-thread-id': 'thread-abc' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.playerName).toBe('Lyriel')
    expect(body.role).toBe('PLAYER')
    expect(body.validationState).toBe('validated')
  })
})

describe('GET /health', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = (await buildApp()).app
  })

  afterEach(async () => {
    await app?.close()
  })

  it('returns status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json().status).toBe('ok')
  })
})
