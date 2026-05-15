import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRun = vi.fn().mockResolvedValue({ records: [] })
const mockClose = vi.fn().mockResolvedValue(undefined)
const mockSession = { run: mockRun, close: mockClose }
const mockDriver = { session: vi.fn(() => mockSession) } as unknown as import('neo4j-driver').Driver

describe('Neo4jIngester — location name normalisation', () => {
  beforeEach(() => {
    mockRun.mockClear()
    mockClose.mockClear()
  })

  it('converts display name to slug when creating LOCATED_IN relationship', async () => {
    const { Neo4jIngester } = await import('../../../src/infrastructure/ingestion/Neo4jIngester.js')
    const ingester = new Neo4jIngester(mockDriver)

    await ingester.ingestNpcs([
      {
        name: 'Aaliyah',
        description: 'Moreau do gato',
        location: 'Casa de Banho',
        likes: ['trico'],
        dislikes: ['barulho'],
        benefits_cordial: 'b1',
        benefits_loyal: 'b2',
        benefits_intimate: 'b3',
        last_demand: 'missao',
      },
    ])

    const locatedInCall = mockRun.mock.calls.find(
      (call) => typeof call[0] === 'string' && (call[0] as string).includes('LOCATED_IN'),
    )

    expect(locatedInCall).toBeDefined()
    const params = locatedInCall![1] as Record<string, string>
    expect(params.locationName).toBe('casa_de_banho')
  })

  it('converts multi-word names to underscore slugs', async () => {
    const { Neo4jIngester } = await import('../../../src/infrastructure/ingestion/Neo4jIngester.js')
    const ingester = new Neo4jIngester(mockDriver)

    await ingester.ingestNpcs([
      {
        name: 'TestNpc',
        description: 'desc',
        location: 'Casa Da Arvore',
        likes: [],
        dislikes: [],
        benefits_cordial: '',
        benefits_loyal: '',
        benefits_intimate: '',
        last_demand: '',
      },
    ])

    const locatedInCall = mockRun.mock.calls.find(
      (call) => typeof call[0] === 'string' && (call[0] as string).includes('LOCATED_IN'),
    )!
    const params = locatedInCall[1] as Record<string, string>
    expect(params.locationName).toBe('casa_da_arvore')
  })
})
