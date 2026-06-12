import { NextRequest, NextResponse } from 'next/server';
import { insertResults, hasResults, getResultsByRace } from '@/lib/db/results';
import { updateRaceStatus } from '@/lib/db/races';
import { deleteRaceTextures } from '@/lib/db/storage';
import { upsertLeaderboardEntry } from '@/lib/db/leaderboard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FinishResult } from '@/lib/types';

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    const results = await getResultsByRace(params.raceId);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { raceId } = params;

    // Idempotency: if results already exist, return them
    const alreadyHas = await hasResults(raceId);
    if (alreadyHas) {
      const existing = await getResultsByRace(raceId);
      return NextResponse.json(existing);
    }

    const body = await req.json() as { results?: FinishResult[] };
    const finishResults = body.results;

    if (!Array.isArray(finishResults) || finishResults.length === 0) {
      return NextResponse.json({ error: 'Results array is required' }, { status: 400 });
    }

    // Validate result shape
    for (const r of finishResults) {
      if (!r.entrantId || typeof r.position !== 'number') {
        return NextResponse.json({ error: 'Invalid result format' }, { status: 400 });
      }
    }

    // Drop results for entrants removed mid-race: the simulation keeps
    // them (frozen roster), but the NOT NULL FK on race_results.entrant_id
    // would reject the whole batch. Re-rank positions after filtering.
    const { data: existingEntrants } = await supabaseAdmin
      .from('entrants')
      .select('id')
      .eq('race_id', raceId);
    const validIds = new Set(((existingEntrants ?? []) as { id: string }[]).map((e) => e.id));
    const filtered = finishResults
      .filter((r) => validIds.has(r.entrantId))
      .map((r, idx) => ({ ...r, position: idx + 1 }));

    if (filtered.length === 0) {
      return NextResponse.json({ error: 'No valid entrants in results' }, { status: 400 });
    }

    // Insert results
    const savedResults = await insertResults(raceId, filtered);

    // Check if race awards points
    const { data: raceRow } = await supabaseAdmin
      .from('races')
      .select('award_points')
      .eq('id', raceId)
      .single();

    const awardPoints = (raceRow as { award_points?: boolean } | null)?.award_points ?? true;

    // Update leaderboard for each result
    if (awardPoints) {
      for (const result of savedResults) {
        await upsertLeaderboardEntry(result);
      }
    }

    // Mark race as complete
    await updateRaceStatus(raceId, 'complete', {
      completedAt: new Date().toISOString(),
    });

    // Textures are only read while the race is live — free the storage
    await deleteRaceTextures(raceId);

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      race_id: raceId,
      action_type: 'results_saved',
      details: { count: savedResults.length, winner: savedResults[0]?.displayName },
    });

    return NextResponse.json(savedResults, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
