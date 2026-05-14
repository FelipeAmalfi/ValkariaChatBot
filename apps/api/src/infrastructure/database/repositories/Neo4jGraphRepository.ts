import neo4j from 'neo4j-driver'
import type { Driver, Record as Neo4jRecord } from 'neo4j-driver'
import type {
  GraphRepository,
  NpcGraphNode,
  GraphQueryCriteria,
} from '../../../core/application/ports/GraphRepository.js'

function toNpcNode(record: Neo4jRecord, key = 'n'): NpcGraphNode {
  const node = record.get(key)
  return {
    name: node.properties.name as string,
    location: node.properties.location as string | undefined,
    description: node.properties.description as string | undefined,
  }
}

export class Neo4jGraphRepository implements GraphRepository {
  constructor(private readonly driver: Driver) {}

  async findNpcsByLocation(location: string): Promise<NpcGraphNode[]> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ })
    try {
      const result = await session.run(
        `MATCH (n:NPC)-[:LOCATED_IN]->(l:Location)
         WHERE toLower(l.name) CONTAINS toLower($location)
         RETURN n`,
        { location },
      )
      return result.records.map((r) => toNpcNode(r))
    } finally {
      await session.close()
    }
  }

  async findNpcsByInterest(interest: string): Promise<NpcGraphNode[]> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ })
    try {
      const result = await session.run(
        `MATCH (n:NPC)-[:LIKES]->(i:Interest)
         WHERE toLower(i.name) CONTAINS toLower($interest)
         RETURN n`,
        { interest },
      )
      return result.records.map((r) => toNpcNode(r))
    } finally {
      await session.close()
    }
  }

  async findNpcsByLocationAndInterest(
    location: string,
    interest: string,
  ): Promise<NpcGraphNode[]> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ })
    try {
      const result = await session.run(
        `MATCH (n:NPC)-[:LOCATED_IN]->(l:Location)
         MATCH (n)-[:LIKES]->(i:Interest)
         WHERE toLower(l.name) CONTAINS toLower($location)
           AND toLower(i.name) CONTAINS toLower($interest)
         RETURN DISTINCT n`,
        { location, interest },
      )
      return result.records.map((r) => toNpcNode(r))
    } finally {
      await session.close()
    }
  }

  async findNpcsMatchingCriteria(criteria: GraphQueryCriteria): Promise<NpcGraphNode[]> {
    const { location, interest, sharedInterestsWith } = criteria

    if (location && interest) return this.findNpcsByLocationAndInterest(location, interest)
    if (location) return this.findNpcsByLocation(location)
    if (interest) return this.findNpcsByInterest(interest)
    if (sharedInterestsWith) return this.findNpcsWithSharedInterests(sharedInterestsWith)

    return []
  }

  async findNpcsWithSharedInterests(npcName: string): Promise<NpcGraphNode[]> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ })
    try {
      const result = await session.run(
        `MATCH (source:NPC {name: $npcName})-[:LIKES]->(i:Interest)<-[:LIKES]-(other:NPC)
         WHERE other.name <> $npcName
         RETURN DISTINCT other AS n`,
        { npcName },
      )
      return result.records.map((r) => toNpcNode(r))
    } finally {
      await session.close()
    }
  }

  async findNpcsNearNpc(npcName: string): Promise<NpcGraphNode[]> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ })
    try {
      const result = await session.run(
        `MATCH (source:NPC {name: $npcName})-[:LOCATED_IN]->(l:Location)<-[:LOCATED_IN]-(other:NPC)
         WHERE other.name <> $npcName
         RETURN DISTINCT other AS n`,
        { npcName },
      )
      return result.records.map((r) => toNpcNode(r))
    } finally {
      await session.close()
    }
  }

  async runQuery(cypher: string): Promise<Record<string, unknown>[]> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ })
    try {
      const result = await session.run(cypher)
      return result.records.map((record) => {
        const row: Record<string, unknown> = {}
        for (const key of record.keys) {
          row[key as string] = this.mapValue(record.get(key))
        }
        return row
      })
    } finally {
      await session.close()
    }
  }

  private mapValue(val: unknown): unknown {
    if (neo4j.isInt(val)) return (val as { toNumber(): number }).toNumber()
    if (Array.isArray(val)) return val.map((v) => this.mapValue(v))
    if (val && typeof val === 'object' && 'properties' in val) {
      const props = (val as { properties: Record<string, unknown> }).properties
      const mapped: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        mapped[k] = this.mapValue(v)
      }
      return mapped
    }
    return val
  }
}
