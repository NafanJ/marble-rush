import { TrackDifficulty, TrackObstacle } from '@/lib/types';
import { TRACK_WIDTH, TRACK_HEIGHT, FINISH_LINE_Y } from '@/lib/constants';

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
    difficulty === 'easy' ? 180 : difficulty === 'chaos' ? 90 : 120;
  const mazeSlotWidth =
    difficulty === 'easy' ? 180 : difficulty === 'chaos' ? 90 : 140;

  // -------------------------------------------------------
  // Section 0: Starting chute (y 0–400)
  // Narrow vertical tube — defined by inner walls
  // -------------------------------------------------------
  // Left chute wall
  obstacles.push({
    type: 'wall',
    x: 260,
    y: 200,
    width: 20,
    height: 400,
    angle: 0,
  });
  // Right chute wall
  obstacles.push({
    type: 'wall',
    x: 540,
    y: 200,
    width: 20,
    height: 400,
    angle: 0,
  });
  // Gate (will be destroyed by the scene to release marbles)
  obstacles.push({
    type: 'gate',
    x: 400,
    y: 390,
    width: 280,
    height: 16,
    angle: 0,
  });

  // -------------------------------------------------------
  // Section 1: Peg field (y 400–1200) — 8 rows × 6 pegs
  // -------------------------------------------------------
  const pegRows = Math.round(8 * pegDensity);
  const pegCols = difficulty === 'chaos' ? 8 : 6;
  for (let row = 0; row < pegRows; row++) {
    const yBase = 420 + row * (780 / pegRows);
    const offset = row % 2 === 0 ? 0 : (TRACK_WIDTH / pegCols) * 0.5;
    for (let col = 0; col < pegCols; col++) {
      const xBase =
        60 + offset + col * ((TRACK_WIDTH - 120) / (pegCols - 1));
      const jitter = (rng() - 0.5) * 20;
      obstacles.push({
        type: 'peg',
        x: Math.max(40, Math.min(TRACK_WIDTH - 40, xBase + jitter)),
        y: yBase + (rng() - 0.5) * 15,
        radius: 12,
      });
    }
  }

  // -------------------------------------------------------
  // Section 2: Funnel (y 1200–1600)
  // Two angled walls converging to ~120px opening at center
  // -------------------------------------------------------
  const funnelTopWidth = TRACK_WIDTH - 80; // 720px wide at top
  const funnelCenterX = TRACK_WIDTH / 2;
  const funnelTopY = 1200;
  const funnelBottomY = 1580;
  const funnelHeight = funnelBottomY - funnelTopY;

  // Left funnel wall — angled from x=40 at top to center-funnelGap/2 at bottom
  const leftFunnelAngle = Math.atan2(
    funnelCenterX - funnelGap / 2 - 40,
    funnelHeight
  );
  const leftFunnelLen = Math.sqrt(
    Math.pow(funnelCenterX - funnelGap / 2 - 40, 2) +
      Math.pow(funnelHeight, 2)
  );
  obstacles.push({
    type: 'funnel_wall',
    x: (40 + funnelCenterX - funnelGap / 2) / 2,
    y: (funnelTopY + funnelBottomY) / 2,
    width: leftFunnelLen,
    height: 16,
    angle: -leftFunnelAngle,
  });

  // Right funnel wall
  const rightFunnelAngle = Math.atan2(
    TRACK_WIDTH - 40 - (funnelCenterX + funnelGap / 2),
    funnelHeight
  );
  const rightFunnelLen = Math.sqrt(
    Math.pow(TRACK_WIDTH - 40 - (funnelCenterX + funnelGap / 2), 2) +
      Math.pow(funnelHeight, 2)
  );
  obstacles.push({
    type: 'funnel_wall',
    x: (TRACK_WIDTH - 40 + funnelCenterX + funnelGap / 2) / 2,
    y: (funnelTopY + funnelBottomY) / 2,
    width: rightFunnelLen,
    height: 16,
    angle: rightFunnelAngle,
  });

  // -------------------------------------------------------
  // Section 3: Ramp zigzag (y 1600–2400) — 4+ alternating ramps
  // -------------------------------------------------------
  const rampCount = difficulty === 'chaos' ? 7 : difficulty === 'easy' ? 3 : 4;
  const rampYStep = 800 / rampCount;
  for (let i = 0; i < rampCount; i++) {
    const isLeft = i % 2 === 0;
    const rampY = 1650 + i * rampYStep;
    const rampAngle = (difficulty === 'chaos' ? 0.38 : 0.28) * (isLeft ? 1 : -1);
    const rampLen = difficulty === 'easy' ? 340 : 380;
    const rampX = isLeft ? 200 : TRACK_WIDTH - 200;
    obstacles.push({
      type: 'ramp',
      x: rampX,
      y: rampY,
      width: rampLen,
      height: 18,
      angle: rampAngle,
    });
    // Small guide peg at the end of each ramp
    const pegOffX = isLeft ? 190 : -190;
    obstacles.push({
      type: 'peg',
      x: rampX + pegOffX,
      y: rampY + 40,
      radius: 10,
    });
  }

  // -------------------------------------------------------
  // Section 4: Speed pads (y 2400–2800)
  // -------------------------------------------------------
  const speedPadCount =
    difficulty === 'easy' ? 2 : difficulty === 'chaos' ? 5 : 3;
  for (let i = 0; i < speedPadCount; i++) {
    const padY = 2440 + i * (360 / speedPadCount);
    const padX = 100 + rng() * (TRACK_WIDTH - 200);
    obstacles.push({
      type: 'speedpad',
      x: padX,
      y: padY,
      width: 100 + rng() * 60,
      height: 20,
      angle: 0,
      isSpeedPad: true,
    });
  }

  // -------------------------------------------------------
  // Section 5: Bumper gauntlet (y 2800–3600)
  // -------------------------------------------------------
  for (let i = 0; i < bumperCount; i++) {
    const bumpX = 60 + rng() * (TRACK_WIDTH - 120);
    const bumpY = 2850 + rng() * 700;
    obstacles.push({
      type: 'bumper',
      x: bumpX,
      y: bumpY,
      radius: 22 + rng() * 12,
      isBumper: true,
    });
  }

  // -------------------------------------------------------
  // Section 6: Narrow maze (y 3600–4200)
  // Alternating channel walls creating a slalom
  // -------------------------------------------------------
  const mazeRows = difficulty === 'chaos' ? 8 : difficulty === 'easy' ? 4 : 6;
  const mazeYStep = 580 / mazeRows;
  for (let i = 0; i < mazeRows; i++) {
    const fromLeft = i % 2 === 0;
    const mazeY = 3640 + i * mazeYStep;
    // Wall leaving a gap of mazeSlotWidth for the marble
    if (fromLeft) {
      // Gap on left side
      const gapEnd = 80 + rng() * 100 + mazeSlotWidth;
      obstacles.push({
        type: 'wall',
        x: (gapEnd + TRACK_WIDTH) / 2,
        y: mazeY,
        width: TRACK_WIDTH - gapEnd,
        height: 18,
        angle: 0,
      });
    } else {
      // Gap on right side
      const gapStart = TRACK_WIDTH - 80 - rng() * 100 - mazeSlotWidth;
      obstacles.push({
        type: 'wall',
        x: gapStart / 2,
        y: mazeY,
        width: gapStart,
        height: 18,
        angle: 0,
      });
    }
  }

  // -------------------------------------------------------
  // Section 7: Final straight (y 4200–4600)
  // A few loose pegs for last-second drama
  // -------------------------------------------------------
  const finalPegCount = difficulty === 'chaos' ? 8 : difficulty === 'easy' ? 2 : 4;
  for (let i = 0; i < finalPegCount; i++) {
    obstacles.push({
      type: 'peg',
      x: 80 + rng() * (TRACK_WIDTH - 160),
      y: 4230 + rng() * 340,
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
