import { NextRequest, NextResponse } from 'next/server';
import { getCompletedRaces } from '@/lib/db/races';
import { getResultsByRace } from '@/lib/db/results';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '20');
    const offset = parseInt(url.searchParams.get('offset') ?? '0');

    const races = await getCompletedRaces(limit, offset);

    // Fetch top 3 results for each race
    const racesWithResults = await Promise.all(
      races.map(async (race) => {
        const results = await getResultsByRace(race.id);
        return {
          ...race,
          results: results.slice(0, 3),
          entrantCount: results.length,
        };
      })
    );

    return NextResponse.json(racesWithResults);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
