import Link from 'next/link';
import { getActiveRace, getCompletedRaces } from '@/lib/db/races';
import { Race } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  entries_open: 'Entries Open — Join Now!',
  countdown: 'Starting Soon...',
  running: 'Race in Progress',
};

const STATUS_COLORS: Record<string, string> = {
  entries_open: 'text-green-400',
  countdown: 'text-yellow-400',
  running: 'text-blue-400',
};

function ActiveRaceCard({ race }: { race: Race }) {
  const label = STATUS_LABELS[race.status] ?? race.status;
  const color = STATUS_COLORS[race.status] ?? 'text-white/60';
  return (
    <div className="card max-w-md mx-auto p-8 mb-10 glow-purple text-center">
      <div className="text-4xl mb-3">🏁</div>
      <h2 className="text-2xl font-extrabold mb-1">{race.title}</h2>
      <p className={`text-sm font-semibold mb-5 ${color}`}>● {label}</p>
      <Link
        href={`/race/${race.id}`}
        className="inline-block bg-purple-600 hover:bg-purple-500 transition-colors px-8 py-3 rounded-xl font-bold text-lg"
      >
        {race.status === 'entries_open' ? '🔮 Join the Race' : '👀 Watch Live'}
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [activeRace, recentRaces] = await Promise.all([
    getActiveRace(),
    getCompletedRaces(5),
  ]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start px-4 pt-16 pb-12 text-center">
      <div className="animate-fade-in w-full max-w-3xl">
        {/* Logo */}
        <div className="mb-10">
          <div className="text-8xl mb-4">🔮</div>
          <h1 className="text-5xl md:text-7xl font-extrabold logo-gradient mb-3">
            Marble Rush
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-md mx-auto">
            Real-time marble racing. Pure physics. Zero skill required.
          </p>
        </div>

        {/* Active race or idle state */}
        {activeRace ? (
          <ActiveRaceCard race={activeRace} />
        ) : (
          <div className="card max-w-sm mx-auto p-8 mb-10">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-white mb-2">No Race Running</h2>
            <p className="text-white/50 text-sm">
              Ask the admin to start a race. Check back soon!
            </p>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-4 justify-center mb-14">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition-colors px-6 py-3 rounded-xl font-semibold"
          >
            🏆 Leaderboard
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors px-6 py-3 rounded-xl font-semibold"
          >
            📜 All Races
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-6 py-3 rounded-xl text-white/50 hover:text-white text-sm"
          >
            ⚙️ Admin
          </Link>
        </div>

        {/* Recent completed races */}
        {recentRaces.length > 0 && (
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4">
              Recent Races
            </h3>
            <div className="space-y-2">
              {recentRaces.map((race) => (
                <Link
                  key={race.id}
                  href={`/race/${race.id}`}
                  className="card flex items-center justify-between px-5 py-4 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏁</span>
                    <div>
                      <p className="font-semibold group-hover:text-purple-300 transition-colors">
                        {race.title}
                      </p>
                      <p className="text-xs text-white/40">
                        {race.completedAt
                          ? new Date(race.completedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Completed'}
                      </p>
                    </div>
                  </div>
                  <span className="text-white/30 group-hover:text-white/60 text-sm transition-colors">
                    View results →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="card p-5">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-bold mb-1">Join the Race</h3>
            <p className="text-white/50 text-sm">
              Enter your name when the lobby opens. Upload a custom marble texture if you want.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-bold mb-1">Watch Live</h3>
            <p className="text-white/50 text-sm">
              Physics simulation runs in your browser. Every race is different — chaos guaranteed.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-2xl mb-2">🏅</div>
            <h3 className="font-bold mb-1">Earn Points</h3>
            <p className="text-white/50 text-sm">
              Top 10 finishers earn points. 1st place gets 10 points. Climb the leaderboard!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
