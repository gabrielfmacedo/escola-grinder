-- ============================================================
-- POKER SCHOOL — MIGRATION v2
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Preferência de moeda no perfil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'usd'
    CHECK (preferred_currency IN ('usd', 'brl'));

-- 2. Campos de torneio na tabela poker_sessions
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS tournament_name TEXT,
  ADD COLUMN IF NOT EXISTS entries        INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS position       INTEGER,
  ADD COLUMN IF NOT EXISTS is_live        BOOLEAN DEFAULT FALSE;

-- 3. Sessões do Modo Grind
CREATE TABLE IF NOT EXISTS grind_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  type            TEXT        NOT NULL CHECK (type IN ('single', 'mixed')),
  platform_id     UUID        REFERENCES poker_platforms(id),
  game_type       game_type,
  buy_in_cents    BIGINT,
  tournament_name TEXT,
  is_active       BOOLEAN     DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS grind_session_id UUID REFERENCES grind_sessions(id);

-- 4. Grupos de jogadores
CREATE TABLE IF NOT EXISTS player_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        DEFAULT '#e63030',
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_group_members (
  group_id  UUID NOT NULL REFERENCES player_groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- 5. Calendário de eventos
CREATE TABLE IF NOT EXISTS events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  type        TEXT        NOT NULL DEFAULT 'other'
    CHECK (type IN ('live_class', 'content_release', 'tournament', 'other')),
  url         TEXT,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Anúncios (chat-style, canto inferior direito)
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  message     TEXT,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Plataformas — atualizar nomes conforme solicitado
INSERT INTO poker_platforms (name) VALUES
  ('WPT Global'),
  ('CoinPoker')
ON CONFLICT (name) DO NOTHING;

-- 8. Índices
CREATE INDEX IF NOT EXISTS idx_grind_sessions_user   ON grind_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_grind_sessions_active ON grind_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_starts         ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_live   ON poker_sessions(user_id, is_live);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_grind  ON poker_sessions(grind_session_id);

-- 9. RLS
ALTER TABLE grind_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements     ENABLE ROW LEVEL SECURITY;

-- grind_sessions: aluno vê as próprias, instrutor vê todas
CREATE POLICY "Aluno vê próprias grind sessions"
  ON grind_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Instrutor vê todas grind sessions"
  ON grind_sessions FOR SELECT USING (is_instructor_or_admin());

-- player_groups: admin/instructor gerencia
CREATE POLICY "Instrutor gerencia grupos"
  ON player_groups FOR ALL USING (is_instructor_or_admin());
CREATE POLICY "Instrutor gerencia membros"
  ON player_group_members FOR ALL USING (is_instructor_or_admin());
CREATE POLICY "Aluno vê seus grupos"
  ON player_group_members FOR SELECT USING (auth.uid() = user_id);

-- events: todos autenticados veem; admin cria
CREATE POLICY "Todos veem eventos"
  ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Instrutor gerencia eventos"
  ON events FOR ALL USING (is_instructor_or_admin());

-- announcements: todos veem ativos; admin cria
CREATE POLICY "Todos veem anúncios ativos"
  ON announcements FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);
CREATE POLICY "Instrutor gerencia anúncios"
  ON announcements FOR ALL USING (is_instructor_or_admin());
