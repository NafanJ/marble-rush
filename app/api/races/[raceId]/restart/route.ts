import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteRaceTextures } from '@/lib/db/storage';
import { Race, RaceRow } from '@/lib/types';

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

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

export async function POST(
  req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clear entrants and results, reset race to entries_open. The cleared
    // entrants' uploaded textures are orphaned, so remove those too.
    await Promise.all([
      supabaseAdmin.from('entrants').delete().eq('race_id', params.raceId),
      supabaseAdmin.from('race_results').delete().eq('race_id', params.raceId),
      deleteRaceTextures(params.raceId),
    ]);

    const { data, error } = await supabaseAdmin
      .from('races')
      .update({ status: 'entries_open', started_at: null, completed_at: null })
      .eq('id', params.raceId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to restart race' }, { status: 500 });
    }

    return NextResponse.json(rowToRace(data as RaceRow));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
