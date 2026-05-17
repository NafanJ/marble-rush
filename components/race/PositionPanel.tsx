'use client';

import { MarblePosition, Entrant } from '@/lib/types';

interface PositionPanelProps {
  positions: MarblePosition[];
  entrants: Entrant[];
}

export default function PositionPanel({ positions, entrants }: PositionPanelProps) {
  const entrantMap = new Map(entrants.map((e) => [e.id, e]));

  // Sort by y descending (highest y = closest to finish)
  const sorted = [...positions].sort((a, b) => b.y - a.y);

  return (
    <div className="card p-3 w-48">
      <p className="text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">
        Live Order
      </p>
      <div className="space-y-1.5">
        {sorted.slice(0, 10).map((pos, idx) => {
          const entrant = entrantMap.get(pos.entrantId);
          return (
            <div key={pos.entrantId} className="flex items-center gap-2">
              <span className="text-xs text-white/30 w-4 text-right">
                {idx + 1}
              </span>
              <span
                className="marble-dot"
                style={{
                  backgroundColor: entrant?.colour ?? '#888',
                  width: 10,
                  height: 10,
                }}
              />
              <span className="text-xs truncate flex-1">
                {entrant?.displayName ?? 'Unknown'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
