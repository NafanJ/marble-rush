'use client';

import { forwardRef, useImperativeHandle, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import type { Entrant, FinishResult, MarblePosition, Race } from '@/lib/types';
import MarbleRaceScene3D from './MarbleRaceScene3D';

export interface MarbleRaceGameHandle {
  startRace: () => void;
}

interface Props {
  race: Race;
  entrants: Entrant[];
  isAdmin: boolean;
  onRaceComplete: (results: FinishResult[]) => void;
  onPositionUpdate?: (positions: MarblePosition[]) => void;
}

const MarbleRaceGame = forwardRef<MarbleRaceGameHandle, Props>(function MarbleRaceGame(
  { race, entrants, onRaceComplete, onPositionUpdate },
  ref
) {
  const [gateOpen, setGateOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    startRace() {
      setGateOpen(true);
    },
  }));

  return (
    <div
      className="w-full max-w-[800px] mx-auto overflow-hidden rounded-xl border border-white/10"
      style={{ aspectRatio: '800/600', background: '#06060f' }}
    >
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [10, 2, 14], fov: 55 }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -22 * race.speedMultiplier, 0]} timeStep="vary" paused={!gateOpen}>
            <MarbleRaceScene3D
              entrants={entrants}
              gateOpen={gateOpen}
              trackSeed={race.trackSeed}
              trackDifficulty={race.trackDifficulty}
              raceTimeoutSeconds={race.raceTimeoutSeconds}
              onRaceComplete={onRaceComplete}
              onPositionUpdate={onPositionUpdate}
            />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
});

export default MarbleRaceGame;
