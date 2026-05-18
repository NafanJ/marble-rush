import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marble Rush',
  description: 'Real-time marble racing game for friends',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#06060f] text-white antialiased">
        <nav className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">🔮</span>
              <span className="logo-gradient">Marble Rush</span>
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a
                href="/leaderboard"
                className="text-white/60 hover:text-white transition-colors"
              >
                Leaderboard
              </a>
              <a
                href="/history"
                className="text-white/60 hover:text-white transition-colors"
              >
                Races
              </a>
              <a
                href="/admin"
                className="text-white/40 hover:text-white/70 transition-colors text-xs"
              >
                Admin
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-white/10 mt-20 py-8 text-center text-white/30 text-sm">
          <p>Marble Rush — Pure luck, zero skill</p>
        </footer>
      </body>
    </html>
  );
}
