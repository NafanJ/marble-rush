import type { Metadata } from 'next';
import { Unbounded, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import Marble from '@/components/ui/Marble';
import './globals.css';

const display = Unbounded({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-display',
});
const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-mono',
});

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><radialGradient id='g' cx='35%' cy='30%' r='75%'><stop offset='0%' stop-color='#cfc6ff'/><stop offset='45%' stop-color='#8b7cff'/><stop offset='100%' stop-color='#2d2470'/></radialGradient></defs><circle cx='50' cy='50' r='46' fill='url(#g)'/><ellipse cx='36' cy='32' rx='14' ry='9' fill='white' opacity='0.65'/></svg>`
  );

export const metadata: Metadata = {
  title: 'Marble Rush',
  description: 'Real-time marble racing for friends — pure physics, zero skill',
  icons: { icon: FAVICON },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen text-white antialiased">
        <div className="backdrop" />
        <nav className="border-b border-white/[0.07] bg-ink-950/70 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <Marble size={22} className="group-hover:animate-float" />
              <span className="display font-bold text-[1.05rem] tracking-tight whitespace-nowrap">
                Marble <span className="logo-gradient">Rush</span>
              </span>
            </a>
            <div className="flex items-center gap-1 text-sm whitespace-nowrap">
              <a
                href="/leaderboard"
                className="px-3.5 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Leaderboard
              </a>
              <a
                href="/history"
                className="px-3.5 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Races
              </a>
              <a
                href="/admin"
                className="px-3.5 py-2 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors text-xs"
              >
                Admin
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-white/[0.07] mt-20 py-10">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/30">
            <span className="flex items-center gap-2">
              <Marble size={12} color="#3ee6ff" />
              Marble Rush
            </span>
            <span>Pure luck. Zero skill. Eternal glory.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
