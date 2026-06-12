import { listRaces } from '@/lib/db/races';
import { getResultsByRace } from '@/lib/db/results';
import { Race } from '@/lib/types';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ms: number | null): string {
  if (!ms || ms <= 0) return 'DNF';
  const seconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const secs = seconds % 60;
  return `${secs}.${millis.toString().padStart(3, '0').slice(0, 2)}s`;
}

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  entries_open: { label: 'Entries open', cls: 'pill-open' },
  countdown: { label: 'Starting soon', cls: 'pill-soon' },
  running: { label: 'In progress', cls: 'pill-live' },
  draft: { label: 'Draft', cls: 'pill-muted' },
};

function ActiveRaceRow({ race }: { race: Race }) {
  const pill = STATUS_PILL[race.status] ?? { label: race.status, cls: 'pill-muted' };
  const isOpen = race.status === 'entries_open';
  return (
    <Link
      href={`/race/${race.id}`}
      className="card card-hover flex items-center justify-between px-5 py-4 group"
    >
      <div>
        <p className="font-bold group-hover:text-neon-violet transition-colors">{race.title}</p>
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className={`pill ${pill.cls}`}>
            <span className="pill-dot" />
            {pill.label}
          </span>
          <span className="text-xs text-white/30">
            {race.trackDifficulty} track · {race.speedMultiplier}× speed
          </span>
        </div>
      </div>
      <span className={`btn ${isOpen ? 'btn-gold' : 'btn-ghost'} px-4 py-2 text-sm`}>
        {isOpen ? 'Join' : 'Watch'} <Icon name="arrowRight" size={14} />
      </span>
    </Link>
  );
}

export default async function HistoryPage() {
  const allRaces = await listRaces(50);

  const activeRaces = allRaces.filter((r) =>
    ['entries_open', 'countdown', 'running', 'draft'].includes(r.status)
  );
  const completedRaces = allRaces.filter((r) => r.status === 'complete');

  const completedWithResults = await Promise.all(
    completedRaces.map(async (race) => {
      const results = await getResultsByRace(race.id);
      return { race, results: results.slice(0, 3), total: results.length };
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan mb-5">
          <Icon name="flag" size={26} />
        </div>
        <h1 className="display text-4xl font-extrabold mb-3">All Races</h1>
        <p className="text-white/45">Find an open race to join, or browse past results</p>
      </div>

      {/* Active / open races */}
      {activeRaces.length > 0 && (
        <section className="mb-10">
          <h2 className="eyebrow mb-3">Active races</h2>
          <div className="space-y-2">
            {activeRaces.map((race) => (
              <ActiveRaceRow key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* Completed races */}
      {completedWithResults.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Completed races</h2>
          <div className="space-y-4">
            {completedWithResults.map(({ race, results, total }) => (
              <div key={race.id} className="card card-hover p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{race.title}</h3>
                    <p className="text-sm text-white/35 mt-0.5">
                      {race.completedAt ? formatDate(race.completedAt) : 'Unknown date'}
                      {' · '}
                      {total} entrant{total !== 1 ? 's' : ''}
                      {' · '}
                      {race.trackDifficulty} track
                    </p>
                  </div>
                  <Link
                    href={`/race/${race.id}`}
                    className="flex items-center gap-1 text-xs text-neon-violet hover:text-white transition-colors"
                  >
                    View <Icon name="arrowRight" size={12} />
                  </Link>
                </div>

                <div className="flex flex-wrap gap-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`card flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm podium-${result.position}`}
                    >
                      <span className={`rank-chip rank-${result.position}`}>{result.position}</span>
                      <span className="font-semibold">{result.displayName}</span>
                      <span className="num text-white/40 text-xs">{formatTime(result.finishTimeMs)}</span>
                    </div>
                  ))}
                  {total > 3 && (
                    <div className="flex items-center px-2 py-2 text-sm text-white/30">
                      +{total - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeRaces.length === 0 && completedWithResults.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-white/40">No races yet. Ask the admin to create one!</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-neon-violet hover:text-white text-sm transition-colors">
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
