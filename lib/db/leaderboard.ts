import { supabaseAdmin } from '../supabaseAdmin';
import { LeaderboardEntry, LeaderboardEntryRow, RaceResult } from '../types';

function rowToEntry(row: LeaderboardEntryRow): LeaderboardEntry {
  return {
    id: row.id,
    displayName: row.display_name,
    normalisedDisplayName: row.normalised_display_name,
    racesEntered: row.races_entered,
    wins: row.wins,
    podiums: row.podiums,
    totalPoints: row.total_points,
    averageFinishPosition: row.average_finish_position,
    fastestFinishTimeMs: row.fastest_finish_time_ms,
    updatedAt: row.updated_at,
  };
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('leaderboard_entries')
    .select('*')
    .order('total_points', { ascending: false })
    .order('wins', { ascending: false })
    .order('podiums', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as LeaderboardEntryRow[]).map(rowToEntry);
}

export async function upsertLeaderboardEntry(result: RaceResult): Promise<void> {
  const normalisedName = result.displayName.trim().toLowerCase();

  // Fetch current entry if it exists
  const { data: existing } = await supabaseAdmin
    .from('leaderboard_entries')
    .select('*')
    .eq('normalised_display_name', normalisedName)
    .maybeSingle();

  if (existing) {
    const row = existing as LeaderboardEntryRow;
    const newRacesEntered = row.races_entered + 1;
    const newWins = row.wins + (result.position === 1 ? 1 : 0);
    const newPodiums = row.podiums + (result.position <= 3 ? 1 : 0);
    const newTotalPoints = row.total_points + result.pointsAwarded;

    // Recalculate average finish position
    const prevAvg = row.average_finish_position ?? result.position;
    const newAvg =
      (prevAvg * row.races_entered + result.position) / newRacesEntered;

    // Update fastest finish time
    let newFastest = row.fastest_finish_time_ms;
    if (result.finishTimeMs !== null && result.didFinish) {
      if (newFastest === null || result.finishTimeMs < newFastest) {
        newFastest = result.finishTimeMs;
      }
    }

    await supabaseAdmin
      .from('leaderboard_entries')
      .update({
        races_entered: newRacesEntered,
        wins: newWins,
        podiums: newPodiums,
        total_points: newTotalPoints,
        average_finish_position: newAvg,
        fastest_finish_time_ms: newFastest,
        updated_at: new Date().toISOString(),
      })
      .eq('normalised_display_name', normalisedName);
  } else {
    await supabaseAdmin.from('leaderboard_entries').insert({
      display_name: result.displayName,
      normalised_display_name: normalisedName,
      races_entered: 1,
      wins: result.position === 1 ? 1 : 0,
      podiums: result.position <= 3 ? 1 : 0,
      total_points: result.pointsAwarded,
      average_finish_position: result.position,
      fastest_finish_time_ms:
        result.finishTimeMs !== null && result.didFinish
          ? result.finishTimeMs
          : null,
      updated_at: new Date().toISOString(),
    });
  }
}
