'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import type { Entrant, FinishResult, MarblePosition, Race } from '@/lib/types';
import MarbleRaceScene3D from './MarbleRaceScene3D';

interface Props {
  race: Race;
  entrants: Entrant[];
  isAdmin: boolean;
  /** Marbles are held frozen at the spawn until this flips true */
  started: boolean;
  /** Entrant to follow with the camera (null = follow the leader) */
  trackedEntrantId?: string | null;
  onRaceComplete: (results: FinishResult[]) => void;
  onPositionUpdate?: (positions: MarblePosition[]) => void;
}

// Controlled by plain props rather than an imperative ref handle: this
// component is loaded via next/dynamic, which does not forward refs.
export default function MarbleRaceGame({
  race, entrants, started, trackedEntrantId, onRaceComplete, onPositionUpdate,
}: Props) {
  return (
    <div
      className="w-full max-w-[800px] mx-auto overflow-hidden rounded-xl border border-white/10"
      style={{ aspectRatio: '800/600', background: '#06060f' }}
    >
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [22, 8, 26], fov: 52 }}
      >
        <Suspense fallback={null}>
          {/* Fixed timestep: "vary" lets slow frames take huge physics steps,
              which tunnels fast marbles through the 0.4-thick ramps */}
          <Physics gravity={[0, -22 * race.speedMultiplier, 0]}>
            <MarbleRaceScene3D
              entrants={entrants}
              gateOpen={started}
              trackSeed={race.trackSeed}
              trackDifficulty={race.trackDifficulty}
              raceTimeoutSeconds={race.raceTimeoutSeconds}
              trackedEntrantId={trackedEntrantId}
              onRaceComplete={onRaceComplete}
              onPositionUpdate={onPositionUpdate}
            />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
