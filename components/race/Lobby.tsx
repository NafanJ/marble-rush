'use client';

import { Race, Entrant } from '@/lib/types';
import JoinForm from './JoinForm';
import EntrantList from './EntrantList';
import Marble from '@/components/ui/Marble';

interface LobbyProps {
  race: Race;
  entrants: Entrant[];
  sessionId: string;
  myEntrantId: string | null;
  onJoined: (entrant: Entrant) => void;
}

export default function Lobby({
  race,
  entrants,
  sessionId,
  myEntrantId,
  onJoined,
}: LobbyProps) {
  const alreadyJoined = !!myEntrantId;
  const isFull = entrants.length >= race.maxEntries;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Race header */}
      <div className="text-center mb-8">
        <span className="pill pill-open mb-4">
          <span className="pill-dot" />
          Entries open
        </span>
        <h1 className="display text-3xl font-extrabold mb-3">{race.title}</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-white/45">
          <span>Max {race.maxEntries} marbles</span>
          <span className="text-white/20">·</span>
          <span>
            {race.trackDifficulty.charAt(0).toUpperCase() +
              race.trackDifficulty.slice(1)}{' '}
            track
          </span>
          <span className="text-white/20">·</span>
          <span>{race.speedMultiplier}× speed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Join form / status */}
        <div className="card p-6">
          {alreadyJoined ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                {entrants
                  .filter((e) => e.id === myEntrantId)
                  .map((e) => (
                    <Marble key={e.id} size={44} color={e.colour} className="animate-float" />
                  ))}
              </div>
              <h3 className="display text-lg font-bold mb-1">You&apos;re in!</h3>
              <p className="text-white/50 text-sm">
                Waiting for the admin to start the race...
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {entrants
                  .filter((e) => e.id === myEntrantId)
                  .map((e) => (
                    <span key={e.id} className="font-semibold text-sm">{e.displayName}</span>
                  ))}
              </div>
              <div className="mt-4 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-neon-violet rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : isFull ? (
            <div className="text-center py-4">
              <span className="pill pill-muted mb-3">Race full</span>
              <h3 className="display text-lg font-bold mb-1 mt-2">All spots taken</h3>
              <p className="text-white/50 text-sm">
                All {race.maxEntries} spots are taken. Watch the race below!
              </p>
            </div>
          ) : (
            <>
              <h2 className="display text-lg font-bold mb-4">Join the race</h2>
              <JoinForm
                raceId={race.id}
                sessionId={sessionId}
                onJoined={onJoined}
              />
            </>
          )}
        </div>

        {/* Entrant list */}
        <div className="card p-6">
          <EntrantList
            entrants={entrants}
            maxEntries={race.maxEntries}
            highlightId={myEntrantId ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
