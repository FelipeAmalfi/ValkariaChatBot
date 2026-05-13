import pg from 'pg'
import { InfrastructureError } from '../../core/domain/errors/AppError.js'

const { Pool } = pg

let pool: pg.Pool | null = null

export function createPgPool(connectionString: string, poolSize = 10): pg.Pool {
  if (pool) return pool

  pool = new Pool({
    connectionString,
    max: poolSize,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err)
  })

  return pool
}

export function getPgPool(): pg.Pool {
  if (!pool) {
    throw new InfrastructureError('PostgreSQL pool not initialized. Call createPgPool() first.')
  }
  return pool
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export async function checkPgConnection(pgPool: pg.Pool): Promise<boolean> {
  try {
    const client = await pgPool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch {
    return false
  }
}
