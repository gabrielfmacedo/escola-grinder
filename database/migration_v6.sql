-- Migration v6: add is_pko to poker_sessions + refresh view
-- Run this in Supabase SQL Editor

-- 1. Add is_pko column to poker_sessions
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS is_pko BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Recreate poker_session_results view to include is_pko and total_players
DROP VIEW IF EXISTS poker_session_results;
CREATE VIEW poker_session_results AS
SELECT
  ps.id,
  ps.user_id,
  ps.platform_id,
  pp.name AS platform_name,
  ps.played_at,
  ps.game_type,
  ps.tournament_name,
  ps.is_live,
  ps.buy_in_cents,
  ps.cash_out_cents,
  ps.cash_out_cents - ps.buy_in_cents AS profit_cents,
  ps.entries,
  ps.position,
  ps.total_players,
  ps.duration_minutes,
  ps.notes,
  ps.grind_session_id,
  ps.itm,
  ps.is_pko,
  CASE
    WHEN ps.buy_in_cents > 0
    THEN ROUND(((ps.cash_out_cents - ps.buy_in_cents)::numeric / ps.buy_in_cents) * 100, 2)
    ELSE 0
  END AS roi_percent,
  ps.created_at
FROM poker_sessions ps
JOIN poker_platforms pp ON pp.id = ps.platform_id;
