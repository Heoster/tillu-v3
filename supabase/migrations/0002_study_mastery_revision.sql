-- TILLU — Migration 0002
-- Phase 1: Study sessions and tasks
-- Phase 2 placeholders: mastery_states, mastery_events
-- Phase 3 placeholders: revision_items, revision_events
-- Phase 3 placeholder: notifications

-- ============================================================
-- STUDY
-- ============================================================

CREATE TABLE study_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id            UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  subject_id            UUID REFERENCES subjects(id),
  chapter_id            UUID REFERENCES chapters(id),
  concept_id            UUID REFERENCES concepts(id),
  activity_type         TEXT NOT NULL DEFAULT 'practice'
                          CHECK (activity_type IN ('lecture','practice','revision','quiz','exam','repair')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','paused','completed','abandoned')),
  planned_duration_min  INT,
  actual_duration_min   INT,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE study_tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  concept_id  UUID REFERENCES concepts(id),
  task_type   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','ready','active','completed','skipped','postponed','expired','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_study_sessions_student_id ON study_sessions(student_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at DESC);
CREATE INDEX idx_study_sessions_status ON study_sessions(status);
CREATE INDEX idx_study_tasks_session_id ON study_tasks(session_id);

-- ============================================================
-- MASTERY (Phase 2 — table created now, populated in Phase 2)
-- ============================================================

CREATE TABLE mastery_states (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id                  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_id                  UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  mastery_score               NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  confidence                  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  recall_score                NUMERIC(5,2) NOT NULL DEFAULT 0,
  practice_score              NUMERIC(5,2) NOT NULL DEFAULT 0,
  pyq_score                   NUMERIC(5,2) NOT NULL DEFAULT 0,
  exam_score                  NUMERIC(5,2) NOT NULL DEFAULT 0,
  attempt_count               INT NOT NULL DEFAULT 0,
  success_count               INT NOT NULL DEFAULT 0,
  failure_count               INT NOT NULL DEFAULT 0,
  last_attempt_at             TIMESTAMPTZ,
  last_success_at             TIMESTAMPTZ,
  last_failure_at             TIMESTAMPTZ,
  forgetting_risk             NUMERIC(5,4) NOT NULL DEFAULT 0,
  next_review_at              TIMESTAMPTZ,
  mastery_algorithm_version   TEXT NOT NULL DEFAULT 'v1',
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, concept_id)
);

CREATE TABLE mastery_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_id      UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  delta           NUMERIC(5,2) NOT NULL DEFAULT 0,
  evidence        JSONB NOT NULL DEFAULT '{}',
  source_agent    TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mastery_states_student_id ON mastery_states(student_id);
CREATE INDEX idx_mastery_states_concept_id ON mastery_states(concept_id);
CREATE INDEX idx_mastery_states_next_review ON mastery_states(next_review_at);
CREATE INDEX idx_mastery_events_student_concept ON mastery_events(student_id, concept_id);

-- ============================================================
-- REVISION (Phase 3 — table created now, populated in Phase 3)
-- ============================================================

CREATE TABLE revision_items (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id                  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_id                  UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  revision_type               TEXT NOT NULL DEFAULT 'recall'
                                CHECK (revision_type IN ('recall','formula','reaction','flashcard','concept_explanation','question','pyq','mixed')),
  priority                    NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  difficulty                  NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  stability                   NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  last_review_at              TIMESTAMPTZ,
  next_review_at              TIMESTAMPTZ,
  attempt_count               INT NOT NULL DEFAULT 0,
  success_count               INT NOT NULL DEFAULT 0,
  failure_count               INT NOT NULL DEFAULT 0,
  status                      TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','paused','retired')),
  revision_algorithm_version  TEXT NOT NULL DEFAULT 'v1',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, concept_id)
);

CREATE TABLE revision_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_item_id    UUID NOT NULL REFERENCES revision_items(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  outcome             TEXT NOT NULL CHECK (outcome IN ('success','failure','partial')),
  recall_quality      INT NOT NULL DEFAULT 0 CHECK (recall_quality BETWEEN 0 AND 5),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revision_items_student_id ON revision_items(student_id);
CREATE INDEX idx_revision_items_next_review ON revision_items(next_review_at);
CREATE INDEX idx_revision_items_status ON revision_items(status);

-- ============================================================
-- NOTIFICATIONS (Phase 3 — table created now)
-- ============================================================

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  notification_type   TEXT NOT NULL,
  priority            TEXT NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('critical','high','normal','low')),
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  dedupe_key          TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','suppressed','queued')),
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, dedupe_key)
);

