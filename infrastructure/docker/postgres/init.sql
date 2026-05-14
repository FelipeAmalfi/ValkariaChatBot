-- ValkariaChatBot — PostgreSQL Initial Schema
-- This script runs once when the container is first created.

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Characters (NPCs and entities from Valkaria universe)
-- ============================================================
CREATE TABLE IF NOT EXISTS characters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  role        VARCHAR(100),
  faction     VARCHAR(100),
  location_id UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_name ON characters (name);
CREATE INDEX IF NOT EXISTS idx_characters_faction ON characters (faction);
CREATE INDEX IF NOT EXISTS idx_characters_metadata ON characters USING gin (metadata);

-- ============================================================
-- Locations (places in the Valkaria universe)
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  region      VARCHAR(100),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_name ON locations (name);
CREATE INDEX IF NOT EXISTS idx_locations_region ON locations (region);

-- Foreign key for character location
ALTER TABLE characters
  ADD CONSTRAINT fk_characters_location
  FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL;

-- ============================================================
-- Conversations (session memory)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   VARCHAR(255) NOT NULL UNIQUE,
  user_id     VARCHAR(255),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_thread_id ON conversations (thread_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);

-- ============================================================
-- LangChain pgvector table (used by LangChain PGVectorStore)
-- DO NOT rename columns — LangChain depends on this schema.
-- ============================================================
CREATE TABLE IF NOT EXISTS langchain_pg_embedding (
  uuid        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID,
  embedding   vector(1536),
  document    TEXT,
  cmetadata   JSONB DEFAULT '{}',
  custom_id   VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_langchain_pg_embedding_collection
  ON langchain_pg_embedding (collection_id);

CREATE INDEX IF NOT EXISTS idx_langchain_pg_embedding_vector
  ON langchain_pg_embedding USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- Auto-update trigger for updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Players (authenticated player characters — sem senha)
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  class       VARCHAR(100) NOT NULL,
  race        VARCHAR(100) NOT NULL,
  background  TEXT NOT NULL,
  personality TEXT NOT NULL,
  interests   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_name_lower ON players (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_players_class ON players (class);
CREATE INDEX IF NOT EXISTS idx_players_race ON players (race);

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Unique constraints required for ingestion upserts
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_characters_name' AND conrelid = 'characters'::regclass
  ) THEN
    ALTER TABLE characters ADD CONSTRAINT uq_characters_name UNIQUE (name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_locations_name' AND conrelid = 'locations'::regclass
  ) THEN
    ALTER TABLE locations ADD CONSTRAINT uq_locations_name UNIQUE (name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_langchain_pg_embedding_custom_id'
      AND conrelid = 'langchain_pg_embedding'::regclass
  ) THEN
    ALTER TABLE langchain_pg_embedding ADD CONSTRAINT uq_langchain_pg_embedding_custom_id UNIQUE (custom_id);
  END IF;
END
$$;

-- ============================================================
-- Extend locations with CSV-sourced fields
-- ============================================================
ALTER TABLE locations ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS full_description TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS services TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS honors TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS npc_names TEXT[];  -- array of NPC names

-- ============================================================
-- Extend characters (NPCs) with CSV-sourced fields
-- ============================================================
ALTER TABLE characters ADD COLUMN IF NOT EXISTS likes TEXT[];
ALTER TABLE characters ADD COLUMN IF NOT EXISTS dislikes TEXT[];
ALTER TABLE characters ADD COLUMN IF NOT EXISTS benefits_cordial TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS benefits_loyal TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS benefits_intimate TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_demand TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);  -- string reference além de FK

-- ============================================================
-- NPC Affinity — tracks affinity level between player and NPC
-- ============================================================
CREATE TABLE IF NOT EXISTS npc_affinity (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  npc_name          VARCHAR(255) NOT NULL,
  level             VARCHAR(50) NOT NULL DEFAULT 'none',  -- none, cordial, loyal, intimate
  score             INTEGER NOT NULL DEFAULT 0,           -- 0-100
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_interaction  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, npc_name)
);

CREATE INDEX IF NOT EXISTS idx_npc_affinity_player_id ON npc_affinity(player_id);
CREATE INDEX IF NOT EXISTS idx_npc_affinity_npc_name  ON npc_affinity(npc_name);
CREATE INDEX IF NOT EXISTS idx_npc_affinity_level      ON npc_affinity(level);

CREATE TRIGGER update_npc_affinity_updated_at
  BEFORE UPDATE ON npc_affinity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Interaction History — player-NPC interaction log
-- ============================================================
CREATE TABLE IF NOT EXISTS interaction_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  npc_name        VARCHAR(255),
  location_name   VARCHAR(255),
  intent          VARCHAR(100) NOT NULL,
  message_summary TEXT,
  sentiment       VARCHAR(50),   -- positive, neutral, negative
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interaction_history_player_id  ON interaction_history(player_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_npc_name   ON interaction_history(npc_name);
CREATE INDEX IF NOT EXISTS idx_interaction_history_created_at ON interaction_history(created_at);

-- ============================================================
-- Player Embeddings — evolving semantic profile per player
-- ============================================================
CREATE TABLE IF NOT EXISTS player_embeddings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id         UUID UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  embedding         vector(1536) NOT NULL,
  drift_alpha       FLOAT NOT NULL DEFAULT 0.15,  -- weighted update factor
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_embeddings_player_id ON player_embeddings(player_id);

-- ============================================================
-- Memory Summaries — summarised conversational memory
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_summaries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   VARCHAR(255) NOT NULL,
  player_id   UUID REFERENCES players(id) ON DELETE SET NULL,
  summary     TEXT NOT NULL,
  turn_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_summaries_thread_id ON memory_summaries(thread_id);
CREATE INDEX IF NOT EXISTS idx_memory_summaries_player_id ON memory_summaries(player_id);

CREATE TRIGGER update_memory_summaries_updated_at
  BEFORE UPDATE ON memory_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
