'use client';

import { useRef, useEffect, useCallback, useMemo, createRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  BallCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import { OrbitControls, Html } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { Entrant, FinishResult, MarblePosition } from '@/lib/types';

// World constants
const MR = 0.35;       // marble radius
const HW = 4.0;        // track half-width
const HD = 0.65;       // track half-depth (Z)
const SPAWN_Y = 1.2;
const FINISH_Y = -80;
const FLOOR_Y = FINISH_Y - 2.5;
const TRACK_H = Math.abs(FLOOR_Y - SPAWN_Y) + 2;
const TRACK_MID_Y = (SPAWN_Y + FLOOR_Y) / 2;

const BUMPER_COLORS = ['#ffd700', '#ff6b6b', '#00ffff', '#ff9900', '#00ff88'];

function makePrng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

interface PegObs   { x: number; y: number; r: number }
interface BumpObs  { x: number; y: number; r: number; color: string }
interface RampObs  { x: number; y: number; len: number; angle: number }
interface Obstacles { pegs: PegObs[]; bumpers: BumpObs[]; ramps: RampObs[] }

function generateObstacles(seed: string, difficulty: string): Obstacles {
  const rng = makePrng(seed || 'default');
  const pegs: PegObs[] = [];
  const bumpers: BumpObs[] = [];
  const ramps: RampObs[] = [];

  // Plinko-style grid — wide spacing so marbles always have room to pass
  const pegRows = difficulty === 'easy' ? 3 : difficulty === 'chaos' ? 6 : 5;
  const pegCols = difficulty === 'easy' ? 3 : difficulty === 'chaos' ? 4 : 4;
  const PEG_R = 0.22;
  const xSpan = HW - 0.9; // keep pegs away from walls
  const colStep = (xSpan * 2) / Math.max(pegCols - 1, 1);

  for (let row = 0; row < pegRows; row++) {
    const y = -4 - row * (17 / Math.max(pegRows - 1, 1));
    const isOdd = row % 2 === 1;
    // Staggered rows have one fewer peg, offset by half a column step
    const colsThisRow = isOdd ? pegCols - 1 : pegCols;
    const rowXStart = isOdd ? -xSpan + colStep * 0.5 : -xSpan;
    for (let col = 0; col < colsThisRow; col++) {
      pegs.push({
        x: rowXStart + col * colStep + (rng() - 0.5) * 0.15,
        y: y + (rng() - 0.5) * 0.4,
        r: PEG_R,
      });
    }
  }

  // Ramps — zigzag so marbles always roll INWARD (toward center), then down
  // Positive Z rotation = right end rises. Left ramp needs right end LOW → negative angle.
  // Right ramp needs left end LOW → positive angle.
  const rampCount = difficulty === 'chaos' ? 5 : difficulty === 'easy' ? 2 : 3;
  for (let i = 0; i < rampCount; i++) {
    const isLeft = i % 2 === 0;
    const y = -28 - i * (20 / Math.max(rampCount - 1, 1));
    const rampAngle = (difficulty === 'chaos' ? 0.35 : 0.3) * (isLeft ? -1 : 1);
    ramps.push({ x: isLeft ? -0.5 : 0.5, y, len: 5.5, angle: rampAngle });
  }

  // Bumpers — enforce minimum separation so marbles can always pass between them
  const bumperCount = difficulty === 'easy' ? 4 : difficulty === 'chaos' ? 9 : 6;
  const placed: { x: number; y: number }[] = [];
  let attempts = 0;
  while (placed.length < bumperCount && attempts < 300) {
    attempts++;
    const bx = -HW + 1.0 + rng() * (HW * 2 - 2.0);
    const by = -53 - rng() * 16;
    if (placed.some(p => Math.hypot(p.x - bx, p.y - by) < 2.5)) continue;
    placed.push({ x: bx, y: by });
    bumpers.push({
      x: bx, y: by,
      r: 0.35 + rng() * 0.1,
      color: BUMPER_COLORS[Math.floor(rng() * BUMPER_COLORS.length)],
    });
  }

  return { pegs, bumpers, ramps };
}

// Label rendered as DOM overlay — no font CDN needed
function MarbleLabel({
  bodyRef,
  name,
  color,
}: {
  bodyRef: React.RefObject<RapierRigidBody>;
  name: string;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (bodyRef?.current && groupRef.current) {
      const p = bodyRef.current.translation();
      groupRef.current.position.set(p.x, p.y + MR + 0.45, p.z);
    }
  });
  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[10, 0]}>
        <div style={{
          color,
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: '0 0 4px #000, 0 1px 3px #000',
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
        }}>
          {name}
        </div>
      </Html>
    </group>
  );
}

interface Props {
  entrants: Entrant[];
  gateOpen: boolean;
  trackSeed: string;
  trackDifficulty: string;
  raceTimeoutSeconds: number;
  onRaceComplete: (results: FinishResult[]) => void;
  onPositionUpdate?: (positions: MarblePosition[]) => void;
}

