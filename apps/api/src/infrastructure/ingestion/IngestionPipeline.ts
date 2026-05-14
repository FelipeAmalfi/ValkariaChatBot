import { readFile } from 'node:fs/promises'
import type pg from 'pg'
import type { Driver } from 'neo4j-driver'
import type { AIProvider } from '../../core/application/ports/AIProvider.js'
import { CsvParser } from './CsvParser.js'
import { LocationIngester } from './LocationIngester.js'
import { NpcIngester } from './NpcIngester.js'
import { EmbeddingIngester } from './EmbeddingIngester.js'
import { Neo4jIngester } from './Neo4jIngester.js'

export interface IngestionResult {
  locations: { ingested: number; embeddings: number }
  npcs: { ingested: number; embeddings: number }
  neo4j: { nodes: number; relationships: number }
  errors: string[]
}

export class IngestionPipeline {
  private readonly locationIngester: LocationIngester
  private readonly npcIngester: NpcIngester
  private readonly embeddingIngester: EmbeddingIngester
  private readonly neo4jIngester: Neo4jIngester

  constructor(
    private readonly pgPool: pg.Pool,
    private readonly neo4jDriver: Driver,
    private readonly aiProvider: AIProvider,
    private readonly embeddingDimensions: number,
  ) {
    this.locationIngester = new LocationIngester(pgPool)
    this.npcIngester = new NpcIngester(pgPool)
    this.embeddingIngester = new EmbeddingIngester(pgPool, aiProvider, embeddingDimensions)
    this.neo4jIngester = new Neo4jIngester(neo4jDriver)
  }

  async run(locationsPath: string, npcsPath: string): Promise<IngestionResult> {
    const allErrors: string[] = []
    const result: IngestionResult = {
      locations: { ingested: 0, embeddings: 0 },
      npcs: { ingested: 0, embeddings: 0 },
      neo4j: { nodes: 0, relationships: 0 },
      errors: allErrors,
    }

    // ── 1. Read CSV files ──────────────────────────────────────────────
    console.log('\n[pipeline] Reading CSV files...')

    let locationsCsv: string
    let npcsCsv: string
    try {
      locationsCsv = await readFile(locationsPath, 'utf-8')
    } catch (err) {
      const msg = `Failed to read locations CSV "${locationsPath}": ${err instanceof Error ? err.message : String(err)}`
      allErrors.push(msg)
      console.error(msg)
      return result
    }
    try {
      npcsCsv = await readFile(npcsPath, 'utf-8')
    } catch (err) {
      const msg = `Failed to read npcs CSV "${npcsPath}": ${err instanceof Error ? err.message : String(err)}`
      allErrors.push(msg)
      console.error(msg)
      return result
    }

    const rawLocations = CsvParser.parseLocations(locationsCsv)
    const rawNpcs = CsvParser.parseNpcs(npcsCsv)
    console.log(`[pipeline] Parsed ${rawLocations.length} locations, ${rawNpcs.length} NPCs`)

    // ── 2. Ingest locations into PostgreSQL ────────────────────────────
    console.log('\n[pipeline] Ingesting locations into PostgreSQL...')
    const { results: ingestedLocations, errors: locErrors } =
      await this.locationIngester.ingest(rawLocations)
    result.locations.ingested = ingestedLocations.length
    allErrors.push(...locErrors)
    console.log(`[pipeline] Locations ingested: ${ingestedLocations.length}`)

    // ── 3. Ingest NPCs into PostgreSQL ─────────────────────────────────
    console.log('\n[pipeline] Ingesting NPCs into PostgreSQL...')
    const { results: ingestedNpcs, errors: npcErrors } =
      await this.npcIngester.ingest(rawNpcs)
    result.npcs.ingested = ingestedNpcs.length
    allErrors.push(...npcErrors)
    console.log(`[pipeline] NPCs ingested: ${ingestedNpcs.length}`)

    // ── 4. Generate and store embeddings ──────────────────────────────
    console.log('\n[pipeline] Generating embeddings for locations...')
    const { count: locEmbCount, errors: locEmbErrors } =
      await this.embeddingIngester.ingestLocations(rawLocations, ingestedLocations)
    result.locations.embeddings = locEmbCount
    allErrors.push(...locEmbErrors)
    console.log(`[pipeline] Location embeddings stored: ${locEmbCount}`)

    console.log('\n[pipeline] Generating embeddings for NPCs...')
    const { count: npcEmbCount, errors: npcEmbErrors } =
      await this.embeddingIngester.ingestNpcs(rawNpcs, ingestedNpcs)
    result.npcs.embeddings = npcEmbCount
    allErrors.push(...npcEmbErrors)
    console.log(`[pipeline] NPC embeddings stored: ${npcEmbCount}`)

    // ── 5. Ingest into Neo4j ───────────────────────────────────────────
    console.log('\n[pipeline] Ingesting locations into Neo4j...')
    const { nodes: locNodes, errors: neo4jLocErrors } =
      await this.neo4jIngester.ingestLocations(rawLocations)
    allErrors.push(...neo4jLocErrors)

    console.log('\n[pipeline] Ingesting NPCs into Neo4j...')
    const { nodes: npcNodes, relationships, errors: neo4jNpcErrors } =
      await this.neo4jIngester.ingestNpcs(rawNpcs)
    allErrors.push(...neo4jNpcErrors)

    result.neo4j.nodes = locNodes + npcNodes
    result.neo4j.relationships = relationships
    console.log(`[pipeline] Neo4j nodes: ${result.neo4j.nodes}, relationships: ${relationships}`)

    return result
  }
}
