import { listRaces } from '@/lib/db/races';
import { getResultsByRace } from '@/lib/db/results';
import { Race } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ms: number | null): string {
  if (!ms || ms <= 0) return 'DNF';
  const seconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const secs = seconds % 60;
  return `${secs}.${millis.toString().padStart(3, '0').slice(0, 2)}s`;
}

const POSITION_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: string }> = {
  entries_open: { label: 'Entries Open', color: 'text-green-400', dot: 'bg-green-400', icon: '🟢' },
  countdown:    { label: 'Starting Soon', color: 'text-yellow-400', dot: 'bg-yellow-400', icon: '⏳' },
  running:      { label: 'In Progress',   color: 'text-blue-400',   dot: 'bg-blue-400',   icon: '🔵' },
  complete:     { label: 'Complete',      color: 'text-purple-400', dot: 'bg-purple-400', icon: '🏁' },
  draft:        { label: 'Draft',         color: 'text-white/40',   dot: 'bg-white/40',   icon: '🔧' },
};

function ActiveRaceRow({ race }: { race: Race }) {
  const cfg = STATUS_CONFIG[race.status];
  const isOpen = race.status === 'entries_open';
  return (
    <Link
      href={`/race/${race.id}`}
      className="card flex items-center justify-between px-5 py-4 hover:bg-white/10 transition-colors group border border-white/10"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{cfg?.icon ?? '🏁'}</span>
        <div>
          <p className="font-bold group-hover:text-purple-300 transition-colors">{race.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? ''} ${isOpen ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${cfg?.color ?? 'text-white/50'}`}>{cfg?.label ?? race.status}</span>
            <span className="text-xs text-white/30">· {race.trackDifficulty} track · {race.speedMultiplier}× speed</span>
          </div>
        </div>
      </div>
      <span className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
        isOpen
          ? 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30'
          : 'bg-white/10 text-white/60 group-hover:bg-white/20'
      }`}>
        {isOpen ? '🔮 Join' : '👀 Watch'} →
      </span>
    </Link>
  );
}

export default async function HistoryPage() {
  const allRaces = await listRaces(50);

  const activeRaces = allRaces.filter((r) =>
    ['entries_open', 'countdown', 'running', 'draft'].includes(r.status)
  );
  const completedRaces = allRaces.filter((r) => r.status === 'complete');

  const completedWithResults = await Promise.all(
    completedRaces.map(async (race) => {
      const results = await getResultsByRace(race.id);
      return { race, results: results.slice(0, 3), total: results.length };
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">📜</div>
        <h1 className="text-4xl font-extrabold logo-gradient mb-2">All Races</h1>
        <p className="text-white/50">Find an open race to join, or browse past results</p>
      </div>

      {/* Active / open races */}
      {activeRaces.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">
            Active Races
          </h2>
          <div className="space-y-2">
            {activeRaces.map((race) => (
              <ActiveRaceRow key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* Completed races */}
      {completedWithResults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">
            Completed Races
          </h2>
          <div className="space-y-4">
            {completedWithResults.map(({ race, results, total }) => (
              <div key={race.id} className="card p-6 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{race.title}</h3>
                    <p className="text-sm text-white/40 mt-0.5">
                      {race.completedAt ? formatDate(race.completedAt) : 'Unknown date'}
                      {' · '}
                      {total} entrant{total !== 1 ? 's' : ''}
                      {' · '}
                      {race.trackDifficulty} track
                    </p>
                  </div>
                  <Link
                    href={`/race/${race.id}`}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    View →
                  </Link>
                </div>

                <div className="flex flex-wrap gap-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        result.position === 1
                          ? 'bg-yellow-400/10 border border-yellow-400/20'
                          : result.position === 2
                          ? 'bg-gray-400/10 border border-gray-400/20'
                          : 'bg-orange-600/10 border border-orange-600/20'
                      }`}
                    >
                      <span>{POSITION_EMOJI[result.position]}</span>
                      <span className="font-semibold">{result.displayName}</span>
                      <span className="text-white/40 text-xs">{formatTime(result.finishTimeMs)}</span>
                    </div>
                  ))}
                  {total > 3 && (
                    <div className="flex items-center px-3 py-2 text-sm text-white/30">
                      +{total - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeRaces.length === 0 && completedWithResults.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-white/40">No races yet. Ask the admin to create one!</p>
          <Link href="/" className="mt-4 inline-block text-purple-400 hover:text-purple-300 text-sm">
            ← Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