export default function MarbleRaceScene3D({
  entrants,
  gateOpen,
  trackSeed,
  trackDifficulty,
  raceTimeoutSeconds,
  onRaceComplete,
  onPositionUpdate,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const marbleRefs = useMemo<React.RefObject<RapierRigidBody>[]>(
    () => entrants.map(() => createRef<RapierRigidBody>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const finished     = useRef<boolean[]>(entrants.map(() => false));
  const finishTimes  = useRef<(number | null)[]>(entrants.map(() => null));
  const finishedCnt  = useRef(0);
  const raceStart    = useRef(0);
  const active       = useRef(false);
  const doneCalled   = useRef(false);
  const posTimer     = useRef(0);
  const elapsedMs    = useRef(0);

  const onCompleteRef = useRef(onRaceComplete);
  const onPosRef      = useRef(onPositionUpdate);
  useEffect(() => { onCompleteRef.current = onRaceComplete; }, [onRaceComplete]);
  useEffect(() => { onPosRef.current = onPositionUpdate; }, [onPositionUpdate]);

  useEffect(() => {
    if (gateOpen) {
      // Nudge every marble so none can sit perfectly balanced on a peg
      marbleRefs.forEach(r => {
        r.current?.applyImpulse(
          { x: (Math.random() - 0.5) * 0.4, y: -0.05, z: (Math.random() - 0.5) * 0.1 },
          true
        );
      });
      raceStart.current = Date.now();
      active.current = true;
    }
  }, [gateOpen, marbleRefs]);

  const endRace = useCallback(() => {
    if (doneCalled.current) return;
    doneCalled.current = true;
    active.current = false;

    const items = entrants.map((e, i) => ({
      e,
      fin: finished.current[i],
      ms:  finishTimes.current[i],
      y:   marbleRefs[i]?.current?.translation().y ?? FINISH_Y,
    }));

    const fin   = items.filter(m => m.fin).sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0));
    const unfin = items.filter(m => !m.fin).sort((a, b) => a.y - b.y);

    const results: FinishResult[] = [...fin, ...unfin].map((m, idx) => ({
      entrantId:    m.e.id,
      displayName:  m.e.displayName,
      position:     idx + 1,
      finishTimeMs: m.ms ?? 0,
      didFinish:    m.fin,
    }));

    onCompleteRef.current(results);
  }, [entrants, marbleRefs]);

  const spawnX = useMemo(() => {
    const n = entrants.length;
    if (n === 0) return [];
    const lo = -(HW - MR - 0.2), hi = HW - MR - 0.2;
    const xs = entrants.map((_, i) => (n === 1 ? 0 : lo + i * (hi - lo) / (n - 1)));
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable Z offsets per marble so they don't re-randomise on re-render
  const spawnZ = useMemo(
    () => entrants.map(() => (Math.random() - 0.5) * 0.1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const obstacles = useMemo(
    () => generateObstacles(trackSeed, trackDifficulty),
    [trackSeed, trackDifficulty]
  );

  useFrame((_, delta) => {
    if (!active.current) return;

    elapsedMs.current += delta * 1000;
    posTimer.current  += delta * 1000;

    let minY = Infinity;

    for (let i = 0; i < entrants.length; i++) {
      if (finished.current[i]) continue;
      const rb = marbleRefs[i]?.current;
      if (!rb) continue;
      const p = rb.translation();
      if (p.y < minY) minY = p.y;

      if (p.y <= FINISH_Y) {
        finished.current[i]    = true;
        finishTimes.current[i] = Date.now() - raceStart.current;
        finishedCnt.current++;
        if (finishedCnt.current >= entrants.length) { endRace(); return; }
      }
    }

    // Smoothly pan OrbitControls target to follow the leader — user can still zoom/rotate
    if (minY < Infinity && controlsRef.current) {
      const targetY = Math.max(FINISH_Y, minY - 2);
      controlsRef.current.target.lerp(new THREE.Vector3(0, targetY, 0), 0.04);
      controlsRef.current.update();
    }

    // Position updates every 200ms
    if (posTimer.current >= 200 && onPosRef.current) {
      posTimer.current = 0;
      const positions: MarblePosition[] = entrants.map((e, i) => {
        const p = marbleRefs[i].current?.translation() ?? { x: 0, y: SPAWN_Y, z: 0 };
        return { entrantId: e.id, x: p.x, y: p.y, angle: 0 };
      });
      onPosRef.current(positions);
    }

    if (elapsedMs.current >= raceTimeoutSeconds * 1000) endRace();
  });

  return (
    <>
      {/* OrbitControls — user can zoom and rotate; target follows leader marble */}
      <OrbitControls
        ref={controlsRef}
        enablePan
        minDistance={4}
        maxDistance={80}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow
        shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, -40, 4]} intensity={1.2} color="#8844ff" />
      <pointLight position={[0, FINISH_Y + 8, 4]} intensity={2.0} color="#ffd700" />

      {/* Left wall */}
      <RigidBody type="fixed" restitution={0.2} friction={0.5}>
        <mesh position={[-(HW + 0.25), TRACK_MID_Y, 0]} receiveShadow>
          <boxGeometry args={[0.5, TRACK_H, HD * 2]} />
          <meshStandardMaterial color="#1a1a4e" />
        </mesh>
      </RigidBody>

      {/* Right wall */}
      <RigidBody type="fixed" restitution={0.2} friction={0.5}>
        <mesh position={[HW + 0.25, TRACK_MID_Y, 0]} receiveShadow>
          <boxGeometry args={[0.5, TRACK_H, HD * 2]} />
          <meshStandardMaterial color="#1a1a4e" />
        </mesh>
      </RigidBody>

      {/* Back wall */}
      <RigidBody type="fixed" restitution={0.1} friction={0.8}>
        <mesh position={[0, TRACK_MID_Y, -(HD + 0.05)]} receiveShadow>
          <boxGeometry args={[(HW + 0.5) * 2, TRACK_H, 0.1]} />
          <meshStandardMaterial color="#0d0f22" />
        </mesh>
      </RigidBody>

      {/* Front wall (glass) */}
      <RigidBody type="fixed" restitution={0.1} friction={0.8}>
        <mesh position={[0, TRACK_MID_Y, HD + 0.05]}>
          <boxGeometry args={[(HW + 0.5) * 2, TRACK_H, 0.1]} />
          <meshStandardMaterial color="#aaaaff" transparent opacity={0.06} />
        </mesh>
      </RigidBody>

      {/* Floor */}
      <RigidBody type="fixed" restitution={0.3} friction={0.8}>
        <mesh position={[0, FLOOR_Y - 0.25, 0]}>
          <boxGeometry args={[(HW + 0.5) * 2, 0.5, HD * 2]} />
          <meshStandardMaterial color="#1a1a4e" />
        </mesh>
      </RigidBody>

      {/* Pegs */}
      {obstacles.pegs.map((peg, i) => (
        <RigidBody key={`peg-${i}`} type="fixed" restitution={0.65} friction={0.1}>
          <mesh position={[peg.x, peg.y, 0]} castShadow>
            <sphereGeometry args={[peg.r, 10, 10]} />
            <meshStandardMaterial color="#3a3a7e" metalness={0.4} roughness={0.5} />
          </mesh>
        </RigidBody>
      ))}

      {/* Ramps — position on RigidBody so rotation pivots around ramp centre */}
      {obstacles.ramps.map((r, i) => (
        <RigidBody key={`ramp-${i}`} type="fixed" position={[r.x, r.y, 0]}
          rotation={[0, 0, r.angle]} restitution={0.3} friction={0.2}>
          <mesh castShadow>
            <boxGeometry args={[r.len, 0.2, HD * 2]} />
            <meshStandardMaterial color="#2a3a5e" metalness={0.2} roughness={0.7} />
          </mesh>
        </RigidBody>
      ))}

      {/* Bumpers */}
      {obstacles.bumpers.map((b, i) => (
        <RigidBody key={`bumper-${i}`} type="fixed" restitution={0.9} friction={0.05}>
          <mesh position={[b.x, b.y, 0]} castShadow>
            <sphereGeometry args={[b.r, 14, 14]} />
            <meshStandardMaterial
              color={b.color} emissive={b.color} emissiveIntensity={0.4}
              metalness={0.3} roughness={0.4}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* Finish line */}
      <mesh position={[0, FINISH_Y, 0]}>
        <boxGeometry args={[HW * 2 + 0.5, 0.08, HD * 2]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.8} />
      </mesh>
      <group position={[0, FINISH_Y + 0.9, HD + 0.01]}>
        <Html center zIndexRange={[10, 0]}>
          <div style={{
            color: '#ffd700',
            fontSize: '18px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            textShadow: '0 0 8px #000, 0 2px 4px #000',
            pointerEvents: 'none',
          }}>
            🏁 FINISH
          </div>
        </Html>
      </group>

      {/* Marbles */}
      {entrants.map((entrant, i) => (
        <group key={entrant.id}>
          <RigidBody
            ref={marbleRefs[i]}
            type="dynamic"
            position={[spawnX[i] ?? 0, SPAWN_Y, spawnZ[i] ?? 0]}
            colliders={false}
            restitution={0.4}
            friction={0.3}
            linearDamping={0.02}
            angularDamping={0.1}
          >
            <BallCollider args={[MR]} />
            <mesh castShadow>
              <sphereGeometry args={[MR, 20, 20]} />
              <meshStandardMaterial
                color={entrant.colour}
                metalness={0.55}
                roughness={0.2}
              />
            </mesh>
          </RigidBody>
          <MarbleLabel
            bodyRef={marbleRefs[i]}
            name={entrant.displayName}
            color={entrant.colour}
          />
        </group>
      ))}

      {/* Background */}
      <mesh position={[0, TRACK_MID_Y, -(HD + 0.12)]} receiveShadow>
        <planeGeometry args={[(HW + 0.5) * 2, TRACK_H + 6]} />
        <meshStandardMaterial color="#060618" />
      </mesh>
    </>
  );
}
