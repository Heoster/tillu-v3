-- TILLU — Migration 0004
-- Phase 3: presence tables, quota tracking, agent registry expansions
-- Phase 4 prep: playlists, lectures, lecture_progress

-- ============================================================
-- PRESENCE ENGINE (Phase 4 — tables created now for Phase 3 Sentinel/Notifications)
-- ============================================================

CREATE TABLE IF NOT EXISTS presence_state (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
  state         TEXT NOT NULL DEFAULT 'UNKNOWN'
                  CHECK (state IN ('UNKNOWN','AVAILABLE','STUDYING','AWAY','SLEEPING','OFFLINE')),
  confidence    NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  source_signals JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presence_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  from_state  TEXT,
  to_state    TEXT NOT NULL,
  trigger     TEXT,
  confidence  NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_presence_events_student ON presence_events(student_id);
CREATE INDEX idx_presence_events_created ON presence_events(created_at DESC);

-- ============================================================
-- QUOTA TRACKING (Phase 3)
-- ============================================================

CREATE TABLE quota_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider    TEXT NOT NULL,
  model       TEXT,
  task        TEXT,
  tokens_used INT NOT NULL DEFAULT 0,
  request_ms  INT,
  status      TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','timeout')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quota_events_provider   ON quota_events(provider);
CREATE INDEX idx_quota_events_created    ON quota_events(created_at DESC);

-- Daily quota summary (materialised on-demand, not a view)
CREATE TABLE quota_daily_summary (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_date   DATE NOT NULL,
  provider       TEXT NOT NULL,
  total_tokens   INT NOT NULL DEFAULT 0,
  total_requests INT NOT NULL DEFAULT 0,
  error_count    INT NOT NULL DEFAULT 0,
  mode           TEXT NOT NULL DEFAULT 'NORMAL' CHECK (mode IN ('NORMAL','CONSERVE','EMERGENCY')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (summary_date, provider)
);

-- ============================================================
-- LECTURE PLAYER (Phase 4 — tables created now for schema coherence)
-- ============================================================

CREATE TABLE playlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  approved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lectures (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  sequence    INT NOT NULL DEFAULT 1,
  duration_sec INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lecture_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  lecture_id      UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  position_sec    INT NOT NULL DEFAULT 0,
  duration_sec    INT,
  completed       BOOLEAN NOT NULL DEFAULT false,
  last_watched_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, lecture_id)
);

CREATE INDEX idx_lecture_progress_student  ON lecture_progress(student_id);
CREATE INDEX idx_playlists_chapter         ON playlists(chapter_id);

-- ============================================================
-- MISTAKES (Phase 4 — question_id FK now that questions table exists)
-- ============================================================

-- Add FK from mistakes.question_id → questions.id (was deferred in 0002)
ALTER TABLE mistakes
  ADD CONSTRAINT fk_mistakes_question
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE presence_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presence_state_own"   ON presence_state   FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "presence_events_own"  ON presence_events  FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "lecture_progress_own" ON lecture_progress FOR ALL USING (student_id = auth_student_id());
-- Playlists and lectures: readable by all authenticated users (shared reference data)
CREATE POLICY "playlists_read"  ON playlists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "lectures_read"   ON lectures  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER presence_state_updated_at
  BEFORE UPDATE ON presence_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER lecture_progress_updated_at
  BEFORE UPDATE ON lecture_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quota_daily_updated_at
  BEFORE UPDATE ON quota_daily_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
