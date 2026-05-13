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
