import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db/leaderboard';

export async function GET() {
  try {
    const entries = await getLeaderboard(100);
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
