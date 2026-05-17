'use client';

import { Entrant } from '@/lib/types';

interface EntrantListProps {
  entrants: Entrant[];
  maxEntries: number;
  isAdmin?: boolean;
  onRemove?: (entrantId: string) => void;
  highlightId?: string;
}

export default function EntrantList({
  entrants,
  maxEntries,
  isAdmin = false,
  onRemove,
  highlightId,
}: EntrantListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white/80 text-sm">
          Entered Marbles
        </h3>
        <span className="text-sm text-white/40">
          {entrants.length} / {maxEntries}
        </span>
      </div>

      {entrants.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          No one has entered yet. Be first!
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {entrants.map((entrant) => (
            <div
              key={entrant.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                entrant.id === highlightId
                  ? 'bg-purple-600/20 border border-purple-500/40'
                  : 'bg-white/5 border border-white/5 hover:border-white/10'
              }`}
            >
              {/* Marble colour dot */}
              <span
                className="marble-dot flex-shrink-0"
                style={{ backgroundColor: entrant.colour }}
              />

              {/* Marble number */}
              <span className="text-white/30 text-xs w-5 text-center flex-shrink-0">
                #{entrant.marbleNumber}
              </span>

              {/* Name */}
              <span className="flex-1 text-sm font-medium truncate">
                {entrant.displayName}
                {entrant.id === highlightId && (
                  <span className="ml-1.5 text-xs text-purple-400">(you)</span>
                )}
              </span>

              {/* Texture indicator */}
              {entrant.marbleTextureUrl && (
                <span className="text-xs text-cyan-400 flex-shrink-0" title="Custom marble">
                  🎨
                </span>
              )}

              {/* Remove button (admin only) */}
              {isAdmin && onRemove && (
                <button
                  onClick={() => onRemove(entrant.id)}
                  className="text-white/20 hover:text-red-400 transition-colors text-xs flex-shrink-0 p-1"
                  title="Remove entrant"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {maxEntries > 0 && (
        <div className="mt-3">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (entrants.length / maxEntries) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
