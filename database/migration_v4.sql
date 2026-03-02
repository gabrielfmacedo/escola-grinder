-- ============================================================
-- POKER SCHOOL — MIGRATION v4
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. ITM (In The Money) na tabela de sessões
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS itm BOOLEAN DEFAULT FALSE;

-- 2. Ledger de transações de bankroll
CREATE TABLE IF NOT EXISTS bankroll_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id  UUID        REFERENCES poker_platforms(id),  -- null = entrada global
  type         TEXT        NOT NULL CHECK (type IN ('initial','deposit','withdrawal','rakeback','adjustment')),
  amount_cents BIGINT      NOT NULL,  -- positivo = entrada, negativo = saída
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Fechamento de caixa diário
CREATE TABLE IF NOT EXISTS day_closes (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date                   DATE        NOT NULL,
  opening_bankroll_cents BIGINT      NOT NULL,
  closing_bankroll_cents BIGINT      NOT NULL,
  session_profit_cents   BIGINT      NOT NULL DEFAULT 0,
  rakeback_cents         BIGINT      NOT NULL DEFAULT 0,
  adjustment_cents       BIGINT      NOT NULL DEFAULT 0,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 4. Tags de conteúdo
CREATE TABLE IF NOT EXISTS tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  slug       TEXT        NOT NULL UNIQUE,
  color      TEXT        NOT NULL DEFAULT '#3b9ef5',
  created_by UUID        NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_tags (
  course_id UUID NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (course_id, tag_id)
);

CREATE TABLE IF NOT EXISTS lesson_tags (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, tag_id)
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_bankroll_entries_user ON bankroll_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_bankroll_entries_platform ON bankroll_entries(user_id, platform_id);
CREATE INDEX IF NOT EXISTS idx_day_closes_user ON day_closes(user_id);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_itm ON poker_sessions(user_id, itm);
CREATE INDEX IF NOT EXISTS idx_course_tags ON course_tags(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_tags ON lesson_tags(lesson_id);

-- 6. RLS
ALTER TABLE bankroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_closes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_tags      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- bankroll_entries
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bankroll_entries' AND policyname='Usuário gerencia próprio bankroll') THEN
    CREATE POLICY "Usuário gerencia próprio bankroll" ON bankroll_entries FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bankroll_entries' AND policyname='Instrutor vê bankroll de alunos') THEN
    CREATE POLICY "Instrutor vê bankroll de alunos" ON bankroll_entries FOR SELECT USING (is_instructor_or_admin());
  END IF;

  -- day_closes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='day_closes' AND policyname='Usuário gerencia próprio fechamento') THEN
    CREATE POLICY "Usuário gerencia próprio fechamento" ON day_closes FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- tags: todos autenticados leem; admins criam/editam/deletam
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tags' AND policyname='Todos veem tags') THEN
    CREATE POLICY "Todos veem tags" ON tags FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tags' AND policyname='Instrutor gerencia tags') THEN
    CREATE POLICY "Instrutor gerencia tags" ON tags FOR ALL USING (is_instructor_or_admin());
  END IF;

  -- course_tags / lesson_tags
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='course_tags' AND policyname='Todos veem course_tags') THEN
    CREATE POLICY "Todos veem course_tags" ON course_tags FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='course_tags' AND policyname='Instrutor gerencia course_tags') THEN
    CREATE POLICY "Instrutor gerencia course_tags" ON course_tags FOR ALL USING (is_instructor_or_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lesson_tags' AND policyname='Todos veem lesson_tags') THEN
    CREATE POLICY "Todos veem lesson_tags" ON lesson_tags FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lesson_tags' AND policyname='Instrutor gerencia lesson_tags') THEN
    CREATE POLICY "Instrutor gerencia lesson_tags" ON lesson_tags FOR ALL USING (is_instructor_or_admin());
  END IF;
END $$;

-- 7. CRÍTICO: Recriar view poker_session_results para incluir coluna itm
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
  ps.itm,
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

-- 8. Verificação
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='poker_sessions' AND column_name='itm') AS has_itm,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name='bankroll_entries') AS has_bankroll_entries,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name='day_closes') AS has_day_closes,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name='tags') AS has_tags,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='poker_session_results' AND column_name='itm') AS view_has_itm;
-- Todos os valores devem ser 1 se a migration foi bem-sucedida.
