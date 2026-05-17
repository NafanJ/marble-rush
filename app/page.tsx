import { redirect } from 'next/navigation';
import { getActiveRace } from '@/lib/db/races';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const activeRace = await getActiveRace();

  if (activeRace) {
    redirect(`/race/${activeRace.id}`);
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="animate-fade-in">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-8xl mb-4">🔮</div>
          <h1 className="text-5xl md:text-7xl font-extrabold logo-gradient mb-3">
            Marble Rush
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-md mx-auto">
            Real-time marble racing. Pure physics. Zero skill required.
          </p>
        </div>

        {/* Status card */}
        <div className="card max-w-sm mx-auto p-8 mb-10 glow-purple">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-white mb-2">No Race Running</h2>
          <p className="text-white/50 text-sm">
            Ask the admin to start a race. Check back soon!
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition-colors px-6 py-3 rounded-xl font-semibold"
          >
            🏆 Leaderboard
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors px-6 py-3 rounded-xl font-semibold"
          >
            📜 Race History
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-6 py-3 rounded-xl text-white/50 hover:text-white text-sm"
          >
            ⚙️ Admin Panel
          </Link>
        </div>

        {/* How it works */}
        <div className="mt-16 max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="card p-5">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-bold mb-1">Join the Race</h3>
            <p className="text-white/50 text-sm">
              Enter your name when the lobby opens. Upload a custom marble texture if you want.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-bold mb-1">Watch Live</h3>
            <p className="text-white/50 text-sm">
              Physics simulation runs in your browser. Every race is different — chaos guaranteed.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-2xl mb-2">🏅</div>
            <h3 className="font-bold mb-1">Earn Points</h3>
            <p className="text-white/50 text-sm">
              Top 10 finishers earn points. 1st place gets 10 points. Climb the leaderboard!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
