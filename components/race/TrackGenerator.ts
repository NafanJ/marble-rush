import { TrackDifficulty, TrackObstacle } from '@/lib/types';
import { TRACK_WIDTH, TRACK_HEIGHT } from '@/lib/constants';

// Simple seeded LCG PRNG — produces deterministic sequences from a string seed
function makePrng(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // LCG constants from Numerical Recipes
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface GeneratedTrack {
  obstacles: TrackObstacle[];
  wallLeft: TrackObstacle;
  wallRight: TrackObstacle;
  floorBottom: TrackObstacle;
}

// Inner faces of the chute that holds marbles before the gate opens.
// The scene spawns marbles inside this range — keep them in sync.
export const CHUTE_LEFT = 270;
export const CHUTE_RIGHT = 530;

export function generateTrack(
  seed: string,
  difficulty: TrackDifficulty
): GeneratedTrack {
  const rng = makePrng(seed || 'default');

  const obstacles: TrackObstacle[] = [];

  // Difficulty multipliers
  const pegDensity =
    difficulty === 'easy' ? 0.6 : difficulty === 'chaos' ? 1.5 : 1.0;
  const bumperCount =
    difficulty === 'easy' ? 8 : difficulty === 'chaos' ? 16 : 12;
  const funnelGap =
    difficulty === 'easy' ? 180 : difficulty === 'chaos' ? 100 : 130;
  const mazeSlotWidth =
    difficulty === 'easy' ? 180 : difficulty === 'chaos' ? 100 : 140;

  // -------------------------------------------------------
  // Section 0: Starting chute (y 0–400)
  // Narrow vertical tube — defined by inner walls
  // -------------------------------------------------------
  obstacles.push({
    type: 'wall',
    x: CHUTE_LEFT - 10,
    y: 200,
    width: 20,
    height: 400,
    angle: 0,
  });
  obstacles.push({
    type: 'wall',
    x: CHUTE_RIGHT + 10,
    y: 200,
    width: 20,
    height: 400,
    angle: 0,
  });
  // Gate (destroyed by the scene to release marbles)
  obstacles.push({
    type: 'gate',
    x: TRACK_WIDTH / 2,
    y: 390,
    width: CHUTE_RIGHT - CHUTE_LEFT + 40,
    height: 16,
    angle: 0,
  });

  // -------------------------------------------------------
  // Section 1: Pachinko peg field (y 420–1200), staggered rows
  // -------------------------------------------------------
  const pegRows = Math.round(8 * pegDensity);
  const pegCols = difficulty === 'chaos' ? 8 : 6;
  for (let row = 0; row < pegRows; row++) {
    const yBase = 440 + row * (740 / pegRows);
    const offset = row % 2 === 0 ? 0 : (TRACK_WIDTH / pegCols) * 0.5;
    for (let col = 0; col < pegCols; col++) {
      const xBase =
        60 + offset + col * ((TRACK_WIDTH - 120) / (pegCols - 1));
      const jitter = (rng() - 0.5) * 20;
      obstacles.push({
        type: 'peg',
        x: Math.max(48, Math.min(TRACK_WIDTH - 48, xBase + jitter)),
        y: yBase + (rng() - 0.5) * 15,
        radius: 12,
      });
    }
  }

  // -------------------------------------------------------
  // Section 2: Funnel (y 1200–1580)
  // Two angled walls converging to a central opening. Each wall runs
  // from the outer wall face down to its gap edge so there is no notch
  // for a marble to wedge into at the top.
  // -------------------------------------------------------
  const funnelTopY = 1200;
  const funnelBottomY = 1580;
  const funnelHeight = funnelBottomY - funnelTopY;
  const gapLeftX = TRACK_WIDTH / 2 - funnelGap / 2;
  const gapRightX = TRACK_WIDTH / 2 + funnelGap / 2;

  // Left wall: (20, top) -> (gapLeftX, bottom). Positive angle rotates
  // clockwise in screen coords (y-down), dropping the right-hand end.
  {
    const dx = gapLeftX - 20;
    obstacles.push({
      type: 'funnel_wall',
      x: (20 + gapLeftX) / 2,
      y: (funnelTopY + funnelBottomY) / 2,
      width: Math.hypot(dx, funnelHeight),
      height: 16,
      angle: Math.atan2(funnelHeight, dx),
    });
  }
  // Right wall: (TRACK_WIDTH - 20, top) -> (gapRightX, bottom), mirrored.
  {
    const dx = TRACK_WIDTH - 20 - gapRightX;
    obstacles.push({
      type: 'funnel_wall',
      x: (TRACK_WIDTH - 20 + gapRightX) / 2,
      y: (funnelTopY + funnelBottomY) / 2,
      width: Math.hypot(dx, funnelHeight),
      height: 16,
      angle: -Math.atan2(funnelHeight, dx),
    });
  }

  // -------------------------------------------------------
  // Section 3: Ramp zigzag (y 1650–2400) — alternating ramps
  // -------------------------------------------------------
  const rampCount = difficulty === 'chaos' ? 7 : difficulty === 'easy' ? 3 : 4;
  const rampYStep = 750 / rampCount;
  for (let i = 0; i < rampCount; i++) {
    const isLeft = i % 2 === 0;
    const rampY = 1680 + i * rampYStep;
    const rampAngle = (difficulty === 'chaos' ? 0.38 : 0.28) * (isLeft ? 1 : -1);
    const rampLen = 380;
    const rampX = isLeft ? 200 : TRACK_WIDTH - 200;
    obstacles.push({
      type: 'ramp',
      x: rampX,
      y: rampY,
      width: rampLen,
      height: 18,
      angle: rampAngle,
    });
    // Guide peg below the drop edge of each ramp — blocks the straight
    // central channel so marbles can't fall through the whole section
    obstacles.push({
      type: 'peg',
      x: rampX + (isLeft ? 190 : -190),
      y: rampY + 60,
      radius: 11,
    });
  }

  // -------------------------------------------------------
  // Section 4: Speed pads (y 2440–2780) — boost marbles DOWN the track
  // -------------------------------------------------------
  const speedPadCount =
    difficulty === 'easy' ? 2 : difficulty === 'chaos' ? 5 : 3;
  for (let i = 0; i < speedPadCount; i++) {
    const padY = 2460 + i * (320 / speedPadCount);
    obstacles.push({
      type: 'speedpad',
      x: 110 + rng() * (TRACK_WIDTH - 220),
      y: padY,
      width: 110 + rng() * 60,
      height: 20,
      angle: 0,
    });
  }

  // -------------------------------------------------------
  // Section 5: Pinball zone (y 2850–3550)
  // Bumpers + rotating spinners + side slingshot kickers
  // -------------------------------------------------------
  const spinners: TrackObstacle[] = [
    { type: 'spinner', x: 400, y: 2960, width: 150, height: 14, spinSpeed: 2.0 },
    { type: 'spinner', x: 230, y: 3360, width: 140, height: 14, spinSpeed: -2.4 },
    { type: 'spinner', x: 570, y: 3360, width: 140, height: 14, spinSpeed: 2.4 },
  ];
  if (difficulty === 'easy') spinners.pop();
  obstacles.push(...spinners);

  // Slingshots: angled high-restitution kickers that fire marbles back
  // toward the centre, pinball-style
  const slingshots: TrackObstacle[] = [
    { type: 'slingshot', x: 95, y: 3140, width: 160, height: 16, angle: -0.55 },
    { type: 'slingshot', x: TRACK_WIDTH - 95, y: 3140, width: 160, height: 16, angle: 0.55 },
  ];
  obstacles.push(...slingshots);

  // Bumpers: rejection-sampled so no pair (or bumper/spinner/slingshot
  // overlap) creates a marble trap
  const placed: { x: number; y: number; r: number }[] = [];
  const clearances = [
    ...spinners.map((s) => ({ x: s.x, y: s.y, r: (s.width ?? 150) / 2 + 30 })),
    ...slingshots.map((s) => ({ x: s.x, y: s.y, r: 110 })),
  ];
  let attempts = 0;
  while (placed.length < bumperCount && attempts < 400) {
    attempts++;
    const r = 22 + rng() * 12;
    const bx = 90 + rng() * (TRACK_WIDTH - 180);
    const by = 2860 + rng() * 680;
    if (placed.some((p) => Math.hypot(p.x - bx, p.y - by) < p.r + r + 50)) continue;
    if (clearances.some((c) => Math.hypot(c.x - bx, c.y - by) < c.r + r)) continue;
    placed.push({ x: bx, y: by, r });
    obstacles.push({ type: 'bumper', x: bx, y: by, radius: r });
  }

  // -------------------------------------------------------
  // Section 6: Slalom maze (y 3640–4220)
  // Alternating walls, each tilted toward its gap so marbles always
  // roll off — a flat shelf would strand them
  // -------------------------------------------------------
  // Two hard constraints, found empirically (see incline sandbox results):
  // 1. Matter inclines are binary — below ~0.15 rad marbles enter a rolling
  //    crawl (~0.6 px/step) regardless of friction; at 0.2 they slide fast.
  //    So the tilt must be ≥ 0.2; the scene's velocity clamp caps the speed.
  // 2. Each wall's low tip must clear the next wall's raised tip by more
  //    than a marble diameter (tip swing ≈ 290·sin(tilt) per wall), or the
  //    junction forms a saddle that wedges the pack — hence few, well
  //    separated rows.
  const mazeRows = difficulty === 'easy' ? 2 : 3;
  const mazeYStep = 580 / mazeRows;
  const mazeTilt = 0.2;
  for (let i = 0; i < mazeRows; i++) {
    const gapOnLeft = i % 2 === 0;
    const mazeY = 3660 + i * mazeYStep;
    if (gapOnLeft) {
      const gapEnd = 80 + rng() * 100 + mazeSlotWidth;
      obstacles.push({
        type: 'wall',
        x: (gapEnd + TRACK_WIDTH) / 2,
        y: mazeY,
        width: TRACK_WIDTH - gapEnd,
        height: 18,
        angle: -mazeTilt, // left end lower → marbles roll left into the gap
      });
    } else {
      const gapStart = TRACK_WIDTH - 80 - rng() * 100 - mazeSlotWidth;
      obstacles.push({
        type: 'wall',
        x: gapStart / 2,
        y: mazeY,
        width: gapStart,
        height: 18,
        angle: mazeTilt, // right end lower → marbles roll right into the gap
      });
    }
  }

  // -------------------------------------------------------
  // Section 7: Final straight (y 4280–4640)
  // Loose pegs for last-second drama
  // -------------------------------------------------------
  const finalPegCount = difficulty === 'chaos' ? 8 : difficulty === 'easy' ? 2 : 4;
  for (let i = 0; i < finalPegCount; i++) {
    obstacles.push({
      type: 'peg',
      x: 80 + rng() * (TRACK_WIDTH - 160),
      y: 4300 + rng() * 320,
      radius: 14,
    });
  }

  // -------------------------------------------------------
  // Outer walls (full height)
  // -------------------------------------------------------
  const wallLeft: TrackObstacle = {
    type: 'wall',
    x: 10,
    y: TRACK_HEIGHT / 2,
    width: 20,
    height: TRACK_HEIGHT,
    angle: 0,
  };
  const wallRight: TrackObstacle = {
    type: 'wall',
    x: TRACK_WIDTH - 10,
    y: TRACK_HEIGHT / 2,
    width: 20,
    height: TRACK_HEIGHT,
    angle: 0,
  };
  const floorBottom: TrackObstacle = {
    type: 'wall',
    x: TRACK_WIDTH / 2,
    y: TRACK_HEIGHT - 5,
    width: TRACK_WIDTH,
    height: 10,
    angle: 0,
  };

  return { obstacles, wallLeft, wallRight, floorBottom };
}