CREATE INDEX idx_notifications_student_id ON notifications(student_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================================
-- MISTAKES (Phase 4 — table created now)
-- ============================================================

CREATE TABLE mistakes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_id          UUID NOT NULL REFERENCES concepts(id),
  question_id         UUID,  -- FK to questions table added in Phase 5
  error_type          TEXT NOT NULL
                        CHECK (error_type IN ('conceptual','formula','calculation','sign','unit','carelessness','misreading','memory','time_pressure','presentation')),
  severity            TEXT NOT NULL DEFAULT 'medium'
                        CHECK (severity IN ('low','medium','high')),
  cause               TEXT,
  attempt_number      INT NOT NULL DEFAULT 1,
  resolution_status   TEXT NOT NULL DEFAULT 'unresolved'
                        CHECK (resolution_status IN ('unresolved','in_repair','resolved')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mistake_patterns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_id    UUID NOT NULL REFERENCES concepts(id),
  pattern_type  TEXT,
  error_type    TEXT NOT NULL,
  frequency     INT NOT NULL DEFAULT 1,
  severity      TEXT NOT NULL DEFAULT 'medium',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','resolved')),
  UNIQUE (student_id, concept_id, error_type)
);

CREATE INDEX idx_mistakes_student_id ON mistakes(student_id);
CREATE INDEX idx_mistakes_concept_id ON mistakes(concept_id);
CREATE INDEX idx_mistake_patterns_student_id ON mistake_patterns(student_id);

-- ============================================================
-- PLANNING (Phase 6 — tables created now)
-- ============================================================

CREATE TABLE daily_plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id            UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  plan_date             DATE NOT NULL,
  total_available_min   INT NOT NULL DEFAULT 0,
  total_scheduled_min   INT NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'generated'
                          CHECK (status IN ('generated','active','revised','completed')),
  plan_version          INT NOT NULL DEFAULT 1,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, plan_date)
);

CREATE TABLE plan_items (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id                 UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  concept_id              UUID REFERENCES concepts(id),
  task_type               TEXT NOT NULL,
  priority                TEXT NOT NULL DEFAULT 'normal'
                            CHECK (priority IN ('critical','high','normal','low','optional')),
  constraint_type         TEXT NOT NULL DEFAULT 'flexible'
                            CHECK (constraint_type IN ('fixed','flexible')),
  scheduled_start         TIME,
  estimated_duration_min  INT NOT NULL DEFAULT 30,
  reason                  TEXT,
  status                  TEXT NOT NULL DEFAULT 'planned'
                            CHECK (status IN ('planned','active','completed','skipped','moved','dropped')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_plans_student_date ON daily_plans(student_id, plan_date DESC);
CREATE INDEX idx_plan_items_plan_id ON plan_items(plan_id);

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

ALTER TABLE study_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_states    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistakes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_patterns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items        ENABLE ROW LEVEL SECURITY;

-- Helper: get student_id for the authenticated user
CREATE OR REPLACE FUNCTION auth_student_id()
RETURNS UUID AS $$
  SELECT id FROM student_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS policies (all student-scoped)
CREATE POLICY "study_sessions_own"   ON study_sessions   FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "study_tasks_own"      ON study_tasks       FOR ALL
  USING (session_id IN (SELECT id FROM study_sessions WHERE student_id = auth_student_id()));
CREATE POLICY "mastery_states_own"   ON mastery_states   FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "mastery_events_own"   ON mastery_events   FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "revision_items_own"   ON revision_items   FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "revision_events_own"  ON revision_events  FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "notifications_own"    ON notifications    FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "mistakes_own"         ON mistakes         FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "mistake_patterns_own" ON mistake_patterns FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "daily_plans_own"      ON daily_plans      FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "plan_items_own"       ON plan_items       FOR ALL
  USING (plan_id IN (SELECT id FROM daily_plans WHERE student_id = auth_student_id()));

-- ============================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================

CREATE TRIGGER study_tasks_updated_at        BEFORE UPDATE ON study_tasks        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mastery_states_updated_at     BEFORE UPDATE ON mastery_states     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER revision_items_updated_at     BEFORE UPDATE ON revision_items     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mistakes_updated_at           BEFORE UPDATE ON mistakes           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_plans_updated_at        BEFORE UPDATE ON daily_plans        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER plan_items_updated_at         BEFORE UPDATE ON plan_items         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
