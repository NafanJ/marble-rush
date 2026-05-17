'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { Entrant, FinishResult, MarblePosition, Race, SceneData } from '@/lib/types';

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
  { race, entrants, isAdmin, onRaceComplete, onPositionUpdate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<import('./MarbleRaceScene').MarbleRaceScene | null>(null);

  useImperativeHandle(ref, () => ({
    startRace() {
      if (sceneRef.current) {
        sceneRef.current.openGate();
      }
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    async function initPhaser() {
      const Phaser = (await import('phaser')).default;
      const { MarbleRaceScene } = await import('./MarbleRaceScene');

      if (destroyed || !containerRef.current) return;

      const sceneData: SceneData & { raceTimeoutSeconds: number } = {
        entrants,
        isAdmin,
        trackDifficulty: race.trackDifficulty,
        trackSeed: race.trackSeed,
        speedMultiplier: race.speedMultiplier,
        onRaceComplete,
        onPositionUpdate,
        raceTimeoutSeconds: race.raceTimeoutSeconds,
      };

      const scene = new MarbleRaceScene();
      sceneRef.current = scene;

      const config: import('phaser').Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current,
        backgroundColor: '#06060f',
        physics: {
          default: 'matter',
          matter: {
            gravity: { x: 0, y: 2.5 },
            debug: false,
          },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 600,
        },
      };

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current,
        backgroundColor: '#06060f',
        physics: {
          default: 'matter',
          matter: {
            gravity: { x: 0, y: 2.5 },
            debug: false,
          },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 600,
        },
        scene: [MarbleRaceScene],
      });

      game.scene.start('MarbleRaceScene', sceneData);
      sceneRef.current = game.scene.getScene('MarbleRaceScene') as import('./MarbleRaceScene').MarbleRaceScene;

      gameRef.current = game;
      void config; // suppress unused warning
    }

    initPhaser();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        id="phaser-container"
        className="w-full max-w-[800px] overflow-hidden rounded-xl border border-white/10"
        style={{ aspectRatio: '800/600' }}
      />
    </div>
  );
});

export default MarbleRaceGame;
