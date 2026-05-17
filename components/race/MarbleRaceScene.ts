// MarbleRaceScene.ts — Phaser.Scene for Marble Rush
// This file is NOT a React component. Import it only via dynamic() with ssr:false.

import type { Entrant, FinishResult, MarblePosition, SceneData, TrackDifficulty } from '@/lib/types';
import { MARBLE_RADIUS, TRACK_WIDTH, TRACK_HEIGHT, FINISH_LINE_Y } from '@/lib/constants';
import { generateTrack } from './TrackGenerator';

// Phaser is loaded at runtime in the browser
declare const Phaser: typeof import('phaser');

interface MarbleData {
  entrant: Entrant;
  body: MatterJS.BodyType;
  label: Phaser.GameObjects.Text;
  finishTimeMs: number | null;
  finished: boolean;
  imageObj: Phaser.GameObjects.Image | null;
}

export class MarbleRaceScene extends Phaser.Scene {
  private marbles: MarbleData[] = [];
  private gateBody: MatterJS.BodyType | null = null;
  private speedPadBodies: MatterJS.BodyType[] = [];
  private raceStartTime = 0;
  private raceActive = false;
  private finishedCount = 0;
  private positionUpdateTimer = 0;
  private randomForceTimer = 0;
  private timeoutTimer = 0;
  private completionCalled = false;

  // Passed via scene config data
  private entrants: Entrant[] = [];
  private isAdmin = false;
  private trackDifficulty: TrackDifficulty = 'normal';
  private trackSeed = '';
  private speedMultiplier = 1.0;
  private onRaceComplete: ((results: FinishResult[]) => void) | null = null;
  private onPositionUpdate: ((positions: MarblePosition[]) => void) | null = null;
  private raceTimeoutMs = 300000;

  constructor() {
    super({ key: 'MarbleRaceScene' });
  }

  init(data: SceneData) {
    this.entrants = data.entrants ?? [];
    this.isAdmin = data.isAdmin ?? false;
    this.trackDifficulty = data.trackDifficulty ?? 'normal';
    this.trackSeed = data.trackSeed ?? '';
    this.speedMultiplier = data.speedMultiplier ?? 1.0;
    this.onRaceComplete = data.onRaceComplete ?? null;
    this.onPositionUpdate = data.onPositionUpdate ?? null;
    this.raceTimeoutMs = (data as unknown as { raceTimeoutSeconds?: number }).raceTimeoutSeconds
      ? (data as unknown as { raceTimeoutSeconds: number }).raceTimeoutSeconds * 1000
      : 300000;
    // Reset state
    this.marbles = [];
    this.gateBody = null;
    this.speedPadBodies = [];
    this.raceStartTime = 0;
    this.raceActive = false;
    this.finishedCount = 0;
    this.positionUpdateTimer = 0;
    this.randomForceTimer = 0;
    this.timeoutTimer = 0;
    this.completionCalled = false;
  }

  preload() {
    // Load marble textures for entrants that have a custom image
    for (const entrant of this.entrants) {
      if (entrant.marbleTextureUrl) {
        this.load.image(`marble-img-${entrant.id}`, entrant.marbleTextureUrl);
      }
    }
  }

