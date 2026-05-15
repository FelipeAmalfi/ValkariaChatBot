import neo4j from 'neo4j-driver'
import type { Driver } from 'neo4j-driver'
import type { RawLocation, RawNpc } from './CsvParser.js'

export class Neo4jIngester {
  constructor(private readonly driver: Driver) {}

  async ingestLocations(
    locations: RawLocation[],
  ): Promise<{ nodes: number; errors: string[] }> {
    const errors: string[] = []
    let nodes = 0
    const session = this.driver.session({ defaultAccessMode: neo4j.session.WRITE })

    try {
      for (const loc of locations) {
        try {
          await session.run(
            `MERGE (l:Location {name: $name})
             SET l.description = $description,
                 l.short_description = $shortDescription,
                 l.services = $services,
                 l.honors = $honors`,
            {
              name: loc.name,
              description: loc.full_description,
              shortDescription: loc.short_description,
              services: loc.services,
              honors: loc.honors,
            },
          )
          nodes++
          console.log(`  [neo4j] location node: ${loc.name}`)
        } catch (err) {
          const msg = `Neo4jIngester: failed to upsert location node "${loc.name}": ${err instanceof Error ? err.message : String(err)}`
          console.error(msg)
          errors.push(msg)
        }
      }
    } finally {
      await session.close()
    }

    return { nodes, errors }
  }

  async ingestNpcs(npcs: RawNpc[]): Promise<{ nodes: number; relationships: number; errors: string[] }> {
    const errors: string[] = []
    let nodes = 0
    let relationships = 0

    const session = this.driver.session({ defaultAccessMode: neo4j.session.WRITE })

    try {
      for (const npc of npcs) {
        // Create NPC node
        try {
          await session.run(
            `MERGE (n:NPC {name: $name})
             SET n.description = $description,
                 n.location = $location`,
            {
              name: npc.name,
              description: npc.description,
              location: npc.location,
            },
          )
          nodes++
          console.log(`  [neo4j] npc node: ${npc.name}`)
        } catch (err) {
          const msg = `Neo4jIngester: failed to upsert NPC node "${npc.name}": ${err instanceof Error ? err.message : String(err)}`
          console.error(msg)
          errors.push(msg)
          continue
        }

        // Create LOCATED_IN relationship
        // NPC CSV uses display names (e.g. "Casa de Banho") while Location nodes
        // use the slug form from locations.csv (e.g. "casa_de_banho"). Normalise before matching.
        if (npc.location) {
          try {
            const locationSlug = npc.location.toLowerCase().replace(/ /g, '_')
            await session.run(
              `MATCH (n:NPC {name: $npcName})
               MATCH (l:Location {name: $locationName})
               MERGE (n)-[:LOCATED_IN]->(l)`,
              { npcName: npc.name, locationName: locationSlug },
            )
            relationships++
          } catch (err) {
            const msg = `Neo4jIngester: failed to create LOCATED_IN for "${npc.name}" -> "${npc.location}": ${err instanceof Error ? err.message : String(err)}`
            console.error(msg)
            errors.push(msg)
          }
        }

        // Create LIKES relationships
        for (const interest of npc.likes) {
          try {
            await session.run(
              `MATCH (n:NPC {name: $name})
               MERGE (i:Interest {name: $interest})
               MERGE (n)-[:LIKES]->(i)`,
              { name: npc.name, interest },
            )
            relationships++
          } catch (err) {
            const msg = `Neo4jIngester: failed to create LIKES "${interest}" for "${npc.name}": ${err instanceof Error ? err.message : String(err)}`
            console.error(msg)
            errors.push(msg)
          }
        }
      }
    } finally {
      await session.close()
    }

    return { nodes, relationships, errors }
  }
}
