import { NextResponse } from 'next/server';
import { getActiveRace } from '@/lib/db/races';

export async function GET() {
  try {
    const race = await getActiveRace();
    return NextResponse.json(race);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch active race' }, { status: 500 });
  }
}
