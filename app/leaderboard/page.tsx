import { getLeaderboard } from '@/lib/db/leaderboard';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import Icon from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

const POINTS = [
  { pos: '1st', pts: 10, chip: 'rank-1', label: '1' },
  { pos: '2nd', pts: 7, chip: 'rank-2', label: '2' },
  { pos: '3rd', pts: 5, chip: 'rank-3', label: '3' },
  { pos: '4th–10th', pts: 2, chip: '', label: '4+' },
  { pos: 'Finisher', pts: 1, chip: '', label: '✓' },
];

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neon-gold/10 border border-neon-gold/25 text-neon-gold mb-5">
          <Icon name="trophy" size={26} />
        </div>
        <h1 className="display text-4xl font-extrabold mb-3">Leaderboard</h1>
        <p className="text-white/45">All-time standings, ranked by total points</p>
      </div>

      <LeaderboardTable entries={entries} />

      {/* Points system explanation */}
      <div className="mt-10 card p-6">
        <h2 className="eyebrow mb-5">How points work</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {POINTS.map(({ pos, pts, chip, label }) => (
            <div key={pos} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2.5">
                <span className={`rank-chip ${chip}`}>{label}</span>
              </div>
              <div className="text-xs text-white/40 mb-1">{pos}</div>
              <div className="num text-lg font-bold text-neon-gold">+{pts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
