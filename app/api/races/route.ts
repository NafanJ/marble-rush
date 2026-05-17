import { NextRequest, NextResponse } from 'next/server';
import { createRace, listRaces } from '@/lib/db/races';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function checkAdmin(req: NextRequest): boolean {
  const password = req.headers.get('x-admin-password');
  return password === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  try {
    const races = await listRaces();
    return NextResponse.json(races);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      title?: string;
      maxEntries?: number;
      entryWindowSeconds?: number;
      speedMultiplier?: number;
      trackDifficulty?: string;
      trackSeed?: string;
      raceTimeoutSeconds?: number;
      awardPoints?: boolean;
    };

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check no other active race
    const { data: active } = await supabaseAdmin
      .from('races')
      .select('id')
      .in('status', ['entries_open', 'countdown', 'running'])
      .maybeSingle();

    if (active) {
      return NextResponse.json(
        { error: 'Another race is already active' },
        { status: 409 }
      );
    }

    const race = await createRace({
      title: body.title.trim(),
      maxEntries: body.maxEntries,
      entryWindowSeconds: body.entryWindowSeconds,
      speedMultiplier: body.speedMultiplier,
      trackDifficulty: body.trackDifficulty,
      trackSeed: body.trackSeed,
      raceTimeoutSeconds: body.raceTimeoutSeconds,
      awardPoints: body.awardPoints,
    });

    if (!race) {
      return NextResponse.json({ error: 'Failed to create race' }, { status: 500 });
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      race_id: race.id,
      action_type: 'race_created',
      details: { title: race.title },
    });

    return NextResponse.json(race, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
