import { NextRequest, NextResponse } from 'next/server';
import { getRaceById, updateRace, deleteRace } from '@/lib/db/races';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    const race = await getRaceById(params.raceId);
    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    return NextResponse.json(race);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json() as Record<string, unknown>;
    const race = await updateRace(params.raceId, {
      title: body.title as string | undefined,
      maxEntries: body.maxEntries as number | undefined,
      entryWindowSeconds: body.entryWindowSeconds as number | undefined,
      speedMultiplier: body.speedMultiplier as number | undefined,
      trackDifficulty: body.trackDifficulty as string | undefined,
      trackSeed: body.trackSeed as string | undefined,
      raceTimeoutSeconds: body.raceTimeoutSeconds as number | undefined,
      awardPoints: body.awardPoints as boolean | undefined,
    });
    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    return NextResponse.json(race);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await supabaseAdmin.from('admin_actions').insert({
      race_id: params.raceId,
      action_type: 'race_deleted',
    });
    const ok = await deleteRace(params.raceId);
    if (!ok) return NextResponse.json({ error: 'Failed to delete race' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
