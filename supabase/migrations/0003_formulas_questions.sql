-- TILLU — Migration 0003
-- Phase 2: formulas, formula_reviews, questions, research tables

-- ============================================================
-- FORMULAS
-- ============================================================

CREATE TABLE formulas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id  UUID REFERENCES concepts(id),
  subject_id  UUID NOT NULL REFERENCES subjects(id),
  name        TEXT NOT NULL,
  expression  TEXT NOT NULL,
  description TEXT,
  variables   JSONB NOT NULL DEFAULT '{}',
  category    TEXT NOT NULL DEFAULT 'formula'
                CHECK (category IN ('formula','reaction','theorem','constant','definition','rule')),
  importance  INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE formula_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  formula_id      UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  outcome         TEXT NOT NULL CHECK (outcome IN ('recalled','partial','failed')),
  student_answer  TEXT,
  next_review_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_formulas_subject_id    ON formulas(subject_id);
CREATE INDEX idx_formulas_concept_id    ON formulas(concept_id);
CREATE INDEX idx_formula_reviews_student ON formula_reviews(student_id);
CREATE INDEX idx_formula_reviews_formula ON formula_reviews(formula_id);
CREATE INDEX idx_formula_reviews_next    ON formula_reviews(next_review_at);

-- ============================================================
-- QUESTIONS  (Phase 5 will expand this)
-- ============================================================

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id      UUID REFERENCES concepts(id),
  subject_id      UUID REFERENCES subjects(id),
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'short'
                    CHECK (question_type IN ('mcq','short','long','numerical','assertion_reason')),
  options         JSONB,           -- for MCQ: [{label,text,is_correct}]
  answer          TEXT,
  explanation     TEXT,
  difficulty      TEXT NOT NULL DEFAULT 'medium'
                    CHECK (difficulty IN ('easy','medium','hard')),
  source          TEXT NOT NULL DEFAULT 'ai_generated'
                    CHECK (source IN ('ai_generated','pyq','manual','ncert')),
  source_year     INT,             -- for PYQs
  marks           INT DEFAULT 1,
  schema_version  TEXT NOT NULL DEFAULT 'v1',
  model           TEXT,
  prompt_version  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_concept_id  ON questions(concept_id);
CREATE INDEX idx_questions_subject_id  ON questions(subject_id);
CREATE INDEX idx_questions_source      ON questions(source);

-- ============================================================
-- RESEARCH (referenced in handler.ts — tables must exist)
-- ============================================================

CREATE TABLE research_queries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  query         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','completed','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE research_sources (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id      UUID NOT NULL REFERENCES research_queries(id) ON DELETE CASCADE,
  url           TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL,
  domain        TEXT NOT NULL DEFAULT 'unknown',
  source_type   TEXT NOT NULL DEFAULT 'reference'
                  CHECK (source_type IN ('web','ncert','textbook','reference')),
  retrieved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content_hash  TEXT NOT NULL DEFAULT '',
  quality_score NUMERIC(4,2) DEFAULT 0.5
);

CREATE TABLE research_claims (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id    UUID NOT NULL REFERENCES research_queries(id) ON DELETE CASCADE,
  claim       TEXT NOT NULL,
  confidence  TEXT NOT NULL DEFAULT 'UNVERIFIED'
                CHECK (confidence IN ('HIGH','MEDIUM','LOW','UNVERIFIED')),
  source_ids  JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_queries_student  ON research_queries(student_id);
CREATE INDEX idx_research_claims_query     ON research_claims(query_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE formulas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_queries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_claims   ENABLE ROW LEVEL SECURITY;

-- Formulas: readable by all authenticated users (shared reference data)
CREATE POLICY "formulas_read"   ON formulas   FOR SELECT USING (auth.role() = 'authenticated');
-- Questions: readable by all authenticated users
CREATE POLICY "questions_read"  ON questions  FOR SELECT USING (auth.role() = 'authenticated');

-- Student-scoped
CREATE POLICY "formula_reviews_own"  ON formula_reviews  FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "research_queries_own" ON research_queries FOR ALL USING (student_id = auth_student_id());
CREATE POLICY "research_sources_own" ON research_sources FOR ALL
  USING (query_id IN (SELECT id FROM research_queries WHERE student_id = auth_student_id()));
CREATE POLICY "research_claims_own"  ON research_claims  FOR ALL
  USING (query_id IN (SELECT id FROM research_queries WHERE student_id = auth_student_id()));
