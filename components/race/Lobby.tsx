'use client';

import { Race, Entrant } from '@/lib/types';
import JoinForm from './JoinForm';
import EntrantList from './EntrantList';

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
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-4">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Entries Open
        </div>
        <h1 className="text-3xl font-extrabold mb-2">{race.title}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-white/50">
          <span>🎯 Max {race.maxEntries} marbles</span>
          <span>·</span>
          <span>
            🌊{' '}
            {race.trackDifficulty.charAt(0).toUpperCase() +
              race.trackDifficulty.slice(1)}{' '}
            track
          </span>
          <span>·</span>
          <span>⚡ {race.speedMultiplier}× speed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Join form / status */}
        <div className="card p-6">
          {alreadyJoined ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-bold mb-1">You&apos;re In!</h3>
              <p className="text-white/50 text-sm">
                Waiting for the admin to start the race...
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {entrants
                  .filter((e) => e.id === myEntrantId)
                  .map((e) => (
                    <span key={e.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="marble-dot"
                        style={{ backgroundColor: e.colour }}
                      />
                      <span className="font-medium">{e.displayName}</span>
                    </span>
                  ))}
              </div>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : isFull ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🚫</div>
              <h3 className="text-lg font-bold mb-1">Race Full</h3>
              <p className="text-white/50 text-sm">
                All {race.maxEntries} spots are taken. Watch the race below!
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-4">Join the Race</h2>
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
