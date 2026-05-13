import neo4j from 'neo4j-driver'
import type { Driver, Session, SessionMode } from 'neo4j-driver'
import { InfrastructureError } from '../../core/domain/errors/AppError.js'

let driver: Driver | null = null

export interface Neo4jConfig {
  uri: string
  user: string
  password: string
}

export function createNeo4jDriver(config: Neo4jConfig): Driver {
  if (driver) return driver

  driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 5_000,
  })

  return driver
}

export function getNeo4jDriver(): Driver {
  if (!driver) {
    throw new InfrastructureError('Neo4j driver not initialized. Call createNeo4jDriver() first.')
  }
  return driver
}

export function getNeo4jSession(mode: SessionMode = neo4j.session.READ): Session {
  return getNeo4jDriver().session({ defaultAccessMode: mode })
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}

export async function checkNeo4jConnection(neo4jDriver: Driver): Promise<boolean> {
  try {
    await neo4jDriver.verifyConnectivity()
    return true
  } catch {
    return false
  }
}
