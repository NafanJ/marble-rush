'use client';

import { FinishResult } from '@/lib/types';
import { Entrant } from '@/lib/types';
import Button from '../ui/Button';

interface ResultsModalProps {
  results: FinishResult[];
  entrants: Entrant[];
  raceTitle: string;
  onNewRace?: () => void;
}

const POSITION_EMOJI: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return 'DNF';
  const seconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0').slice(0, 2)}`;
  }
  return `${secs}.${millis.toString().padStart(3, '0').slice(0, 2)}s`;
}

export default function ResultsModal({
  results,
  entrants,
  raceTitle,
  onNewRace,
}: ResultsModalProps) {
  const entrantMap = new Map(entrants.map((e) => [e.id, e]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg card p-6 animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏁</div>
          <h2 className="text-2xl font-extrabold mb-1">{raceTitle}</h2>
          <p className="text-white/50 text-sm">Final Results</p>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {results.map((result) => {
            const entrant = entrantMap.get(result.entrantId);
            const colour = entrant?.colour ?? '#888888';
            const isTop3 = result.position <= 3;

            return (
              <div
                key={result.entrantId}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  result.position === 1
                    ? 'podium-1 border-yellow-400/40'
                    : result.position === 2
                    ? 'podium-2 border-gray-400/40'
                    : result.position === 3
                    ? 'podium-3 border-orange-600/40'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {/* Position */}
                <div className="w-8 text-center flex-shrink-0">
                  {isTop3 ? (
                    <span className="text-xl">{POSITION_EMOJI[result.position]}</span>
                  ) : (
                    <span className="text-sm font-bold text-white/40">
                      {result.position}
                    </span>
                  )}
                </div>

                {/* Marble dot */}
                <span
                  className="marble-dot flex-shrink-0"
                  style={{ backgroundColor: colour }}
                />

                {/* Name */}
                <span className="flex-1 font-semibold text-sm truncate">
                  {result.displayName}
                </span>

                {/* Time */}
                <span className="text-xs text-white/40 flex-shrink-0">
                  {result.didFinish ? formatTime(result.finishTimeMs ?? 0) : '⚠️ DNF'}
                </span>

                {/* Points */}
                {(result.pointsAwarded ?? 0) > 0 && (
                  <span className="text-xs font-bold text-yellow-400 flex-shrink-0">
                    +{result.pointsAwarded}pts
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => window.location.href = '/leaderboard'}
          >
            🏆 Leaderboard
          </Button>
          {onNewRace && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={onNewRace}
            >
              🔮 New Race
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-4">
          Results saved · Points awarded
        </p>
      </div>
    </div>
  );
}
