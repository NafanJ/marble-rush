'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Race, Entrant, FinishResult, MarblePosition, RaceRow, EntrantRow } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Lobby from '@/components/race/Lobby';
import Countdown from '@/components/race/Countdown';
import PositionPanel from '@/components/race/PositionPanel';
import ResultsModal from '@/components/race/ResultsModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { MarbleRaceGameHandle } from '@/components/race/MarbleRaceGame';

const MarbleRaceGame = dynamic(
  () => import('@/components/race/MarbleRaceGame'),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full max-w-[800px] mx-auto bg-white/5 rounded-xl flex items-center justify-center"
        style={{ height: 400 }}
      >
        <LoadingSpinner message="Loading physics engine..." />
      </div>
    ),
  }
);

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-HTTPS contexts
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  return Array.from(arr).map((b, i) =>
    ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')
  ).join('');
}

// Unique browser session ID — persisted in localStorage
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'marble_session_id';
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = generateUUID();
    localStorage.setItem(key, sid);
  }
  return sid;
}

interface PageProps {
  params: { raceId: string };
}

export default function RacePage({ params }: PageProps) {
  const { raceId } = params;
  const [race, setRace] = useState<Race | null>(null);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEntrantId, setMyEntrantId] = useState<string | null>(null);
  const [sessionId] = useState(() => getSessionId());
  const [showCountdown, setShowCountdown] = useState(false);
  const [raceRunning, setRaceRunning] = useState(false);
  const [positions, setPositions] = useState<MarblePosition[]>([]);
  const [results, setResults] = useState<FinishResult[] | null>(null);
  const gameRef = useRef<MarbleRaceGameHandle | null>(null);

  // Load race and entrants
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [raceRes, entrantsRes] = await Promise.all([
        fetch(`/api/races/${raceId}`),
        fetch(`/api/races/${raceId}/entrants`),
      ]);
      if (raceRes.ok) {
        const r = await raceRes.json() as Race;
        setRace(r);
        // Restore state from race status
        if (r.status === 'countdown') setShowCountdown(true);
        if (r.status === 'running') setRaceRunning(true);
      }
      let fetchedEntrants: Entrant[] = [];
      if (entrantsRes.ok) {
        fetchedEntrants = await entrantsRes.json() as Entrant[];
        setEntrants(fetchedEntrants);
      }

      // Restore my entrant ID — localStorage first, then match by session ID
      const storedId = localStorage.getItem(`entrant_${raceId}`);
      if (storedId) {
        setMyEntrantId(storedId);
      } else {
        const sid = getSessionId();
        const mine = fetchedEntrants.find((e) => e.browserSessionId === sid);
        if (mine) {
          setMyEntrantId(mine.id);
          localStorage.setItem(`entrant_${raceId}`, mine.id);
        }
      }

      // Load results if complete
      if (race?.status === 'complete') {
        const resRes = await fetch(`/api/races/${raceId}/results`);
        if (resRes.ok) {
          const res = await resRes.json() as FinishResult[];
          // Use empty array sentinel so the page knows results were fetched (even if none exist)
          setResults(res.length > 0 ? res : []);
        } else {
          setResults([]);
        }
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId]);

  // Realtime subscriptions
  useEffect(() => {
    async function refreshEntrants() {
      const res = await fetch(`/api/races/${raceId}/entrants`);
      if (res.ok) setEntrants(await res.json() as Entrant[]);
    }

    const channel = supabase
      .channel(`race-${raceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'races', filter: `id=eq.${raceId}` },
        (payload: RealtimePostgresChangesPayload<RaceRow>) => {
          // Supabase realtime payloads use snake_case DB columns — map manually
          const row = payload.new as RaceRow;
          const updated: Race = {
            id: row.id,
            title: row.title,
            status: row.status,
            maxEntries: row.max_entries,
            entryWindowSeconds: row.entry_window_seconds,
            speedMultiplier: Number(row.speed_multiplier),
            trackDifficulty: row.track_difficulty,
            trackSeed: row.track_seed,
            raceTimeoutSeconds: row.race_timeout_seconds,
            awardPoints: row.award_points,
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
          };
          setRace(updated);
          if (updated.status === 'countdown') setShowCountdown(true);
          if (updated.status === 'running') {
            setShowCountdown(false);
            setRaceRunning(true);
            setTimeout(() => { gameRef.current?.startRace(); }, 500);
          }
          if (updated.status === 'complete') {
            setRaceRunning(false);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entrants', filter: `race_id=eq.${raceId}` },
        () => { refreshEntrants(); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'entrants' },
        (payload: RealtimePostgresChangesPayload<EntrantRow>) => {
          const deletedId = (payload.old as EntrantRow).id;
          setEntrants((prev) => prev.filter((e) => e.id !== deletedId));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'race_results', filter: `race_id=eq.${raceId}` },
        async () => {
          // Results published — fetch them
          const res = await fetch(`/api/races/${raceId}/results`);
          if (res.ok) {
            const data = await res.json() as FinishResult[];
            setResults(data);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [raceId]);

  const handleJoined = useCallback(async (entrantId: string) => {
    setMyEntrantId(entrantId);
    localStorage.setItem(`entrant_${raceId}`, entrantId);
    // Immediately refresh entrants so the new entry shows with correct field names
    const res = await fetch(`/api/races/${raceId}/entrants`);
    if (res.ok) setEntrants(await res.json() as Entrant[]);
  }, [raceId]);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setRaceRunning(true);
  }, []);

  const handleRaceComplete = useCallback((finishResults: FinishResult[]) => {
    setResults(finishResults);
    setRaceRunning(false);
  }, []);

  const handlePositionUpdate = useCallback((pos: MarblePosition[]) => {
    setPositions(pos);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading race..." />
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
        <div>
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2">Race Not Found</h2>
          <p className="text-white/40 mb-6">This race doesn&apos;t exist or has been deleted.</p>
          <a href="/" className="text-purple-400 hover:text-purple-300">
            ← Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Lobby */}
      {race.status === 'entries_open' && (
        <Lobby
          race={race}
          entrants={entrants}
          sessionId={sessionId}
          myEntrantId={myEntrantId}
          onJoined={handleJoined}
        />
      )}

      {/* Draft state */}
      {race.status === 'draft' && (
        <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
          <div className="card p-10 max-w-sm">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-xl font-bold mb-2">{race.title}</h2>
            <p className="text-white/40">This race is being set up. Check back soon!</p>
          </div>
        </div>
      )}

      {/* Cancelled */}
      {race.status === 'cancelled' && (
        <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
          <div className="card p-10 max-w-sm">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-xl font-bold mb-2">Race Cancelled</h2>
            <p className="text-white/40 mb-4">{race.title} was cancelled.</p>
            <a href="/" className="text-purple-400 hover:text-purple-300 text-sm">
              ← Back to home
            </a>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {showCountdown && (
        <Countdown onComplete={handleCountdownComplete} />
      )}

      {/* Race game — countdown or running */}
      {(race.status === 'countdown' || race.status === 'running' || raceRunning) && !showCountdown && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Race header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{race.title}</h1>
              <div className="flex items-center gap-2 text-sm text-blue-400 mt-0.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Race in progress
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/40">{entrants.length} marbles</span>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            {/* Game canvas */}
            <div className="flex-1">
              <MarbleRaceGame
                ref={gameRef}
                race={race}
                entrants={entrants}
                isAdmin={false}
                onRaceComplete={handleRaceComplete}
                onPositionUpdate={handlePositionUpdate}
              />
            </div>

            {/* Position panel */}
            {positions.length > 0 && (
              <div className="hidden lg:block flex-shrink-0">
                <PositionPanel positions={positions} entrants={entrants} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete — still fetching results */}
      {race.status === 'complete' && results === null && (
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingSpinner message="Loading results..." />
        </div>
      )}

      {/* Complete — results fetched but empty (race ended without physics results) */}
      {race.status === 'complete' && results !== null && results.length === 0 && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-white/60">
          <div className="text-5xl">🏁</div>
          <p className="text-lg font-semibold text-white">Race Complete</p>
          <p className="text-sm">No results were recorded for this race.</p>
          <a href="/" className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-semibold transition-colors">
            Back to Home
          </a>
        </div>
      )}

      {/* Results modal */}
      {results !== null && results.length > 0 && (
        <ResultsModal
          results={results}
          entrants={entrants}
          raceTitle={race.title}
        />
      )}
    </div>
  );
}
