-- Migration v3: Announcements link support + View fix
-- Run this in your Supabase SQL Editor

-- 1. Announcements: add link/button support
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS action_url   TEXT,
  ADD COLUMN IF NOT EXISTS action_label TEXT DEFAULT 'Ver mais';

-- 2. CRITICAL: Recreate poker_session_results to include v2 columns
--    (tournament_name, entries, position, is_live, grind_session_id)
--    The original view used ps.* which was expanded at v1 creation time
--    and does not pick up columns added later by ALTER TABLE.
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
