import { getCompletedRaces } from '@/lib/db/races';
import { getResultsByRace } from '@/lib/db/results';
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

const POSITION_EMOJI: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export default async function HistoryPage() {
  const races = await getCompletedRaces(30);

  const racesWithResults = await Promise.all(
    races.map(async (race) => {
      const results = await getResultsByRace(race.id);
      return { race, results: results.slice(0, 3), total: results.length };
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">📜</div>
        <h1 className="text-4xl font-extrabold logo-gradient mb-2">
          Race History
        </h1>
        <p className="text-white/50">
          Every marble race, forever etched in history
        </p>
      </div>

      {racesWithResults.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-white/40">No completed races yet. Go race!</p>
          <Link href="/" className="mt-4 inline-block text-purple-400 hover:text-purple-300 text-sm">
            ← Back to home
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {racesWithResults.map(({ race, results, total }) => (
            <div key={race.id} className="card p-6 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{race.title}</h2>
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

              {/* Top 3 podium */}
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
                    <span className="text-white/40 text-xs">
                      {formatTime(result.finishTimeMs)}
                    </span>
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
      )}
    </div>
  );
}
