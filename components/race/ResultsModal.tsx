'use client';

import { FinishResult } from '@/lib/types';
import { Entrant } from '@/lib/types';
import Button from '../ui/Button';
import Marble from '../ui/Marble';
import Icon from '../ui/Icon';

interface ResultsModalProps {
  results: FinishResult[];
  entrants: Entrant[];
  raceTitle: string;
  /** Only the admin browser persists results to the database */
  isAdmin?: boolean;
  onNewRace?: () => void;
}

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
  isAdmin = false,
  onNewRace,
}: ResultsModalProps) {
  const entrantMap = new Map(entrants.map((e) => [e.id, e]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg card p-6 animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neon-gold/10 border border-neon-gold/25 text-neon-gold mb-4">
            <Icon name="flag" size={22} />
          </div>
          <h2 className="display text-2xl font-extrabold mb-1">{raceTitle}</h2>
          <p className="eyebrow">Final results</p>
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
                  isTop3 ? `podium-${result.position}` : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <span className={`rank-chip ${isTop3 ? `rank-${result.position}` : ''}`}>
                  {result.position}
                </span>

                <Marble size={18} color={colour} />

                <span className="flex-1 font-semibold text-sm truncate">
                  {result.displayName}
                </span>

                <span className={`num text-xs flex-shrink-0 ${result.didFinish ? 'text-white/45' : 'text-amber-400/80'}`}>
                  {result.didFinish ? formatTime(result.finishTimeMs ?? 0) : 'DNF'}
                </span>

                {(result.pointsAwarded ?? 0) > 0 && (
                  <span className="num text-xs font-bold text-neon-gold flex-shrink-0">
                    +{result.pointsAwarded}
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
            <Icon name="trophy" size={15} /> Leaderboard
          </Button>
          {onNewRace && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={onNewRace}
            >
              <Icon name="play" size={15} /> New race
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-4">
          {isAdmin ? 'Results saved · Points awarded' : 'Official results are saved by the race admin'}
        </p>
      </div>
    </div>
  );
}
