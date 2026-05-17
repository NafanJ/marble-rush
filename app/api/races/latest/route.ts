import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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

// Returns the most recent non-cancelled race including drafts (admin only).
// Used so the admin can reload the page and still see their draft race.
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('races')
      .select('*')
      .not('status', 'in', '("cancelled","complete")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return NextResponse.json(null);
    return NextResponse.json(rowToRace(data as RaceRow));
  } catch {
    return NextResponse.json(null);
  }
}
