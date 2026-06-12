import { NextRequest, NextResponse } from 'next/server';
import { updateRaceStatus, getRaceById } from '@/lib/db/races';
import { deleteRaceTextures } from '@/lib/db/storage';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { RaceStatus } from '@/lib/types';

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

const VALID_TRANSITIONS: Record<RaceStatus, RaceStatus[]> = {
  draft: ['entries_open', 'cancelled'],
  entries_open: ['countdown', 'cancelled'],
  countdown: ['running', 'entries_open', 'cancelled'],
  running: ['complete', 'cancelled'],
  complete: [],
  cancelled: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { status?: string };
    const newStatus = body.status as RaceStatus;

    const validStatuses: RaceStatus[] = [
      'draft', 'entries_open', 'countdown', 'running', 'complete', 'cancelled',
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const current = await getRaceById(params.raceId);
    if (!current) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    }

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    const extra: { startedAt?: string; completedAt?: string } = {};
    if (newStatus === 'running') extra.startedAt = new Date().toISOString();
    if (newStatus === 'complete' || newStatus === 'cancelled') {
      extra.completedAt = new Date().toISOString();
    }

    const updated = await updateRaceStatus(params.raceId, newStatus, extra);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // Terminal state: uploaded marble textures are never read again
    if (newStatus === 'cancelled') {
      await deleteRaceTextures(params.raceId);
    }

    // Log action
    await supabaseAdmin.from('admin_actions').insert({
      race_id: params.raceId,
      action_type: `status_changed_to_${newStatus}`,
      details: { from: current.status, to: newStatus },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