  create() {
    // Set world bounds
    this.matter.world.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

    // Adjust gravity with speed multiplier
    this.matter.world.setGravity(0, 2.5 * this.speedMultiplier);

    // Draw background gradient
    this.drawBackground();

    // Generate track
    const track = generateTrack(this.trackSeed, this.trackDifficulty);

    // Add outer walls
    this.addStaticRect(
      track.wallLeft.x,
      track.wallLeft.y,
      track.wallLeft.width!,
      track.wallLeft.height!,
      { restitution: 0.2, friction: 0.5 },
      0x1a1a4e,
      false
    );
    this.addStaticRect(
      track.wallRight.x,
      track.wallRight.y,
      track.wallRight.width!,
      track.wallRight.height!,
      { restitution: 0.2, friction: 0.5 },
      0x1a1a4e,
      false
    );
    this.addStaticRect(
      track.floorBottom.x,
      track.floorBottom.y,
      track.floorBottom.width!,
      track.floorBottom.height!,
      { restitution: 0.2, friction: 0.5 },
      0x1a1a4e,
      false
    );

    // Draw obstacles
    for (const obs of track.obstacles) {
      if (obs.type === 'gate') {
        // Gate — will be destroyed to release marbles
        const gateGraphics = this.add.graphics();
        gateGraphics.fillStyle(0x4a1a8e, 1);
        gateGraphics.fillRect(
          obs.x - obs.width! / 2,
          obs.y - obs.height! / 2,
          obs.width!,
          obs.height!
        );
        this.gateBody = this.matter.add.rectangle(obs.x, obs.y, obs.width!, obs.height!, {
          isStatic: true,
          restitution: 0.2,
          friction: 0.5,
          label: 'gate',
        }) as MatterJS.BodyType;
        continue;
      }

      if (obs.type === 'peg') {
        const r = obs.radius ?? 12;
        const g = this.add.graphics();
        g.fillStyle(0x3a3a6e, 1);
        g.fillCircle(obs.x, obs.y, r);
        this.matter.add.circle(obs.x, obs.y, r, {
          isStatic: true,
          restitution: 0.65,
          friction: 0.1,
          label: 'peg',
        });
        continue;
      }

      if (obs.type === 'bumper') {
        const r = obs.radius ?? 22;
        // Cycle bumper colors
        const bumperColors = [0xffd700, 0xff6b6b, 0x00ffff, 0xff9900, 0x00ff88];
        const colorIdx = Math.floor(Math.random() * bumperColors.length);
        const g = this.add.graphics();
        g.fillStyle(bumperColors[colorIdx], 0.9);
        g.fillCircle(obs.x, obs.y, r);
        g.lineStyle(3, 0xffffff, 0.5);
        g.strokeCircle(obs.x, obs.y, r);
        this.matter.add.circle(obs.x, obs.y, r, {
          isStatic: true,
          restitution: 0.85,
          friction: 0.05,
          label: 'bumper',
        });
        continue;
      }

      if (obs.type === 'speedpad') {
        const w = obs.width ?? 100;
        const h = obs.height ?? 20;
        const g = this.add.graphics();
        g.fillStyle(0x00ff88, 0.6);
        g.fillRect(obs.x - w / 2, obs.y - h / 2, w, h);
        g.lineStyle(2, 0x00ff88, 1);
        g.strokeRect(obs.x - w / 2, obs.y - h / 2, w, h);
        // Add arrow indicators
        g.fillStyle(0x00ff88, 1);
        const arrowX = obs.x;
        const arrowY = obs.y - 10;
        g.fillTriangle(arrowX, arrowY - 8, arrowX - 8, arrowY + 4, arrowX + 8, arrowY + 4);

        const speedBody = this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true,
          isSensor: true,
          label: 'speedpad',
        }) as MatterJS.BodyType;
        this.speedPadBodies.push(speedBody);
        continue;
      }

