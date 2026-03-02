-- ============================================================
-- POKER SCHOOL - DATABASE SCHEMA
-- Supabase / PostgreSQL
-- Versão: 1.0 | Data: 2026-02-25
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role         AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE plan_type         AS ENUM ('basic', 'pro', 'elite');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'pending');
CREATE TYPE lesson_type       AS ENUM ('video_youtube', 'video_drive', 'text', 'pdf', 'quiz');
CREATE TYPE notification_type AS ENUM ('new_content', 'mentorship', 'achievement', 'system', 'financial');
CREATE TYPE session_status    AS ENUM ('scheduled', 'completed', 'canceled');
CREATE TYPE game_type         AS ENUM ('MTT', 'Cash', 'Spin&Go', 'SNG', 'Outros');

-- ============================================================
-- USERS & AUTH
-- ============================================================

-- Estende auth.users do Supabase
CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'student',
  avatar_url  TEXT,
  phone       TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLANS & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE plans (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT      NOT NULL,
  type              plan_type NOT NULL UNIQUE,
  description       TEXT,
  features          JSONB     DEFAULT '[]', -- lista de features do plano
  price_cents       INTEGER,               -- em centavos BRL
  cakto_product_id  TEXT,                  -- ID do produto na Cakto
  is_active         BOOLEAN   DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dados iniciais dos planos
INSERT INTO plans (name, type, description) VALUES
  ('Básico',  'basic', 'Acesso ao conteúdo fundamental'),
  ('Pro',     'pro',   'Acesso avançado com mentoria'),
  ('Elite',   'elite', 'Acesso completo + acompanhamento individual');

CREATE TABLE subscriptions (
  id                     UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id                UUID                NOT NULL REFERENCES plans(id),
  status                 subscription_status NOT NULL DEFAULT 'pending',
  cakto_subscription_id  TEXT,
  cakto_transaction_id   TEXT,
  starts_at              TIMESTAMPTZ,
  ends_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Log de eventos recebidos da Cakto (auditoria)
CREATE TABLE cakto_webhook_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT        NOT NULL, -- purchase_approved, subscription_canceled, etc.
  payload      JSONB       NOT NULL,
  processed    BOOLEAN     DEFAULT FALSE,
  error        TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSES & CONTENT
-- ============================================================

CREATE TABLE courses (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT      NOT NULL,
  slug           TEXT      NOT NULL UNIQUE, -- URL amigável
  description    TEXT,
  thumbnail_url  TEXT,
  instructor_id  UUID      NOT NULL REFERENCES profiles(id),
  required_plan  plan_type NOT NULL DEFAULT 'basic',
  is_published   BOOLEAN   DEFAULT FALSE,
  order_index    INTEGER   DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE modules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  order_index  INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  type             lesson_type NOT NULL DEFAULT 'video_youtube',
  content_url      TEXT,         -- URL do YouTube ou Google Drive
  content_text     TEXT,         -- conteúdo para aulas em texto/markdown
  duration_minutes INTEGER,
  order_index      INTEGER     DEFAULT 0,
  is_free_preview  BOOLEAN     DEFAULT FALSE, -- aula disponível sem login
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progresso individual do aluno por aula
CREATE TABLE lesson_progress (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id        UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed        BOOLEAN     DEFAULT FALSE,
  progress_percent INTEGER     DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_watched_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================================
-- LEARNING PATHS (TRILHAS)
-- ============================================================

CREATE TABLE learning_paths (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT      NOT NULL,
  slug           TEXT      NOT NULL UNIQUE,
  description    TEXT,
  thumbnail_url  TEXT,
  required_plan  plan_type NOT NULL DEFAULT 'basic',
  is_published   BOOLEAN   DEFAULT FALSE,
  created_by     UUID      NOT NULL REFERENCES profiles(id),
  order_index    INTEGER   DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cursos dentro de uma trilha (ordenados)
CREATE TABLE learning_path_courses (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID    NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id        UUID    NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index      INTEGER DEFAULT 0,
  UNIQUE(learning_path_id, course_id)
);

-- Matrículas em trilhas
CREATE TABLE learning_path_enrollments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  learning_path_id UUID        NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  UNIQUE(user_id, learning_path_id)
);

-- ============================================================
-- MENTORSHIP
-- ============================================================

CREATE TABLE mentorship_sessions (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID           NOT NULL REFERENCES profiles(id),
  instructor_id  UUID           NOT NULL REFERENCES profiles(id),
  title          TEXT,
  scheduled_at   TIMESTAMPTZ,
  status         session_status DEFAULT 'scheduled',
  notes          TEXT,          -- notas privadas do instrutor
  homework       TEXT,          -- dever de casa
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE mentorship_materials (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  file_url    TEXT,
  type        TEXT,       -- 'pdf', 'hand_history', 'video', 'link'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leaks e metas individuais do aluno
CREATE TABLE student_goals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id  UUID        REFERENCES profiles(id),
  title          TEXT        NOT NULL, -- ex: "Frequência de C-bet em potes 3bet"
  description    TEXT,
  is_resolved    BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

-- ============================================================
-- BANKROLL & FINANCIAL
-- ============================================================

CREATE TABLE poker_platforms (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL UNIQUE,
  logo_url   TEXT,
  is_active  BOOLEAN DEFAULT TRUE
);

-- Plataformas padrão
INSERT INTO poker_platforms (name) VALUES
  ('PokerStars'),
  ('GGPoker'),
  ('WPN / Americas Cardroom'),
  ('888poker'),
  ('PartyPoker'),
  ('Run It Once'),
  ('Bodog / Ignition'),
  ('Outros');

-- Saldo atual por plataforma por jogador
CREATE TABLE bankrolls (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id          UUID        NOT NULL REFERENCES poker_platforms(id),
  current_balance_cents BIGINT     NOT NULL DEFAULT 0,
  currency             TEXT        NOT NULL DEFAULT 'BRL',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform_id)
);

-- Registro de sessões de poker
CREATE TABLE poker_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id       UUID        NOT NULL REFERENCES poker_platforms(id),
  played_at         DATE        NOT NULL DEFAULT CURRENT_DATE,
  buy_in_cents      BIGINT      NOT NULL,
  cash_out_cents    BIGINT      NOT NULL DEFAULT 0,
  rakeback_cents    BIGINT      DEFAULT 0,
  duration_minutes  INTEGER,
  game_type         game_type,
  stakes            TEXT,       -- ex: 'NL5', '$3.30 MTT', '$55 PKO'
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View calculada: resultado por sessão
CREATE VIEW poker_session_results AS
SELECT
  ps.*,
  pp.name AS platform_name,
  (ps.cash_out_cents + COALESCE(ps.rakeback_cents, 0) - ps.buy_in_cents) AS profit_cents,
  CASE
    WHEN ps.buy_in_cents > 0
    THEN ROUND(
      ((ps.cash_out_cents + COALESCE(ps.rakeback_cents, 0) - ps.buy_in_cents)::NUMERIC
        / ps.buy_in_cents) * 100, 2)
    ELSE 0
  END AS roi_percent
FROM poker_sessions ps
JOIN poker_platforms pp ON pp.id = ps.platform_id;

-- View: resumo financeiro por jogador
CREATE VIEW player_financial_summary AS
SELECT
  ps.user_id,
  COUNT(*)                                                        AS total_sessions,
  SUM(ps.buy_in_cents)                                            AS total_invested_cents,
  SUM(ps.cash_out_cents + COALESCE(ps.rakeback_cents, 0))         AS total_returned_cents,
  SUM(ps.cash_out_cents + COALESCE(ps.rakeback_cents, 0)
      - ps.buy_in_cents)                                          AS total_profit_cents,
  SUM(ps.duration_minutes)                                        AS total_minutes_played,
  CASE
    WHEN SUM(ps.duration_minutes) > 0
    THEN ROUND(
      (SUM(ps.cash_out_cents + COALESCE(ps.rakeback_cents,0) - ps.buy_in_cents)::NUMERIC
        / SUM(ps.duration_minutes)) * 60, 2)
    ELSE 0
  END AS hourly_rate_cents -- lucro por hora em centavos
FROM poker_sessions ps
GROUP BY ps.user_id;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT              NOT NULL,
  message     TEXT,
  action_url  TEXT,             -- link ao clicar na notificação
  is_read     BOOLEAN           DEFAULT FALSE,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GAMIFICATION (Fase 3 — estrutura já pronta)
-- ============================================================

CREATE TABLE trophies (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT    NOT NULL,
  description      TEXT,
  icon             TEXT,
  condition_type   TEXT,   -- 'sessions_count', 'study_hours', 'final_tables', 'profit_milestone'
  condition_value  INTEGER
);

CREATE TABLE user_trophies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trophy_id  UUID        NOT NULL REFERENCES trophies(id),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, trophy_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_lesson_progress_user        ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson      ON lesson_progress(lesson_id);
CREATE INDEX idx_poker_sessions_user         ON poker_sessions(user_id);
CREATE INDEX idx_poker_sessions_date         ON poker_sessions(played_at DESC);
CREATE INDEX idx_poker_sessions_platform     ON poker_sessions(platform_id);
CREATE INDEX idx_notifications_user_unread   ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_subscriptions_user          ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status        ON subscriptions(status);
CREATE INDEX idx_mentorship_student          ON mentorship_sessions(student_id);
CREATE INDEX idx_mentorship_instructor       ON mentorship_sessions(instructor_id);
CREATE INDEX idx_courses_published           ON courses(is_published, required_plan);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankrolls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trophies        ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário logado é instrutor ou admin
CREATE OR REPLACE FUNCTION is_instructor_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('instructor', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Usuário vê próprio perfil"         ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Instrutor vê todos os perfis"      ON profiles FOR SELECT USING (is_instructor_or_admin());
CREATE POLICY "Usuário atualiza próprio perfil"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- POKER SESSIONS
CREATE POLICY "Aluno vê próprias sessões"         ON poker_sessions FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Instrutor vê todas as sessões"     ON poker_sessions FOR SELECT USING (is_instructor_or_admin());

-- BANKROLLS
CREATE POLICY "Aluno gerencia própria banca"      ON bankrolls FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Instrutor vê todas as bancas"      ON bankrolls FOR SELECT USING (is_instructor_or_admin());

-- LESSON PROGRESS
CREATE POLICY "Aluno gerencia próprio progresso"  ON lesson_progress FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Instrutor vê progresso de todos"   ON lesson_progress FOR SELECT USING (is_instructor_or_admin());

-- NOTIFICATIONS
CREATE POLICY "Usuário vê próprias notificações"  ON notifications FOR ALL USING (auth.uid() = user_id);

-- MENTORSHIP SESSIONS
CREATE POLICY "Aluno vê próprias mentorias"       ON mentorship_sessions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Instrutor gerencia todas mentorias" ON mentorship_sessions FOR ALL USING (is_instructor_or_admin());

-- STUDENT GOALS
CREATE POLICY "Aluno vê próprias metas"           ON student_goals FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Instrutor gerencia todas as metas" ON student_goals FOR ALL    USING (is_instructor_or_admin());

-- SUBSCRIPTIONS
CREATE POLICY "Usuário vê própria assinatura"     ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin gerencia assinaturas"        ON subscriptions FOR ALL    USING (is_instructor_or_admin());

-- USER TROPHIES
CREATE POLICY "Usuário vê próprios troféus"       ON user_trophies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Sistema concede troféus"           ON user_trophies FOR INSERT WITH CHECK (is_instructor_or_admin());
