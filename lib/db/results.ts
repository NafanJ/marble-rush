import { supabaseAdmin } from '../supabaseAdmin';
import { RaceResult, RaceResultRow, FinishResult } from '../types';
import { POINTS_TABLE, POINTS_FINISHED, POINTS_DNF } from '../constants';

function rowToResult(row: RaceResultRow): RaceResult {
  return {
    id: row.id,
    raceId: row.race_id,
    entrantId: row.entrant_id,
    displayName: row.display_name,
    position: row.position,
    finishTimeMs: row.finish_time_ms,
    pointsAwarded: row.points_awarded,
    didFinish: row.did_finish,
  };
}

export function calculatePoints(position: number, didFinish: boolean): number {
  if (!didFinish) return POINTS_DNF;
  return POINTS_TABLE[position] ?? POINTS_FINISHED;
}

export async function getResultsByRace(raceId: string): Promise<RaceResult[]> {
  const { data, error } = await supabaseAdmin
    .from('race_results')
    .select('*')
    .eq('race_id', raceId)
    .order('position', { ascending: true });
  if (error || !data) return [];
  return (data as RaceResultRow[]).map(rowToResult);
}

export async function hasResults(raceId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('race_results')
    .select('*', { count: 'exact', head: true })
    .eq('race_id', raceId);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function insertResults(
  raceId: string,
  results: FinishResult[]
): Promise<RaceResult[]> {
  const rows = results.map((r) => ({
    race_id: raceId,
    entrant_id: r.entrantId,
    display_name: r.displayName,
    position: r.position,
    finish_time_ms: r.finishTimeMs > 0 ? r.finishTimeMs : null,
    points_awarded: calculatePoints(r.position, r.didFinish),
    did_finish: r.didFinish,
  }));

  const { data, error } = await supabaseAdmin
    .from('race_results')
    .insert(rows)
    .select('*');

  if (error || !data) return [];
  return (data as RaceResultRow[]).map(rowToResult);
}
