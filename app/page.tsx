import Link from 'next/link';
import { getActiveRace, getCompletedRaces } from '@/lib/db/races';
import { Race } from '@/lib/types';
import Marble from '@/components/ui/Marble';
import Icon from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  entries_open: { label: 'Entries open — join now', cls: 'pill-open' },
  countdown: { label: 'Starting soon', cls: 'pill-soon' },
  running: { label: 'Race in progress', cls: 'pill-live' },
};

const HERO_MARBLES = ['#8b7cff', '#3ee6ff', '#ffd24a', '#ff5ab8', '#3dffa2'];

function ActiveRaceCard({ race }: { race: Race }) {
  const pill = STATUS_PILL[race.status] ?? { label: race.status, cls: 'pill-muted' };
  return (
    <div className="card max-w-md mx-auto p-8 mb-12 glow-violet text-center animate-pulse-glow">
      <span className={`pill ${pill.cls} mb-4`}>
        <span className="pill-dot" />
        {pill.label}
      </span>
      <h2 className="display text-2xl font-bold mb-6">{race.title}</h2>
      <Link href={`/race/${race.id}`} className="btn btn-gold text-base px-8 py-3.5">
        {race.status === 'entries_open' ? (
          <>
            <Icon name="play" size={16} /> Join the race
          </>
        ) : (
          <>
            <Icon name="eye" size={16} /> Watch live
          </>
        )}
      </Link>
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    icon: 'users' as const,
    color: 'text-neon-violet',
    title: 'Join the race',
    body: 'Enter your name when the lobby opens. Upload a photo to ride your own custom marble.',
  },
  {
    icon: 'bolt' as const,
    color: 'text-neon-cyan',
    title: 'Watch it drop',
    body: 'A 5,000-pixel run of pachinko pegs, spinners and slingshots. Every race is different.',
  },
  {
    icon: 'trophy' as const,
    color: 'text-neon-gold',
    title: 'Earn points',
    body: 'Top finishers score points toward the all-time leaderboard. Winner takes ten.',
  },
];

export default async function HomePage() {
  const [activeRace, recentRaces] = await Promise.all([
    getActiveRace(),
    getCompletedRaces(5),
  ]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start px-4 pt-20 pb-12 text-center">
      <div className="animate-fade-in w-full max-w-3xl">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-end justify-center gap-3 mb-8" aria-hidden>
            {HERO_MARBLES.map((c, i) => (
              <Marble
                key={c}
                color={c}
                size={i === 2 ? 64 : i === 1 || i === 3 ? 44 : 30}
                className="animate-float"
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            ))}
          </div>
          <h1 className="display text-5xl md:text-7xl font-black mb-5 leading-tight">
            Marble <span className="logo-gradient">Rush</span>
          </h1>
          <p className="text-white/55 text-lg md:text-xl max-w-md mx-auto">
            Real-time marble racing for your group chat. Pure physics, zero skill.
          </p>
        </div>

        {/* Active race or idle state */}
        {activeRace ? (
          <ActiveRaceCard race={activeRace} />
        ) : (
          <div className="card max-w-md mx-auto p-8 mb-12 text-center">
            <span className="pill pill-muted mb-4">
              <Icon name="clock" size={13} />
              No race running
            </span>
            <p className="text-white/50 text-sm">
              The track is quiet. Ask the admin to open a lobby, or browse past races below.
            </p>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-3 justify-center mb-16">
          <Link href="/leaderboard" className="btn btn-primary">
            <Icon name="trophy" size={16} /> Leaderboard
          </Link>
          <Link href="/history" className="btn btn-ghost">
            <Icon name="list" size={16} /> All races
          </Link>
        </div>

        {/* Recent completed races */}
        {recentRaces.length > 0 && (
          <div className="text-left mb-16">
            <h3 className="eyebrow mb-4">Recent races</h3>
            <div className="space-y-2">
              {recentRaces.map((race, i) => (
                <Link
                  key={race.id}
                  href={`/race/${race.id}`}
                  className="card card-hover flex items-center justify-between px-5 py-4 group"
                >
                  <div className="flex items-center gap-3.5">
                    <Marble size={18} color={HERO_MARBLES[i % HERO_MARBLES.length]} />
                    <div>
                      <p className="font-semibold group-hover:text-neon-violet transition-colors">
                        {race.title}
                      </p>
                      <p className="text-xs text-white/35 mt-0.5">
                        {race.completedAt
                          ? new Date(race.completedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Completed'}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-white/30 group-hover:text-white/70 text-sm transition-colors">
                    Results <Icon name="arrowRight" size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.title} className="card p-6">
              <div className={`${step.color} mb-3`}>
                <Icon name={step.icon} size={22} />
              </div>
              <h3 className="font-bold mb-1.5">{step.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
