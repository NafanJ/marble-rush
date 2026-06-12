'use client';

import { useRef, useEffect, useCallback, useMemo, createRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider, type RapierRigidBody } from '@react-three/rapier';
import { OrbitControls, Html } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { Entrant, FinishResult, MarblePosition } from '@/lib/types';

const MR       = 0.35;
const SPAWN_Y  = 8.0;
const FINISH_Y = -44.0;
const FLOOR_Y  = -48.0;
const AX       = 6.0;
const AZ       = 6.0;
const GAP_W    = 2.2;
const RAMP_W   = AX * 2 - GAP_W;
const RAMP_D   = AZ * 2;
const RAMP_T   = 0.4;
const WALL_T   = 0.3;
const TRACK_H  = Math.abs(FLOOR_Y - SPAWN_Y) + 6;
const TRACK_MID_Y = (SPAWN_Y + FLOOR_Y) / 2;

const RAMPS = [
  { cy: -4,  cx:  GAP_W / 2, tiltZ:  0.22 },
  { cy: -17, cx: -GAP_W / 2, tiltZ: -0.22 },
  { cy: -30, cx:  GAP_W / 2, tiltZ:  0.22 },
] as const;

// Speed-boost zone — extra downward acceleration (u/s²) while inside the zone
const GEYSER = { x: 0, y: -40, z: 0, r: 2.4, strength: -35 } as const;

const BUMPER_COLORS = ['#ffd700', '#ff6b6b', '#00ffff', '#ff9900', '#00ff88'];

function makePrng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

interface PegObs  { rampIdx: number; lx: number; lz: number }
interface BumpObs { x: number; y: number; z: number; r: number; color: string }

function generateObs(seed: string, difficulty: string) {
  const rng = makePrng(seed || 'default');
  const pegsPerRamp = difficulty === 'easy' ? 3 : difficulty === 'chaos' ? 8 : 5;
  const pegs: PegObs[] = [];
  RAMPS.forEach((_, ri) => {
    for (let j = 0; j < pegsPerRamp; j++) {
      pegs.push({ rampIdx: ri, lx: (rng() - 0.5) * (RAMP_W - 2.5), lz: (rng() - 0.5) * (RAMP_D - 2.0) });
    }
  });
  const bCount = difficulty === 'easy' ? 3 : difficulty === 'chaos' ? 10 : 6;
  const bumpers: BumpObs[] = [];
  const placed: { x: number; y: number; z: number }[] = [];
  let att = 0;
  while (bumpers.length < bCount && att < 300) {
    att++;
    const bx = (rng() - 0.5) * (AX * 2 - 1.5);
    const by = -37 - rng() * 4;
    const bz = (rng() - 0.5) * (AZ * 2 - 1.5);
    if (placed.some(p => Math.hypot(p.x - bx, p.y - by, p.z - bz) < 2.2)) continue;
    placed.push({ x: bx, y: by, z: bz });
    bumpers.push({ x: bx, y: by, z: bz, r: 0.35 + rng() * 0.12, color: BUMPER_COLORS[Math.floor(rng() * BUMPER_COLORS.length)] });
  }
  return { pegs, bumpers };
}

// ── Rotating paddle ────────────────────────────────────────────────────────────
function RotatingPaddle({ position, length, speed, phase, continuous }: {
  position: [number, number, number]; length: number; speed: number; phase: number; continuous?: boolean;
}) {
  const ref = useRef<RapierRigidBody>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const angle = continuous ? t * speed + phase : Math.sin(t * speed + phase) * (Math.PI * 0.65);
    const h = angle / 2;
    ref.current.setNextKinematicRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) });
  });
  // Thin bar: a deep box would sweep corners through the arena walls and
  // squeeze marbles against them (kinematic-vs-fixed pinch ejects bodies).
  return (
    <RigidBody ref={ref} type="kinematicPosition" position={position} restitution={0.55} friction={0.1}>
      <mesh castShadow>
        <boxGeometry args={[length, 0.35, 0.9]} />
        <meshStandardMaterial color="#ff9900" emissive="#ff6600" emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
      </mesh>
    </RigidBody>
  );
}

