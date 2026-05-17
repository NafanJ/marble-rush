import { getLeaderboard } from '@/lib/db/leaderboard';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl font-extrabold logo-gradient mb-2">
          Leaderboard
        </h1>
        <p className="text-white/50">
          Top marble racers, ranked by total points
        </p>
      </div>

      <LeaderboardTable entries={entries} />

      {/* Points system explanation */}
      <div className="mt-10 card p-6">
        <h2 className="font-bold text-lg mb-4">Points System</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { pos: '1st', pts: 10, emoji: '🥇' },
            { pos: '2nd', pts: 7, emoji: '🥈' },
            { pos: '3rd', pts: 5, emoji: '🥉' },
            { pos: '4th–10th', pts: 2, emoji: '🏅' },
            { pos: 'Finisher', pts: 1, emoji: '✅' },
          ].map(({ pos, pts, emoji }) => (
            <div key={pos} className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xs text-white/40">{pos}</div>
              <div className="text-lg font-bold text-yellow-400">+{pts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
