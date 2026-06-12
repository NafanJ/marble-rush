'use client';

import { useMemo } from 'react';
import { Entrant, MarblePosition } from '@/lib/types';
import Marble from '@/components/ui/Marble';
import Icon from '@/components/ui/Icon';

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

  // Sort by Y descending (highest Y = furthest down the track = leading) when live positions exist
  const sorted = useMemo(() => {
    if (!positions?.length) return entrants;
    return [...entrants].sort((a, b) => {
      const ay = posMap.get(a.id) ?? -Infinity;
      const by = posMap.get(b.id) ?? -Infinity;
      return by - ay;
    });
  }, [entrants, positions, posMap]);

  const isRacing = !!(positions?.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="eyebrow">
          {isRacing ? 'Live standings' : 'Entered marbles'}
        </h3>
        <span className="num text-xs text-white/40">{entrants.length}/{maxEntries}</span>
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
            const rankNum     = rank + 1;

            return (
              <div
                key={entrant.id}
                onClick={() => onTrack?.(isTracked ? null : entrant.id)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                  onTrack ? 'cursor-pointer' : ''
                } ${
                  isTracked
                    ? 'bg-neon-gold/10 border border-neon-gold/40'
                    : isHighlight
                    ? 'bg-neon-violet/15 border border-neon-violet/40'
                    : 'bg-white/[0.04] border border-white/5 hover:border-white/15'
                }`}
              >
                {/* Rank */}
                <span
                  className={`rank-chip !w-6 !h-6 !text-[0.7rem] ${
                    isRacing && rankNum <= 3 ? `rank-${rankNum}` : ''
                  }`}
                >
                  {isRacing ? rankNum : entrant.marbleNumber}
                </span>

                {/* Marble avatar */}
                <Marble size={14} color={entrant.colour} />

                {/* Name */}
                <span className="flex-1 text-sm font-medium truncate">
                  {entrant.displayName}
                  {isHighlight && (
                    <span className="ml-1 text-xs text-neon-violet">(you)</span>
                  )}
                </span>

                {/* Camera / tracking icon */}
                {isTracked && (
                  <span className="text-neon-gold flex-shrink-0" title="Camera following">
                    <Icon name="eye" size={13} />
                  </span>
                )}

                {/* Custom texture indicator */}
                {entrant.marbleTextureUrl && (
                  <span className="text-neon-cyan flex-shrink-0" title="Custom marble">
                    <Icon name="sparkle" size={12} />
                  </span>
                )}

                {/* Remove button (admin only) */}
                {isAdmin && onRemove && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(entrant.id); }}
                    className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                    title="Remove entrant"
                  >
                    <Icon name="x" size={12} />
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
              className="h-full bg-gradient-to-r from-neon-violet to-neon-cyan rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (entrants.length / maxEntries) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
