'use client';

import { useEffect, useRef } from 'react';
import type { Entrant, FinishResult, MarblePosition, Race } from '@/lib/types';
import type { MarbleRaceScene } from './MarbleRaceScene';

interface Props {
  race: Race;
  entrants: Entrant[];
  isAdmin: boolean;
  /** Marbles are held behind the chute gate until this flips true */
  started: boolean;
  /** Entrant to follow with the camera (null = follow the leader) */
  trackedEntrantId?: string | null;
  onRaceComplete: (results: FinishResult[]) => void;
  onPositionUpdate?: (positions: MarblePosition[]) => void;
}

// Controlled by plain props rather than an imperative ref handle: this
// component is loaded via next/dynamic, which does not forward refs.
// Phaser and the scene are imported at runtime so they never touch SSR.
export default function MarbleRaceGame({
  race, entrants, started, trackedEntrantId, onRaceComplete, onPositionUpdate,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<MarbleRaceScene | null>(null);
  const startedRef = useRef(started);
  const trackedRef = useRef<string | null>(trackedEntrantId ?? null);

  const onCompleteRef = useRef(onRaceComplete);
  const onPosRef = useRef(onPositionUpdate);
  useEffect(() => { onCompleteRef.current = onRaceComplete; }, [onRaceComplete]);
  useEffect(() => { onPosRef.current = onPositionUpdate; }, [onPositionUpdate]);

  // Create the Phaser game once on mount. The entrant list is snapshotted
  // here — realtime roster changes mid-race don't reach the simulation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const PhaserMod = await import('phaser');
      const Phaser = PhaserMod.default ?? PhaserMod;
      const { MarbleRaceScene } = await import('./MarbleRaceScene');
      if (cancelled || !containerRef.current || gameRef.current) return;

      const scene = new MarbleRaceScene();
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#06060f',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: 'matter',
          matter: {
            positionIterations: 12,
            velocityIterations: 8,
          },
        },
      });
      gameRef.current = game;
      sceneRef.current = scene;

      game.scene.add('MarbleRaceScene', scene, true, {
        entrants,
        isAdmin: false,
        trackDifficulty: race.trackDifficulty,
        trackSeed: race.trackSeed,
        speedMultiplier: race.speedMultiplier,
        raceTimeoutSeconds: race.raceTimeoutSeconds,
        onRaceComplete: (r: FinishResult[]) => onCompleteRef.current(r),
        onPositionUpdate: (p: MarblePosition[]) => onPosRef.current?.(p),
      });

      // If the race was already running when we mounted (refresh mid-race,
      // admin page entering at status=running), release immediately.
      if (startedRef.current) scene.openGate();
      if (trackedRef.current) scene.setTracked(trackedRef.current);
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startedRef.current = started;
    if (started) sceneRef.current?.openGate();
  }, [started]);

  useEffect(() => {
    trackedRef.current = trackedEntrantId ?? null;
    sceneRef.current?.setTracked(trackedEntrantId ?? null);
  }, [trackedEntrantId]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[800px] mx-auto overflow-hidden rounded-xl border border-white/10"
      style={{ aspectRatio: '800/600', background: '#06060f' }}
    />
  );
}
