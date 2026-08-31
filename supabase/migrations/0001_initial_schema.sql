-- TILLU — Initial Database Schema
-- Migration: 0001_initial_schema
-- Phase: 0 (foundational tables)
-- Description: Core identity, academic graph, event ledger, agent registry

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CORE IDENTITY
-- ============================================================

-- Student profiles (extends Supabase auth.users)
CREATE TABLE student_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  class         TEXT NOT NULL DEFAULT '12',
  board         TEXT NOT NULL DEFAULT 'CBSE',
  exam_date     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student preferences (key-value with source tracking)
CREATE TABLE student_preferences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'configured' CHECK (source IN ('configured', 'observed', 'inferred')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, key)
);

-- ============================================================
-- ACADEMIC GRAPH
-- ============================================================

CREATE TABLE subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  board         TEXT NOT NULL DEFAULT 'CBSE',
  class         TEXT NOT NULL DEFAULT '12',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, board, class)
);

CREATE TABLE chapters (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id    UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT,
  sequence      INT NOT NULL DEFAULT 0,
  importance    INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE concepts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id    UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  importance    INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  prerequisites JSONB NOT NULL DEFAULT '[]',
  related       JSONB NOT NULL DEFAULT '[]',
  source        TEXT NOT NULL DEFAULT 'seed',
  source_version TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENT LEDGER (append-only)
-- ============================================================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type      TEXT NOT NULL,
  schema_version  TEXT NOT NULL DEFAULT 'v1',
  source          TEXT NOT NULL,
  actor_id        UUID NOT NULL,
  correlation_id  UUID NOT NULL,
  trace_id        UUID NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  retry_count     INT NOT NULL DEFAULT 0,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency tracking for event consumers
CREATE TABLE event_consumer_log (
  event_id        UUID NOT NULL,
  consumer_id     TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, consumer_id)
);

-- Index for efficient event queries
CREATE INDEX idx_events_actor_id ON events(actor_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_correlation_id ON events(correlation_id);

-- ============================================================
-- AGENT REGISTRY
-- ============================================================

CREATE TABLE agents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL UNIQUE,
  version             TEXT NOT NULL,
  endpoint            TEXT,
  host_provider       TEXT,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  priority            INT NOT NULL DEFAULT 100,
  capabilities        JSONB NOT NULL DEFAULT '[]',
  health_status       TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (health_status IN ('healthy', 'degraded', 'failing', 'down', 'unknown')),
  health_score        NUMERIC(5,2) DEFAULT 0,
  last_heartbeat_at   TIMESTAMPTZ,
  last_success_at     TIMESTAMPTZ,
  last_failure_at     TIMESTAMPTZ,
  failure_count       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_heartbeats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,
  latency_ms    INT,
  uptime_sec    INT,
  version       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_tests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  test_type     TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'timeout')),
  details       JSONB,
  latency_ms    INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_failures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  error_code      TEXT,
  error_message   TEXT,
  recovered       BOOLEAN NOT NULL DEFAULT false,
  recovered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKFLOW TRACKING
-- ============================================================

CREATE TABLE workflow_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_name   TEXT NOT NULL,
  trigger         TEXT,
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'completed', 'failed')),
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE student_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;

-- Students can only see/modify their own profile
CREATE POLICY "student_profiles_own" ON student_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "student_preferences_own" ON student_preferences
  FOR ALL USING (
    student_id IN (
      SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
  );

-- Students can read events they own; insert via API (service role for writes)
CREATE POLICY "events_read_own" ON events
  FOR SELECT USING (actor_id = auth.uid());

-- Events table: NO DELETE policy — append-only enforced
-- (Service role still works for server-side inserts)

-- Academic graph is readable by all authenticated users (seeded data)
ALTER TABLE subjects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_read" ON subjects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "chapters_read" ON chapters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "concepts_read" ON concepts FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER student_preferences_updated_at
  BEFORE UPDATE ON student_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER concepts_updated_at
  BEFORE UPDATE ON concepts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
