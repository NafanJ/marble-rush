import { NextRequest, NextResponse } from 'next/server';
import { getRaceById } from '@/lib/db/races';
import {
  createEntrant,
  countEntrantsByRace,
  checkSessionInRace,
  checkNameInRace,
} from '@/lib/db/entrants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      raceId?: string;
      displayName?: string;
      browserSessionId?: string;
    };

    // Validate input
    if (!body.raceId) {
      return NextResponse.json({ error: 'raceId is required' }, { status: 400 });
    }
    if (!body.displayName || typeof body.displayName !== 'string') {
      return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
    }
    if (!body.browserSessionId) {
      return NextResponse.json({ error: 'browserSessionId is required' }, { status: 400 });
    }

    const trimmedName = body.displayName.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }
    if (trimmedName.length > 20) {
      return NextResponse.json(
        { error: 'Name must be 20 characters or less' },
        { status: 400 }
      );
    }

    // Check race exists and is open
    const race = await getRaceById(body.raceId);
    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    }
    if (race.status !== 'entries_open') {
      return NextResponse.json(
        { error: 'Race is not accepting entries right now' },
        { status: 409 }
      );
    }

    // Check session not already in race (one entry per browser session per race)
    const sessionExists = await checkSessionInRace(body.raceId, body.browserSessionId);
    if (sessionExists) {
      return NextResponse.json(
        { error: 'You have already entered this race' },
        { status: 409 }
      );
    }

    // Check name not taken
    const normalisedName = trimmedName.toLowerCase();
    const nameTaken = await checkNameInRace(body.raceId, normalisedName);
    if (nameTaken) {
      return NextResponse.json(
        { error: 'That name is already taken in this race' },
        { status: 409 }
      );
    }

    // Check race not full
    const count = await countEntrantsByRace(body.raceId);
    if (count >= race.maxEntries) {
      return NextResponse.json({ error: 'Race is full' }, { status: 409 });
    }

    // Create entrant
    const entrant = await createEntrant({
      raceId: body.raceId,
      displayName: trimmedName,
      browserSessionId: body.browserSessionId,
    });

    if (!entrant) {
      return NextResponse.json({ error: 'Failed to join race' }, { status: 500 });
    }

    return NextResponse.json(entrant, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
