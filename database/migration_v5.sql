-- Migration v5: transfer type, total_players, suggestions
-- Run this in Supabase SQL Editor

-- 1. Add 'transfer' to bankroll_entries type constraint
ALTER TABLE bankroll_entries
  DROP CONSTRAINT IF EXISTS bankroll_entries_type_check;
ALTER TABLE bankroll_entries
  ADD CONSTRAINT bankroll_entries_type_check
    CHECK (type IN ('initial','deposit','withdrawal','rakeback','adjustment','transfer'));

-- 2. Add to_platform_id for transfers
ALTER TABLE bankroll_entries
  ADD COLUMN IF NOT EXISTS to_platform_id UUID REFERENCES poker_platforms(id);

-- 3. Add total_players to poker_sessions
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS total_players INT;

-- 4. Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','approved','implemented','rejected')),
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_users_read_own"
  ON suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "suggestions_users_insert_own"
  ON suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "suggestions_admin_all"
  ON suggestions
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'instructor')
    )
  );
