'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  onComplete: () => void;
}

export default function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <p className="text-white/50 text-lg mb-6 tracking-widest uppercase font-medium">
          Race Starting
        </p>
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 animate-ping" />
          <div className="absolute inset-4 rounded-full border-2 border-purple-500/50" />

          {/* Countdown number */}
          {count > 0 ? (
            <span
              key={count}
              className="count-pop text-9xl font-extrabold logo-gradient"
            >
              {count}
            </span>
          ) : (
            <span
              key="go"
              className="count-pop text-6xl font-extrabold text-green-400"
            >
              GO!
            </span>
          )}
        </div>

        <p className="mt-6 text-white/30 text-sm">
          {count > 0 ? 'Get ready...' : 'They\'re off!'}
        </p>
      </div>
    </div>
  );
}
