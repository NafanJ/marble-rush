import { NextRequest, NextResponse } from 'next/server';
import { getEntrantsByRace } from '@/lib/db/entrants';

export async function GET(
  _req: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    const entrants = await getEntrantsByRace(params.raceId);
    return NextResponse.json(entrants);
  } catch (err) {
    console.error('[entrants GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
