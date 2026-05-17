'use client';

import { LeaderboardEntry } from '@/lib/types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

function formatTime(ms: number | null): string {
  if (!ms) return '—';
  const seconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0').slice(0, 2)}`;
  }
  return `${secs}.${millis.toString().padStart(3, '0').slice(0, 2)}s`;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <p className="text-white/40">No races completed yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Wins</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Podiums</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Races</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Avg Pos</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Best Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                    rank === 1
                      ? 'bg-yellow-400/5'
                      : rank === 2
                      ? 'bg-gray-400/5'
                      : rank === 3
                      ? 'bg-orange-600/5'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    {isTop3 ? (
                      <span className="text-lg">{MEDALS[rank]}</span>
                    ) : (
                      <span className="text-white/30 font-mono">{rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{entry.displayName}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-yellow-400">
                      {entry.totalPoints.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-white/60">
                    {entry.wins}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-white/60">
                    {entry.podiums}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-white/40">
                    {entry.racesEntered}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-white/40">
                    {entry.averageFinishPosition
                      ? entry.averageFinishPosition.toFixed(1)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-white/40 font-mono text-xs">
                    {formatTime(entry.fastestFinishTimeMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