      if (obs.type === 'funnel_wall' || obs.type === 'wall' || obs.type === 'ramp') {
        const w = obs.width ?? 20;
        const h = obs.height ?? 18;
        const angle = obs.angle ?? 0;
        const g = this.add.graphics();
        g.fillStyle(obs.type === 'funnel_wall' ? 0x2a2a5e : 0x1a1a4e, 1);
        // Draw a rotated rectangle at the correct position
        g.save();
        g.translateCanvas(obs.x, obs.y);
        g.rotateCanvas(angle);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.restore();

        this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true,
          angle: angle,
          restitution: obs.type === 'ramp' ? 0.3 : 0.2,
          friction: obs.type === 'ramp' ? 0.2 : 0.5,
          label: obs.type,
        });
        continue;
      }
    }

    // Draw finish line
    this.drawFinishLine();

    // Create marble textures and spawn marbles
    this.spawnMarbles();

    // Speed pad collision
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      const pairs = event.pairs;
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        const marbleBody = bodyA.label === 'marble'
          ? bodyA
          : bodyB.label === 'marble'
          ? bodyB
          : null;
        const padBody = bodyA.label === 'speedpad'
          ? bodyA
          : bodyB.label === 'speedpad'
          ? bodyB
          : null;

        if (marbleBody && padBody) {
          // Apply upward impulse
          const forceMag = 0.012 * this.speedMultiplier;
          this.matter.applyForce(
            marbleBody,
            { x: 0, y: -forceMag }
          );
        }
      }
    });

    // Setup camera
    this.cameras.main.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    this.cameras.main.scrollX = 0;
    // Start at the top
    this.cameras.main.scrollY = 0;
  }

  private drawBackground() {
    const bg = this.add.graphics();
    // Dark gradient from top to bottom — approximate with two rectangles
    bg.fillGradientStyle(0x060618, 0x060618, 0x0d1a35, 0x0d1a35, 1);
    bg.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    // Side wall visuals
    bg.fillStyle(0x1a1a4e, 1);
    bg.fillRect(0, 0, 20, TRACK_HEIGHT);
    bg.fillRect(TRACK_WIDTH - 20, 0, 20, TRACK_HEIGHT);
  }

  private drawFinishLine() {
    const finishY = FINISH_LINE_Y;
    const squareSize = 20;
    const numSquares = Math.ceil(TRACK_WIDTH / squareSize);
    const g = this.add.graphics();

    for (let i = 0; i < numSquares; i++) {
      const isWhite = i % 2 === 0;
      g.fillStyle(isWhite ? 0xffffff : 0x000000, 1);
      g.fillRect(i * squareSize, finishY, squareSize, squareSize);
    }
    // Second row, inverted
    for (let i = 0; i < numSquares; i++) {
      const isWhite = i % 2 !== 0;
      g.fillStyle(isWhite ? 0xffffff : 0x000000, 1);
      g.fillRect(i * squareSize, finishY + squareSize, squareSize, squareSize);
    }

    // Finish line text
    const finishText = this.add.text(TRACK_WIDTH / 2, finishY - 30, '🏁 FINISH LINE 🏁', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    finishText.setOrigin(0.5, 0.5);

    // Glow line above finish
    g.lineStyle(4, 0xffd700, 0.8);
    g.lineBetween(0, finishY - 2, TRACK_WIDTH, finishY - 2);
  }

  private addStaticRect(
    x: number,
    y: number,
    w: number,
    h: number,
    physicsOptions: Record<string, unknown>,
    color: number,
    drawVisual = true
  ): MatterJS.BodyType {
    if (drawVisual) {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRect(x - w / 2, y - h / 2, w, h);
    }
    return this.matter.add.rectangle(x, y, w, h, {
      isStatic: true,
      ...physicsOptions,
    }) as MatterJS.BodyType;
  }

  private hexToNum(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  private createMarbleTexture(entrant: Entrant): string {
    const key = `marble-${entrant.id}`;
    const size = MARBLE_RADIUS * 2;

    // Create a render texture
    const rt = this.add.renderTexture(0, 0, size, size);
    rt.setVisible(false);

    const gfx = this.add.graphics();
    const color = this.hexToNum(entrant.colour);

    // Main marble circle
    gfx.fillStyle(color, 1);
    gfx.fillCircle(size / 2, size / 2, MARBLE_RADIUS);

    // Darker shading at bottom
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillCircle(size / 2 + 3, size / 2 + 4, MARBLE_RADIUS * 0.7);

    // Shine highlight (white ellipse top-left)
    gfx.fillStyle(0xffffff, 0.45);
    gfx.fillEllipse(size / 2 - MARBLE_RADIUS * 0.28, size / 2 - MARBLE_RADIUS * 0.28, MARBLE_RADIUS * 0.6, MARBLE_RADIUS * 0.4);

    // Smaller specular dot
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(size / 2 - MARBLE_RADIUS * 0.3, size / 2 - MARBLE_RADIUS * 0.3, MARBLE_RADIUS * 0.15);

    rt.draw(gfx, 0, 0);
    rt.saveTexture(key);

    gfx.destroy();
    rt.destroy();

    return key;
  }

  private createMarbleFromImage(entrant: Entrant): string {
    const key = `marble-${entrant.id}`;
    const size = MARBLE_RADIUS * 2;
    const imgKey = `marble-img-${entrant.id}`;

    if (!this.textures.exists(imgKey)) {
      // Fall back to colored marble
      return this.createMarbleTexture(entrant);
    }

    const rt = this.add.renderTexture(0, 0, size, size);
    rt.setVisible(false);

    // Create circular mask
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillCircle(rt.x + size / 2, rt.y + size / 2, MARBLE_RADIUS);
    const mask = maskGfx.createGeometryMask();

    // Draw the image centered
    const img = this.add.image(size / 2, size / 2, imgKey);
    img.setDisplaySize(size, size);
    img.setMask(mask);
    rt.draw(img, 0, 0);
    img.destroy();
    maskGfx.destroy();
    mask.destroy();

    // Draw shine on top
    const shineGfx = this.add.graphics();
    shineGfx.fillStyle(0xffffff, 0.35);
    shineGfx.fillEllipse(size / 2 - MARBLE_RADIUS * 0.28, size / 2 - MARBLE_RADIUS * 0.28, MARBLE_RADIUS * 0.6, MARBLE_RADIUS * 0.4);
    shineGfx.fillStyle(0xffffff, 0.6);
    shineGfx.fillCircle(size / 2 - MARBLE_RADIUS * 0.3, size / 2 - MARBLE_RADIUS * 0.3, MARBLE_RADIUS * 0.15);
    rt.draw(shineGfx, 0, 0);
    shineGfx.destroy();

    rt.saveTexture(key);
    rt.destroy();

    return key;
  }

  private spawnMarbles() {
    if (this.entrants.length === 0) return;

    const count = this.entrants.length;
    const spawnY = 80;
    // Evenly distribute across x 100–700
    const xMin = 120;
    const xMax = TRACK_WIDTH - 120;
    const xStep = count > 1 ? (xMax - xMin) / (count - 1) : 0;

    // Shuffle spawn positions (same slot probability, fair start)
    const positions = this.entrants.map((_, i) =>
      count === 1 ? TRACK_WIDTH / 2 : xMin + i * xStep
    );
    // Fisher-Yates shuffle using Math.random (intentionally non-seeded for per-race variance)
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < this.entrants.length; i++) {
      const entrant = this.entrants[i];
      const spawnX = positions[i];

      // Create texture
      let textureKey: string;
      if (entrant.marbleTextureUrl) {
        textureKey = this.createMarbleFromImage(entrant);
      } else {
        textureKey = this.createMarbleTexture(entrant);
      }

      // Create physics body
      const body = this.matter.add.circle(spawnX, spawnY, MARBLE_RADIUS, {
        restitution: 0.4,
        friction: 0.3,
        frictionAir: 0.018,
        density: 0.002,
        label: 'marble',
      }) as MatterJS.BodyType;

      // Create visual image tied to the body
      const img = this.add.image(spawnX, spawnY, textureKey);
      img.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);

      // Create name label
      const label = this.add.text(spawnX, spawnY - MARBLE_RADIUS - 18, entrant.displayName, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        resolution: 2,
      });
      label.setOrigin(0.5, 0.5);

      this.marbles.push({
        entrant,
        body,
        label,
        finishTimeMs: null,
        finished: false,
        imageObj: img,
      });
    }
  }

  // Call this from outside to release marbles after countdown
  openGate() {
    if (this.gateBody) {
      this.matter.world.remove(this.gateBody);
      this.gateBody = null;
    }
    this.raceStartTime = Date.now();
    this.raceActive = true;
  }

  update(_time: number, delta: number) {
    if (!this.raceActive) return;

    const now = Date.now();
    this.positionUpdateTimer += delta;
    this.randomForceTimer += delta;
    this.timeoutTimer += delta;

    // Update marble visuals — move image and label to follow body
    for (const marble of this.marbles) {
      const bx = marble.body.position.x;
      const by = marble.body.position.y;
      const angle = marble.body.angle;

      if (marble.imageObj) {
        marble.imageObj.setPosition(bx, by);
        marble.imageObj.setRotation(angle);
      }
      marble.label.setPosition(bx, by - MARBLE_RADIUS - 18);

      // Check if this marble crossed the finish line
      if (!marble.finished && by >= FINISH_LINE_Y) {
        marble.finished = true;
        this.finishedCount++;
        marble.finishTimeMs = now - this.raceStartTime;

        // Stop the body
        this.matter.body.setStatic(marble.body, true);
        // Move it slightly to the side of finish line to avoid stacking
        const finishedX = 30 + (this.finishedCount % 14) * 55;
        this.matter.body.setPosition(marble.body, {
          x: finishedX,
          y: FINISH_LINE_Y + 30,
        });
        if (marble.imageObj) {
          marble.imageObj.setPosition(finishedX, FINISH_LINE_Y + 30);
        }
        marble.label.setPosition(finishedX, FINISH_LINE_Y + 10);

        // Check if all finished
        if (this.finishedCount >= this.marbles.length) {
          this.endRace();
          return;
        }
      }
    }

    // Apply random horizontal force every 500ms
    if (this.randomForceTimer >= 500) {
      this.randomForceTimer = 0;
      for (const marble of this.marbles) {
        if (!marble.finished) {
          const fx = (Math.random() - 0.5) * 0.00015 * marble.body.mass;
          this.matter.applyForce(
            marble.body,
            { x: fx, y: 0 }
          );
        }
      }
    }

    // Camera follows the leading marble (highest y value)
    let maxY = 0;
    for (const marble of this.marbles) {
      if (!marble.finished && marble.body.position.y > maxY) {
        maxY = marble.body.position.y;
      }
    }
    if (maxY > 0) {
      const targetScrollY = maxY - 300;
      this.cameras.main.scrollY = Phaser.Math.Linear(
        this.cameras.main.scrollY,
        targetScrollY,
        0.06
      );
    }
    // Lock horizontal scroll
    this.cameras.main.scrollX = 0;

    // Position update callback every 200ms
    if (this.positionUpdateTimer >= 200 && this.onPositionUpdate) {
      this.positionUpdateTimer = 0;
      const positions: MarblePosition[] = this.marbles.map((m) => ({
        entrantId: m.entrant.id,
        x: m.body.position.x,
        y: m.body.position.y,
        angle: m.body.angle,
      }));
      this.onPositionUpdate(positions);
    }

    // Timeout check
    if (this.timeoutTimer >= this.raceTimeoutMs) {
      this.endRace();
    }
  }

  private endRace() {
    if (this.completionCalled) return;
    this.completionCalled = true;
    this.raceActive = false;

    // Build finish order — finished marbles first, then sort by y (furthest down)
    const finished = this.marbles
      .filter((m) => m.finished)
      .sort((a, b) => (a.finishTimeMs ?? 0) - (b.finishTimeMs ?? 0));
    const unfinished = this.marbles
      .filter((m) => !m.finished)
      .sort((a, b) => b.body.position.y - a.body.position.y);

    const allSorted = [...finished, ...unfinished];

    const results: FinishResult[] = allSorted.map((m, idx) => ({
      entrantId: m.entrant.id,
      displayName: m.entrant.displayName,
      position: idx + 1,
      finishTimeMs: m.finishTimeMs ?? 0,
      didFinish: m.finished,
    }));

    if (this.onRaceComplete) {
      this.onRaceComplete(results);
    }
  }
}
