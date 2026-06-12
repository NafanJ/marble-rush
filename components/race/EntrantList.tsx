'use client';

import { useMemo } from 'react';
import { Entrant, MarblePosition } from '@/lib/types';

interface EntrantListProps {
  entrants: Entrant[];
  maxEntries: number;
  isAdmin?: boolean;
  onRemove?: (entrantId: string) => void;
  highlightId?: string;
  // Race-time props
  positions?: MarblePosition[];
  trackedId?: string | null;
  onTrack?: (id: string | null) => void;
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function EntrantList({
  entrants,
  maxEntries,
  isAdmin = false,
  onRemove,
  highlightId,
  positions,
  trackedId,
  onTrack,
}: EntrantListProps) {
  // Build a Y-position map if live data is available
  const posMap = useMemo(() => {
    const m = new Map<string, number>();
    positions?.forEach(p => m.set(p.entrantId, p.y));
    return m;
  }, [positions]);

  // Sort by Y ascending (lowest Y = furthest along = leading) when live positions exist
  const sorted = useMemo(() => {
    if (!positions?.length) return entrants;
    return [...entrants].sort((a, b) => {
      const ay = posMap.get(a.id) ?? Infinity;
      const by = posMap.get(b.id) ?? Infinity;
      return ay - by;
    });
  }, [entrants, positions, posMap]);

  const isRacing = !!(positions?.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white/80 text-sm">
          {isRacing ? 'Live Standings' : 'Entered Marbles'}
        </h3>
        <span className="text-sm text-white/40">{entrants.length} / {maxEntries}</span>
      </div>

      {entrants.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          No one has entered yet. Be first!
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {sorted.map((entrant, rank) => {
            const isHighlight = entrant.id === highlightId;
            const isTracked   = entrant.id === trackedId;
            const medal       = isRacing ? (RANK_MEDALS[rank + 1] ?? null) : null;
            const rankNum     = rank + 1;

            return (
              <div
                key={entrant.id}
                onClick={() => onTrack?.(isTracked ? null : entrant.id)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                  onTrack ? 'cursor-pointer' : ''
                } ${
                  isTracked
                    ? 'bg-yellow-500/15 border border-yellow-500/50'
                    : isHighlight
                    ? 'bg-purple-600/20 border border-purple-500/40'
                    : 'bg-white/5 border border-white/5 hover:border-white/15'
                }`}
              >
                {/* Rank / medal */}
                {isRacing ? (
                  <span className="text-xs w-6 text-center flex-shrink-0">
                    {medal ?? <span className="text-white/30">#{rankNum}</span>}
                  </span>
                ) : (
                  <span className="text-white/30 text-xs w-5 text-center flex-shrink-0">
                    #{entrant.marbleNumber}
                  </span>
                )}

                {/* Colour dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entrant.colour }}
                />

                {/* Name */}
                <span className="flex-1 text-sm font-medium truncate">
                  {entrant.displayName}
                  {isHighlight && (
                    <span className="ml-1 text-xs text-purple-400">(you)</span>
                  )}
                </span>

                {/* Camera / tracking icon */}
                {isTracked && (
                  <span className="text-yellow-400 text-xs flex-shrink-0" title="Camera following">
                    📷
                  </span>
                )}

                {/* Custom texture indicator */}
                {entrant.marbleTextureUrl && (
                  <span className="text-xs text-cyan-400 flex-shrink-0" title="Custom marble">
                    🎨
                  </span>
                )}

                {/* Remove button (admin only) */}
                {isAdmin && onRemove && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(entrant.id); }}
                    className="text-white/20 hover:text-red-400 transition-colors text-xs flex-shrink-0 p-1"
                    title="Remove entrant"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fill bar */}
      {maxEntries > 0 && (
        <div className="mt-3">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (entrants.length / maxEntries) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
