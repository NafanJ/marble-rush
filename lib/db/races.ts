import { supabaseAdmin } from '../supabaseAdmin';
import { Race, RaceRow, RaceStatus } from '../types';

function rowToRace(row: RaceRow): Race {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    maxEntries: row.max_entries,
    entryWindowSeconds: row.entry_window_seconds,
    speedMultiplier: Number(row.speed_multiplier),
    trackDifficulty: row.track_difficulty,
    trackSeed: row.track_seed,
    raceTimeoutSeconds: row.race_timeout_seconds,
    awardPoints: row.award_points,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export async function getRaceById(id: string): Promise<Race | null> {
  const { data, error } = await supabaseAdmin
    .from('races')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToRace(data as RaceRow);
}

export async function getActiveRace(): Promise<Race | null> {
  const { data, error } = await supabaseAdmin
    .from('races')
    .select('*')
    .in('status', ['entries_open', 'countdown', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return rowToRace(data as RaceRow);
}

export async function listRaces(limit = 20, offset = 0): Promise<Race[]> {
  const { data, error } = await supabaseAdmin
    .from('races')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return (data as RaceRow[]).map(rowToRace);
}

export async function createRace(params: {
  title: string;
  maxEntries?: number;
  entryWindowSeconds?: number;
  speedMultiplier?: number;
  trackDifficulty?: string;
  trackSeed?: string;
  raceTimeoutSeconds?: number;
  awardPoints?: boolean;
}): Promise<Race | null> {
  const seed = params.trackSeed || Math.random().toString(36).substring(2, 10);
  const { data, error } = await supabaseAdmin
    .from('races')
    .insert({
      title: params.title,
      status: 'draft',
      max_entries: params.maxEntries ?? 20,
      entry_window_seconds: params.entryWindowSeconds ?? 300,
      speed_multiplier: params.speedMultiplier ?? 1.0,
      track_difficulty: params.trackDifficulty ?? 'normal',
      track_seed: seed,
      race_timeout_seconds: params.raceTimeoutSeconds ?? 300,
      award_points: params.awardPoints ?? true,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToRace(data as RaceRow);
}

export async function updateRaceStatus(
  id: string,
  status: RaceStatus,
  extra?: { startedAt?: string; completedAt?: string }
): Promise<Race | null> {
  const updates: Record<string, unknown> = { status };
  if (extra?.startedAt) updates.started_at = extra.startedAt;
  if (extra?.completedAt) updates.completed_at = extra.completedAt;

  const { data, error } = await supabaseAdmin
    .from('races')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToRace(data as RaceRow);
}

export async function updateRace(
  id: string,
  params: Partial<{
    title: string;
    maxEntries: number;
    entryWindowSeconds: number;
    speedMultiplier: number;
    trackDifficulty: string;
    trackSeed: string;
    raceTimeoutSeconds: number;
    awardPoints: boolean;
  }>
): Promise<Race | null> {
  const updates: Record<string, unknown> = {};
  if (params.title !== undefined) updates.title = params.title;
  if (params.maxEntries !== undefined) updates.max_entries = params.maxEntries;
  if (params.entryWindowSeconds !== undefined) updates.entry_window_seconds = params.entryWindowSeconds;
  if (params.speedMultiplier !== undefined) updates.speed_multiplier = params.speedMultiplier;
  if (params.trackDifficulty !== undefined) updates.track_difficulty = params.trackDifficulty;
  if (params.trackSeed !== undefined) updates.track_seed = params.trackSeed;
  if (params.raceTimeoutSeconds !== undefined) updates.race_timeout_seconds = params.raceTimeoutSeconds;
  if (params.awardPoints !== undefined) updates.award_points = params.awardPoints;

  const { data, error } = await supabaseAdmin
    .from('races')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToRace(data as RaceRow);
}

export async function deleteRace(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('races').delete().eq('id', id);
  return !error;
}

export async function getCompletedRaces(limit = 20, offset = 0): Promise<Race[]> {
  const { data, error } = await supabaseAdmin
    .from('races')
    .select('*')
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return (data as RaceRow[]).map(rowToRace);
}
