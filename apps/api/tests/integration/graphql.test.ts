import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildApp, TEST_JWT_SECRET } from './helpers/buildApp.js'
import type { FastifyInstance } from 'fastify'
import { JwtTokenService } from '../../src/infrastructure/auth/JwtTokenService.js'

async function gql(app: FastifyInstance, query: string, variables?: Record<string, unknown>, token?: string) {
  return app.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    payload: JSON.stringify({ query, variables }),
  })
}

describe('GraphQL — Query health', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = (await buildApp()).app
  })

  afterEach(async () => {
    await app?.close()
  })

  it('returns status ok', async () => {
    const res = await gql(app, '{ health { status version } }')
    expect(res.statusCode).toBe(200)
    expect(res.json().data.health.status).toBe('ok')
  })
})

describe('GraphQL — Query npcs', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('returns empty list when loreQueryService returns no data', async () => {
    app = (await buildApp({
      loreQueryService: { query: vi.fn().mockResolvedValue({ data: [] }) },
    })).app
    const res = await gql(app, '{ npcs { name } }')
    expect(res.statusCode).toBe(200)
    expect(res.json().data.npcs).toEqual([])
  })

  it('returns NPC list from loreQueryService', async () => {
    app = (await buildApp({
      loreQueryService: {
        query: vi.fn().mockResolvedValue({
          data: [{ name: 'Aaliyah', description: 'Guardiã', personality: null, location: 'Floresta', interests: [], faction: null }],
        }),
      },
    })).app
    const res = await gql(app, '{ npcs { name location } }')
    expect(res.statusCode).toBe(200)
    const npcs = res.json().data.npcs
    expect(npcs).toHaveLength(1)
    expect(npcs[0].name).toBe('Aaliyah')
  })
})

describe('GraphQL — Mutation registerPlayer (DM auth)', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('returns error without Bearer token', async () => {
    app = (await buildApp()).app
    const res = await gql(app, `
      mutation {
        registerPlayer(name:"Lyriel" class:"Ranger" race:"Elfa" background:"X" personality:"Y" interests:"Z") {
          id name
        }
      }
    `)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.errors).toBeTruthy()
    expect(body.errors[0].message).toMatch(/DM auth required/)
  })

  it('returns error when token is not DM role', async () => {
    const tokenService = new JwtTokenService(TEST_JWT_SECRET, '1h')
    const playerToken = await tokenService.sign({ sub: 'player-1', name: 'Lyriel', role: 'PLAYER' })
    app = (await buildApp({
      tokenService: {
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue({ sub: 'player-1', role: 'PLAYER' }),
      },
    })).app
    const res = await gql(
      app,
      `mutation { registerPlayer(name:"X" class:"Y" race:"Z" background:"B" personality:"P" interests:"I") { id } }`,
      undefined,
      playerToken,
    )
    expect(res.statusCode).toBe(200)
    expect(res.json().errors[0].message).toMatch(/DM access required/)
  })

  it('creates player when called with valid DM token', async () => {
    const tokenService = new JwtTokenService(TEST_JWT_SECRET, '1h')
    const dmToken = await tokenService.sign({ sub: 'dm', name: 'DM', role: 'DM' })
    const mockPlayer = {
      id: 'new-id',
      name: 'Lyriel',
      class: 'Ranger',
      race: 'Elfa',
      createdAt: new Date().toISOString(),
    }
    app = (await buildApp({
      tokenService: {
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue({ sub: 'dm', role: 'DM' }),
      },
      registerPlayerUseCase: {
        execute: vi.fn().mockResolvedValue({ player: { ...mockPlayer, background: '', personality: '', interests: '' } }),
      },
    })).app
    const res = await gql(
      app,
      `mutation { registerPlayer(name:"Lyriel" class:"Ranger" race:"Elfa" background:"B" personality:"P" interests:"I") { id name } }`,
      undefined,
      dmToken,
    )
    expect(res.statusCode).toBe(200)
    expect(res.json().data.registerPlayer.name).toBe('Lyriel')
  })
})

describe('GraphQL — Mutation authenticateDM', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = (await buildApp({
      authenticateDMUseCase: {
        execute: vi.fn().mockResolvedValue({ token: 'dm-gql-token' }),
      },
    })).app
  })

  afterEach(async () => {
    await app?.close()
  })

  it('returns token on correct password', async () => {
    const res = await gql(app, `mutation { authenticateDM(password: "correct") { token } }`)
    expect(res.statusCode).toBe(200)
    expect(res.json().data.authenticateDM.token).toBe('dm-gql-token')
  })
})

describe('GraphQL — Query players', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = (await buildApp({
      playerRepository: {
        findByName: vi.fn(),
        findAll: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'Lyriel', class: 'Ranger', race: 'Elfa', createdAt: new Date().toISOString() },
        ]),
        findById: vi.fn(),
      },
    })).app
  })

  afterEach(async () => {
    await app?.close()
  })

  it('returns player list', async () => {
    const res = await gql(app, '{ players { id name } }')
    expect(res.statusCode).toBe(200)
    const players = res.json().data.players
    expect(players).toHaveLength(1)
    expect(players[0].name).toBe('Lyriel')
  })
})
