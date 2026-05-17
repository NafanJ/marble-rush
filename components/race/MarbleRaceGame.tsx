'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
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
  // Track pending gate-open request if called before scene is ready
  const pendingOpenGate = useRef(false);

  // Keep callbacks in refs so the scene can always call the latest version
  const onRaceCompleteRef = useRef(onRaceComplete);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  useEffect(() => { onRaceCompleteRef.current = onRaceComplete; }, [onRaceComplete]);
  useEffect(() => { onPositionUpdateRef.current = onPositionUpdate; }, [onPositionUpdate]);

  useImperativeHandle(ref, () => ({
    startRace() {
      if (sceneRef.current) {
        sceneRef.current.openGate();
      } else {
        // Scene not ready yet — mark pending so we open as soon as it is
        pendingOpenGate.current = true;
      }
    },
  }));

  const stableOnRaceComplete = useCallback((results: FinishResult[]) => {
    onRaceCompleteRef.current(results);
  }, []);

  const stableOnPositionUpdate = useCallback((positions: MarblePosition[]) => {
    onPositionUpdateRef.current?.(positions);
  }, []);

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
        onRaceComplete: stableOnRaceComplete,
        onPositionUpdate: stableOnPositionUpdate,
        raceTimeoutSeconds: race.raceTimeoutSeconds,
      };

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current,
        backgroundColor: '#06060f',
        physics: {
          default: 'matter',
          matter: { gravity: { x: 0, y: 2.5 }, debug: false },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 600,
        },
        // No scene array — we add it manually after the game is ready
        // so init() receives the correct sceneData on the first and only start.
      });

      gameRef.current = game;

      game.events.once('ready', () => {
        if (destroyed) return;

        // Add and immediately start the scene with data
        game.scene.add('MarbleRaceScene', MarbleRaceScene, true, sceneData);

        // Wait for scene.create() to complete before exposing the ref
        const scene = game.scene.getScene('MarbleRaceScene') as import('./MarbleRaceScene').MarbleRaceScene;
        scene.events.once('create', () => {
          if (destroyed) return;
          sceneRef.current = scene;

          // If openGate() was requested before the scene was ready, fire it now
          if (pendingOpenGate.current) {
            pendingOpenGate.current = false;
            scene.openGate();
          }
        });
      });
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
        className="w-full max-w-[800px] overflow-hidden rounded-xl border border-white/10"
        style={{ aspectRatio: '800/600' }}
      />
    </div>
  );
});

export default MarbleRaceGame;