// ── Moving platform ────────────────────────────────────────────────────────────
function MovingPlatform({ y, range, speed, phase }: {
  y: number; range: number; speed: number; phase: number;
}) {
  const ref = useRef<RapierRigidBody>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const x = Math.sin(clock.getElapsedTime() * speed + phase) * range;
    ref.current.setNextKinematicTranslation({ x, y, z: 0 });
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" restitution={0.35} friction={0.6}>
      <mesh castShadow>
        <boxGeometry args={[4.5, 0.35, RAMP_D]} />
        <meshStandardMaterial color="#ff44aa" emissive="#cc2288" emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
      </mesh>
    </RigidBody>
  );
}

// ── Spinner disk — 3 arc segments (270° coverage, 90° gap) ────────────────────
// R_mid=3.5, radial width=4 (inner R=1.5, outer R=5.5)
// Each segment covers 90°; gap is at 315°→45° (centred on +X axis)
function SpinnerDisk({ position, speed, phase }: {
  position: [number, number, number]; speed: number; phase: number;
}) {
  const ref = useRef<RapierRigidBody>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = clock.getElapsedTime() * speed + phase;
    const h = a / 2;
    ref.current.setNextKinematicRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) });
  });
  const R    = 3.5;
  const CHORD = R * Math.SQRT2;   // chord for 90° arc
  const RADW  = 4.0;
  const segs  = [Math.PI / 2, Math.PI, Math.PI * 3 / 2] as const;
  return (
    <>
      {/* Static visual rings */}
      <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 0.1, 6, 32]} />
        <meshStandardMaterial color="#cc44ff" emissive="#aa22ee" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.1, 6, 24]} />
        <meshStandardMaterial color="#cc44ff" emissive="#aa22ee" emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={position} color="#cc44ff" intensity={2.0} distance={10} />
      {/* Physics segments */}
      <RigidBody ref={ref} type="kinematicPosition" position={position} restitution={0.4} friction={0.15}>
        {segs.map((theta, i) => (
          <mesh key={i}
            position={[R * Math.cos(theta), 0, R * Math.sin(theta)]}
            rotation={[0, -(Math.PI / 2 + theta), 0]}
            castShadow
          >
            <boxGeometry args={[CHORD, 0.4, RADW]} />
            <meshStandardMaterial color="#cc44ff" emissive="#aa22ee" emissiveIntensity={0.6} metalness={0.6} roughness={0.25} />
          </mesh>
        ))}
      </RigidBody>
    </>
  );
}

// ── Geyser visual ──────────────────────────────────────────────────────────────
function GeyserVisual({ position }: { position: [number, number, number] }) {
  const coreRef  = useRef<THREE.Mesh>(null);
  const baseRef  = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = 0.5 + 0.5 * Math.abs(Math.sin(t * 5.0));
    if (coreRef.current)  (coreRef.current.material  as THREE.MeshStandardMaterial).emissiveIntensity = p * 2.5;
    if (baseRef.current)  (baseRef.current.material  as THREE.MeshStandardMaterial).emissiveIntensity = p * 1.2;
  });
  return (
    <group position={position}>
      <mesh ref={coreRef}>
        <cylinderGeometry args={[0.4, 0.9, 4.5, 8, 1, true]} />
        <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.5} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={baseRef} position={[0, -2, 0]}>
        <cylinderGeometry args={[2.4, 2.6, 0.4, 16]} />
        <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.0} transparent opacity={0.35} />
      </mesh>
      <pointLight color="#00ffcc" intensity={4.0} distance={12} />
    </group>
  );
}

