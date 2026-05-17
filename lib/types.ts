export type RaceStatus = 'draft' | 'entries_open' | 'countdown' | 'running' | 'complete' | 'cancelled';
export type TrackDifficulty = 'easy' | 'normal' | 'chaos';

export interface Race {
  id: string;
  title: string;
  status: RaceStatus;
  maxEntries: number;
  entryWindowSeconds: number;
  speedMultiplier: number;
  trackDifficulty: TrackDifficulty;
  trackSeed: string;
  raceTimeoutSeconds: number;
  awardPoints: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface Entrant {
  id: string;
  raceId: string;
  displayName: string;
  normalisedDisplayName: string;
  colour: string;
  marbleTextureUrl: string | null;
  joinedAt: string;
  marbleNumber: number;
  browserSessionId: string;
}

export interface RaceResult {
  id: string;
  raceId: string;
  entrantId: string;
  displayName: string;
  position: number;
  finishTimeMs: number | null;
  pointsAwarded: number;
  didFinish: boolean;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  normalisedDisplayName: string;
  racesEntered: number;
  wins: number;
  podiums: number;
  totalPoints: number;
  averageFinishPosition: number | null;
  fastestFinishTimeMs: number | null;
  updatedAt: string;
}

export interface AdminAction {
  id: string;
  raceId: string | null;
  actionType: string;
  createdAt: string;
  details: Record<string, unknown> | null;
}

export interface FinishResult {
  entrantId: string;
  displayName: string;
  position: number;
  finishTimeMs: number;
  didFinish: boolean;
  pointsAwarded?: number;
}

export interface MarblePosition {
  entrantId: string;
  x: number;
  y: number;
  angle: number;
}

export interface TrackObstacle {
  type: 'peg' | 'wall' | 'ramp' | 'speedpad' | 'bumper' | 'funnel_wall' | 'gate';
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  radius?: number;
  isSpeedPad?: boolean;
  isBumper?: boolean;
}

export interface SceneData {
  entrants: Entrant[];
  isAdmin: boolean;
  trackDifficulty: TrackDifficulty;
  trackSeed: string;
  speedMultiplier: number;
  onRaceComplete: (results: FinishResult[]) => void;
  onPositionUpdate?: (positions: MarblePosition[]) => void;
}

// DB row types (snake_case from Supabase)
export interface RaceRow {
  id: string;
  title: string;
  status: RaceStatus;
  max_entries: number;
  entry_window_seconds: number;
  speed_multiplier: number;
  track_difficulty: TrackDifficulty;
  track_seed: string;
  race_timeout_seconds: number;
  award_points: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface EntrantRow {
  id: string;
  race_id: string;
  display_name: string;
  normalised_display_name: string;
  colour: string;
  marble_texture_url: string | null;
  joined_at: string;
  marble_number: number;
  browser_session_id: string;
}

export interface RaceResultRow {
  id: string;
  race_id: string;
  entrant_id: string;
  display_name: string;
  position: number;
  finish_time_ms: number | null;
  points_awarded: number;
  did_finish: boolean;
}

export interface LeaderboardEntryRow {
  id: string;
  display_name: string;
  normalised_display_name: string;
  races_entered: number;
  wins: number;
  podiums: number;
  total_points: number;
  average_finish_position: number | null;
  fastest_finish_time_ms: number | null;
  updated_at: string;
}
