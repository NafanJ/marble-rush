-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Races
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','entries_open','countdown','running','complete','cancelled')),
  max_entries INTEGER NOT NULL DEFAULT 20,
  entry_window_seconds INTEGER NOT NULL DEFAULT 300,
  speed_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  track_difficulty TEXT NOT NULL DEFAULT 'normal'
    CHECK (track_difficulty IN ('easy','normal','chaos')),
  track_seed TEXT NOT NULL DEFAULT '',
  race_timeout_seconds INTEGER NOT NULL DEFAULT 300,
  award_points BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Entrants
CREATE TABLE IF NOT EXISTS entrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  normalised_display_name TEXT NOT NULL,
  colour TEXT NOT NULL,
  marble_texture_url TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marble_number INTEGER NOT NULL,
  browser_session_id TEXT NOT NULL,
  UNIQUE (race_id, normalised_display_name)
);

-- Race results
CREATE TABLE IF NOT EXISTS race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  entrant_id UUID NOT NULL REFERENCES entrants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  finish_time_ms INTEGER,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  did_finish BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (race_id, entrant_id)
);

-- Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  normalised_display_name TEXT NOT NULL UNIQUE,
  races_entered INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  podiums INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  average_finish_position DECIMAL(6,2),
  fastest_finish_time_ms INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin action log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB
);

-- RLS: enable but allow anon to read
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public_read_races" ON races FOR SELECT USING (true);
CREATE POLICY "public_read_entrants" ON entrants FOR SELECT USING (true);
CREATE POLICY "public_read_results" ON race_results FOR SELECT USING (true);
CREATE POLICY "public_read_leaderboard" ON leaderboard_entries FOR SELECT USING (true);

-- Service role has full access (via service key in API routes — bypasses RLS)
-- Writes go through API routes using the service key, not anon key

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entrants_race_id ON entrants(race_id);
CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(race_id);
CREATE INDEX IF NOT EXISTS idx_races_status ON races(status);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_points ON leaderboard_entries(total_points DESC);
