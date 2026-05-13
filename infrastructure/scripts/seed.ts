/**
 * ValkariaChatBot — Data Seeding Script
 *
 * This script will ingest locations.csv and npcs.csv into PostgreSQL.
 * NOT executed in this phase — infrastructure preparation only.
 *
 * Usage (future): pnpm --filter @valkaria/api seed
 */

console.warn('Seed script not yet implemented. This is a placeholder for Phase 2.')

// Phase 2 will implement:
// 1. Parse locations.csv → insert into locations table
// 2. Parse npcs.csv → insert into characters table
// 3. Generate embeddings via OpenRouter
// 4. Store vectors in langchain_pg_embedding
// 5. Build Neo4j graph relationships