// ── Marble label ───────────────────────────────────────────────────────────────
function MarbleLabel({ bodyRef, name, color }: {
  bodyRef: React.RefObject<RapierRigidBody>; name: string; color: string;
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
        <div style={{ color, fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 0 4px #000, 0 1px 3px #000', pointerEvents: 'none', userSelect: 'none' }}>
          {name}
        </div>
      </Html>
    </group>
  );
}

// ── Main scene ─────────────────────────────────────────────────────────────────
interface Props {
  entrants: Entrant[];
  gateOpen: boolean;
  trackSeed: string;
  trackDifficulty: string;
  raceTimeoutSeconds: number;
  trackedEntrantId?: string | null;
  onRaceComplete: (results: FinishResult[]) => void;
  onPositionUpdate?: (positions: MarblePosition[]) => void;
}

export default function MarbleRaceScene3D({
  entrants, gateOpen, trackSeed, trackDifficulty, raceTimeoutSeconds,
  trackedEntrantId, onRaceComplete, onPositionUpdate,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camTarget   = useRef(new THREE.Vector3(0, SPAWN_Y / 2, 0));

  // Snapshot the entrant list at mount. The prop can change mid-race via
  // realtime updates, but all physics arrays below are sized once — a live
  // list would desync indices and crash on marbleRefs[i].
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const racers = useMemo(() => entrants, []);

  const marbleRefs  = useMemo<React.RefObject<RapierRigidBody>[]>(
    () => racers.map(() => createRef<RapierRigidBody>()),
    [racers]
  );

  const finished         = useRef<boolean[]>(racers.map(() => false));
  const finishTimes      = useRef<(number | null)[]>(racers.map(() => null));
  const finishedCnt      = useRef(0);
  const raceStart        = useRef(0);
  const active           = useRef(false);
  const doneCalled       = useRef(false);
  const posTimer         = useRef(0);
  const jiggleTimer      = useRef(0);
  const elapsedMs        = useRef(0);
  const firstFinishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressY    = useRef(SPAWN_Y);
  const lastProgressTime = useRef(0);

  const onCompleteRef = useRef(onRaceComplete);
  const onPosRef      = useRef(onPositionUpdate);
  useEffect(() => { onCompleteRef.current = onRaceComplete; }, [onRaceComplete]);
  useEffect(() => { onPosRef.current = onPositionUpdate; }, [onPositionUpdate]);

  useEffect(() => {
    if (gateOpen) {
      marbleRefs.forEach(r => {
        r.current?.applyImpulse({ x: (Math.random() - 0.5) * 0.15, y: -0.05, z: (Math.random() - 0.5) * 0.15 }, true);
      });
      raceStart.current = Date.now();
      active.current    = true;
    }
  }, [gateOpen, marbleRefs]);

  const endRace = useCallback(() => {
    if (doneCalled.current) return;
    doneCalled.current = true;
    active.current     = false;
    if (firstFinishTimer.current) clearTimeout(firstFinishTimer.current);
    const items = racers.map((e, i) => ({
      e, fin: finished.current[i], ms: finishTimes.current[i],
      y: marbleRefs[i]?.current?.translation().y ?? FINISH_Y,
    }));
    const fin   = items.filter(m => m.fin).sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0));
    const unfin = items.filter(m => !m.fin).sort((a, b) => a.y - b.y);
    const results: FinishResult[] = [...fin, ...unfin].map((m, idx) => ({
      entrantId: m.e.id, displayName: m.e.displayName,
      position: idx + 1, finishTimeMs: m.ms ?? 0, didFinish: m.fin,
    }));
    onCompleteRef.current(results);
  }, [racers, marbleRefs]);

  const spawnX = useMemo(() => {
    const n = racers.length;
    if (n === 0) return [];
    const lo = -(AX - MR - 0.3), hi = AX - MR - 0.3;
    const xs = racers.map((_, i) => n === 1 ? 0 : lo + i * (hi - lo) / (n - 1));
    for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
    return xs;
  }, [racers]);

  const spawnZ = useMemo(
    () => racers.map(() => (Math.random() - 0.5) * AZ),
    [racers]
  );

  const obs = useMemo(() => generateObs(trackSeed, trackDifficulty), [trackSeed, trackDifficulty]);

  useFrame((state, delta) => {
    // Camera always updates — works before, during, and after the race.
    // Move the camera by the same delta as the target so the orbit offset
    // is preserved while it follows the marbles down the track.
    if (controlsRef.current) {
      const c = controlsRef.current;
      const px = c.target.x, py = c.target.y, pz = c.target.z;
      c.target.lerp(camTarget.current, 0.06);
      state.camera.position.x += c.target.x - px;
      state.camera.position.y += c.target.y - py;
      state.camera.position.z += c.target.z - pz;
      c.update();
    }

    if (!active.current) return;

    elapsedMs.current += delta * 1000;
    posTimer.current  += delta * 1000;
    jiggleTimer.current += delta * 1000;
    const doJiggle = jiggleTimer.current >= 500;
    if (doJiggle) jiggleTimer.current = 0;

    let minY = Infinity, leaderX = 0, leaderZ = 0;

    for (let i = 0; i < racers.length; i++) {
      if (finished.current[i]) continue;
      const rb = marbleRefs[i]?.current;
      if (!rb) continue;
      const p = rb.translation();
      if (p.y < minY) { minY = p.y; leaderX = p.x; leaderZ = p.z; }

      // Speed-boost zone — impulse scaled by mass and dt gives a constant
      // extra acceleration. (addForce persists across frames in Rapier, so
      // calling it per-frame accumulates without bound.)
      if (Math.hypot(p.x - GEYSER.x, p.z - GEYSER.z) < GEYSER.r &&
          p.y > GEYSER.y - 2.0 && p.y < GEYSER.y + 2.0) {
        rb.applyImpulse({ x: 0, y: GEYSER.strength * rb.mass() * delta, z: 0 }, true);
      }

      // Anti-jam nudge: marbles arching in a pile at a gap get a small
      // sideways kick so the race can't deadlock.
      if (doJiggle) {
        const v = rb.linvel();
        if (Math.hypot(v.x, v.y, v.z) < 0.8) {
          const m = rb.mass();
          rb.applyImpulse(
            { x: (Math.random() - 0.5) * 0.9 * m, y: 0, z: (Math.random() - 0.5) * 0.9 * m },
            true
          );
        }
      }

      if (p.y <= FINISH_Y) {
        finished.current[i]    = true;
        finishTimes.current[i] = Date.now() - raceStart.current;
        finishedCnt.current++;
        if (finishedCnt.current >= racers.length) { endRace(); return; }
        if (finishedCnt.current === 1 && !firstFinishTimer.current) {
          firstFinishTimer.current = setTimeout(() => endRace(), 5000);
        }
      }
    }

    if (minY < lastProgressY.current - 1.0) {
      lastProgressY.current    = minY;
      lastProgressTime.current = elapsedMs.current;
    }
    if (elapsedMs.current > 5000 && elapsedMs.current - lastProgressTime.current > 12000) {
      endRace(); return;
    }

    // Update camera target: tracked marble takes priority, else follow leader
    let tx = leaderX, ty = minY < Infinity ? minY : 0, tz = leaderZ;
    if (trackedEntrantId) {
      const idx = racers.findIndex(e => e.id === trackedEntrantId);
      if (idx >= 0) {
        const rb = marbleRefs[idx]?.current;
        if (rb) { const p = rb.translation(); tx = p.x; ty = p.y; tz = p.z; }
      }
    }
    camTarget.current.set(tx, ty, tz);

    if (posTimer.current >= 200 && onPosRef.current) {
      posTimer.current = 0;
      onPosRef.current(racers.map((e, i) => {
        const p = marbleRefs[i].current?.translation() ?? { x: 0, y: SPAWN_Y, z: 0 };
        return { entrantId: e.id, x: p.x, y: p.y, angle: 0 };
      }));
    }

    if (elapsedMs.current >= raceTimeoutSeconds * 1000) endRace();
  });

  return (
    <>
      <OrbitControls ref={controlsRef} enablePan minDistance={5} maxDistance={120} target={[0, 0, 0]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[14, 22, 18]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, -12, AZ]}   intensity={1.1} color="#8844ff" />
      <pointLight position={[AX, -26, -AZ]} intensity={0.9} color="#ff6644" />

      {/* Arena walls */}
      <RigidBody type="fixed" restitution={0.4} friction={0.3}>
        <mesh position={[-(AX + WALL_T / 2), TRACK_MID_Y, 0]}>
          <boxGeometry args={[WALL_T, TRACK_H, AZ * 2 + WALL_T * 2]} />
          <meshStandardMaterial color="#10103a" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" restitution={0.4} friction={0.3}>
        <mesh position={[AX + WALL_T / 2, TRACK_MID_Y, 0]}>
          <boxGeometry args={[WALL_T, TRACK_H, AZ * 2 + WALL_T * 2]} />
          <meshStandardMaterial color="#10103a" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" restitution={0.2} friction={0.6}>
        <mesh position={[0, TRACK_MID_Y, -(AZ + WALL_T / 2)]}>
          <boxGeometry args={[AX * 2 + WALL_T * 2, TRACK_H, WALL_T]} />
          <meshStandardMaterial color="#0c0c28" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" restitution={0.2} friction={0.6}>
        <mesh position={[0, TRACK_MID_Y, AZ + WALL_T / 2]}>
          <boxGeometry args={[AX * 2 + WALL_T * 2, TRACK_H, WALL_T]} />
          <meshStandardMaterial color="#8899ff" transparent opacity={0.05} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" restitution={0.3} friction={0.8}>
        <mesh position={[0, FLOOR_Y - 0.25, 0]}>
          <boxGeometry args={[AX * 2, 0.5, AZ * 2]} />
          <meshStandardMaterial color="#10103a" />
        </mesh>
      </RigidBody>

      {/* Ramps */}
      {RAMPS.map((r, i) => (
        <RigidBody key={`ramp-${i}`} type="fixed"
          position={[r.cx, r.cy, 0]} rotation={[0, 0, r.tiltZ]}
          restitution={0.3} friction={0.35}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[RAMP_W, RAMP_T, RAMP_D]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#1a2560' : '#251a60'} metalness={0.3} roughness={0.55} />
          </mesh>
        </RigidBody>
      ))}

      {/* Pegs */}
      {obs.pegs.map((peg, i) => {
        const r  = RAMPS[peg.rampIdx];
        const wx = r.cx + peg.lx;
        const wy = r.cy + peg.lx * Math.sin(r.tiltZ) + RAMP_T / 2 + 0.22;
        return (
          <RigidBody key={`peg-${i}`} type="fixed" restitution={0.8} friction={0.0}>
            <mesh position={[wx, wy, peg.lz]} castShadow>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial color="#3a3a7e" metalness={0.4} roughness={0.5} />
            </mesh>
          </RigidBody>
        );
      })}

      {/* Paddle — long enough to reach the wall-hugging drop path (|x| ≈ 5.2),
          but corners must stay inside the arena: √(5.7² + 0.45²) < 6 */}
      <RotatingPaddle position={[0, -11, 0]} length={AX * 1.9} speed={1.1} phase={0} />
      {trackDifficulty === 'chaos' && (
        <RotatingPaddle position={[0, -24, 0]} length={AX * 1.3} speed={2.0} phase={Math.PI} continuous />
      )}

      {/* Moving platform — range capped so its edge never pinches marbles
          against the wall (must leave > marble diameter of clearance) */}
      <MovingPlatform y={-24} range={AX - 3.3} speed={0.9} phase={0} />

      {/* Bumpers */}
      {obs.bumpers.map((b, i) => (
        <RigidBody key={`bumper-${i}`} type="fixed" restitution={0.9} friction={0.05}>
          <mesh position={[b.x, b.y, b.z]} castShadow>
            <sphereGeometry args={[b.r, 14, 14]} />
            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.45} metalness={0.3} roughness={0.4} />
          </mesh>
        </RigidBody>
      ))}

      {/* Spinner disk */}
      <SpinnerDisk position={[0, -36, 0]} speed={0.55} phase={0} />

      {/* Speed-boost zone visual */}
      <GeyserVisual position={[GEYSER.x, GEYSER.y, GEYSER.z]} />

      {/* Finish floor — visual trigger plane (no collider; marbles pass through) */}
      <mesh position={[0, FINISH_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[AX * 2, AZ * 2]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.9} transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, FINISH_Y + 1, 0]} color="#ffd700" intensity={4.0} distance={10} />
      <group position={[0, FINISH_Y + 1.5, 0]}>
        <Html center zIndexRange={[10, 0]}>
          <div style={{ color: '#ffd700', fontSize: '15px', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 0 8px #000', pointerEvents: 'none' }}>
            🏁 FINISH
          </div>
        </Html>
      </group>

      {/* Marbles */}
      {racers.map((entrant, i) => (
        <group key={entrant.id}>
          <RigidBody
            ref={marbleRefs[i]}
            type={gateOpen ? 'dynamic' : 'fixed'}
            position={[spawnX[i] ?? 0, SPAWN_Y, spawnZ[i] ?? 0]}
            colliders={false}
            ccd
            restitution={0.4}
            friction={0.35}
            linearDamping={0.02}
            angularDamping={0.1}
            mass={1}
          >
            <BallCollider args={[MR]} />
            <mesh castShadow>
              <sphereGeometry args={[MR, 20, 20]} />
              <meshStandardMaterial color={entrant.colour} metalness={0.55} roughness={0.2} />
            </mesh>
          </RigidBody>
          <MarbleLabel bodyRef={marbleRefs[i]} name={entrant.displayName} color={entrant.colour} />
        </group>
      ))}

      {/* Background */}
      <mesh position={[0, TRACK_MID_Y, -(AZ + 0.2)]} receiveShadow>
        <planeGeometry args={[(AX + 0.5) * 2, TRACK_H + 8]} />
        <meshStandardMaterial color="#04041a" />
      </mesh>
    </>
  );
}
