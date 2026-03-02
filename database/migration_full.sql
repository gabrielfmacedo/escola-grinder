-- ============================================================
-- POKER SCHOOL — MIGRATION COMPLETA (v2 + v3)
-- Execute este arquivo no Supabase SQL Editor
-- É seguro rodar mais de uma vez (todos os comandos usam IF NOT EXISTS)
-- ============================================================

-- ============================================================
-- PARTE 1 — Preferência de moeda no perfil
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'usd'
    CHECK (preferred_currency IN ('usd', 'brl'));

-- ============================================================
-- PARTE 2 — Campos de torneio na tabela poker_sessions
-- ============================================================
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS tournament_name TEXT,
  ADD COLUMN IF NOT EXISTS entries        INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS position       INTEGER,
  ADD COLUMN IF NOT EXISTS is_live        BOOLEAN DEFAULT FALSE;

-- ============================================================
-- PARTE 3 — Sessões do Modo Grind
-- ============================================================
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

-- ============================================================
-- PARTE 4 — Grupos de jogadores
-- ============================================================
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

-- ============================================================
-- PARTE 5 — Calendário de eventos
-- ============================================================
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

-- ============================================================
-- PARTE 6 — Anúncios
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  message     TEXT,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas de link nos anúncios (v3)
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS action_url   TEXT,
  ADD COLUMN IF NOT EXISTS action_label TEXT DEFAULT 'Ver mais';

-- ============================================================
-- PARTE 7 — Plataformas adicionais
-- ============================================================
INSERT INTO poker_platforms (name) VALUES
  ('WPT Global'),
  ('CoinPoker')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PARTE 8 — Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_grind_sessions_user   ON grind_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_grind_sessions_active ON grind_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_starts         ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_live   ON poker_sessions(user_id, is_live);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_grind  ON poker_sessions(grind_session_id);

-- ============================================================
-- PARTE 9 — RLS para novas tabelas
-- ============================================================
ALTER TABLE grind_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;

-- grind_sessions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grind_sessions' AND policyname='Aluno vê próprias grind sessions') THEN
    CREATE POLICY "Aluno vê próprias grind sessions" ON grind_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grind_sessions' AND policyname='Instrutor vê todas grind sessions') THEN
    CREATE POLICY "Instrutor vê todas grind sessions" ON grind_sessions FOR SELECT USING (is_instructor_or_admin());
  END IF;
END $$;

-- player_groups
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_groups' AND policyname='Instrutor gerencia grupos') THEN
    CREATE POLICY "Instrutor gerencia grupos" ON player_groups FOR ALL USING (is_instructor_or_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_group_members' AND policyname='Instrutor gerencia membros') THEN
    CREATE POLICY "Instrutor gerencia membros" ON player_group_members FOR ALL USING (is_instructor_or_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_group_members' AND policyname='Aluno vê seus grupos') THEN
    CREATE POLICY "Aluno vê seus grupos" ON player_group_members FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- events
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='Todos veem eventos') THEN
    CREATE POLICY "Todos veem eventos" ON events FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='Instrutor gerencia eventos') THEN
    CREATE POLICY "Instrutor gerencia eventos" ON events FOR ALL USING (is_instructor_or_admin());
  END IF;
END $$;

-- announcements
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='Todos veem anúncios ativos') THEN
    CREATE POLICY "Todos veem anúncios ativos" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='Instrutor gerencia anúncios') THEN
    CREATE POLICY "Instrutor gerencia anúncios" ON announcements FOR ALL USING (is_instructor_or_admin());
  END IF;
END $$;

-- ============================================================
-- PARTE 10 — CRÍTICO: Recriar a view poker_session_results
-- A view original usa ps.* que foi "congelado" na criação (v1)
-- e não inclui colunas adicionadas depois pelo ALTER TABLE.
-- ============================================================
DROP VIEW IF EXISTS poker_session_results;
CREATE VIEW poker_session_results AS
SELECT
  ps.id,
  ps.user_id,
  ps.platform_id,
  ps.played_at,
  ps.buy_in_cents,
  ps.cash_out_cents,
  ps.rakeback_cents,
  ps.duration_minutes,
  ps.game_type,
  ps.stakes,
  ps.notes,
  ps.created_at,
  ps.updated_at,
  ps.tournament_name,
  ps.entries,
  ps.position,
  ps.is_live,
  ps.grind_session_id,
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

-- ============================================================
-- VERIFICAÇÃO — Confirmar que tudo foi criado corretamente
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'poker_sessions' AND column_name = 'tournament_name') AS has_tournament_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'poker_sessions' AND column_name = 'is_live') AS has_is_live,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'poker_sessions' AND column_name = 'grind_session_id') AS has_grind_session_id,
  (SELECT COUNT(*) FROM information_schema.views
   WHERE table_name = 'poker_session_results') AS view_exists,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'poker_session_results' AND column_name = 'tournament_name') AS view_has_tournament_name;

-- Se todos os valores retornarem 1, a migration foi bem-sucedida.
