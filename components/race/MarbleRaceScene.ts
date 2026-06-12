// MarbleRaceScene.ts — Phaser.Scene for Marble Rush (2D marble run)
// Client-only: import via the dynamically-loaded MarbleRaceGame wrapper.

import Phaser from 'phaser';
import type { Entrant, FinishResult, MarblePosition, SceneData, TrackDifficulty, TrackObstacle } from '@/lib/types';
import { MARBLE_RADIUS, TRACK_WIDTH, TRACK_HEIGHT, FINISH_LINE_Y } from '@/lib/constants';
import { generateTrack, CHUTE_LEFT, CHUTE_RIGHT } from './TrackGenerator';

// Marbles can free-fall far between obstacles; cap speed so a body never
// moves further than a thin wall's thickness in one step (no tunneling).
const MAX_SPEED = 25;

interface MarbleData {
  entrant: Entrant;
  body: MatterJS.BodyType;
  label: Phaser.GameObjects.Text;
  imageObj: Phaser.GameObjects.Image | null;
  finishTimeMs: number | null;
  finished: boolean;
}

interface SpinnerData {
  body: MatterJS.BodyType;
  visual: Phaser.GameObjects.Rectangle;
  speed: number; // rad/s
}

export class MarbleRaceScene extends Phaser.Scene {
  private marbles: MarbleData[] = [];
  private gateBody: MatterJS.BodyType | null = null;
  private gateVisual: Phaser.GameObjects.Graphics | null = null;
  private spinners: SpinnerData[] = [];
  private raceActive = false;
  private sceneReady = false;
  private pendingOpen = false;
  private finishedCount = 0;
  private elapsedMs = 0;
  private positionUpdateTimer = 0;
  private nudgeTimer = 0;
  private completionCalled = false;
  private trackedEntrantId: string | null = null;
  private firstFinishAtMs: number | null = null;
  private bestProgressY = 0;
  private bestProgressAtMs = 0;

  // Passed via scene data
  private entrants: Entrant[] = [];
  private trackDifficulty: TrackDifficulty = 'normal';
  private trackSeed = '';
  private speedMultiplier = 1.0;
  private raceTimeoutMs = 300000;
  private onRaceComplete: ((results: FinishResult[]) => void) | null = null;
  private onPositionUpdate: ((positions: MarblePosition[]) => void) | null = null;

  constructor() {
    super({ key: 'MarbleRaceScene' });
  }

  init(data: SceneData) {
    this.entrants = data.entrants ?? [];
    this.trackDifficulty = data.trackDifficulty ?? 'normal';
    this.trackSeed = data.trackSeed ?? '';
    this.speedMultiplier = data.speedMultiplier ?? 1.0;
    this.raceTimeoutMs = (data.raceTimeoutSeconds ?? 300) * 1000;
    this.onRaceComplete = data.onRaceComplete ?? null;
    this.onPositionUpdate = data.onPositionUpdate ?? null;
  }

  preload() {
    // Request cross-origin images with CORS so drawing them to a canvas
    // doesn't taint it (Supabase storage sends Access-Control-Allow-Origin: *)
    this.load.crossOrigin = 'anonymous';
    for (const entrant of this.entrants) {
      if (entrant.marbleTextureUrl) {
        this.load.image(`marble-img-${entrant.id}`, entrant.marbleTextureUrl);
      }
    }
  }

  create() {
    this.matter.world.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    this.matter.world.setGravity(0, 2.2 * this.speedMultiplier);

    this.drawBackground();

    const track = generateTrack(this.trackSeed, this.trackDifficulty);
    for (const obs of [track.wallLeft, track.wallRight, track.floorBottom]) {
      this.matter.add.rectangle(obs.x, obs.y, obs.width!, obs.height!, {
        isStatic: true, restitution: 0.2, friction: 0.5, label: 'wall',
      });
    }
    for (const obs of track.obstacles) this.buildObstacle(obs);

    this.drawFinishLine();
    this.spawnMarbles();

    // Speed pads: sensors that shove marbles down the track
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const marble = bodyA.label === 'marble' ? bodyA : bodyB.label === 'marble' ? bodyB : null;
        const pad = bodyA.label === 'speedpad' ? bodyA : bodyB.label === 'speedpad' ? bodyB : null;
        if (marble && pad) {
          this.matter.applyForce(marble, { x: 0, y: 0.02 * this.speedMultiplier });
        }
      }
    });

    this.cameras.main.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    this.cameras.main.scrollY = 0;

    this.sceneReady = true;
    if (this.pendingOpen) this.openGate();
  }

  private buildObstacle(obs: TrackObstacle) {
    const w = obs.width ?? 20;
    const h = obs.height ?? 18;
    const angle = obs.angle ?? 0;

    switch (obs.type) {
      case 'gate': {
        this.gateVisual = this.add.graphics();
        this.gateVisual.fillStyle(0x4a1a8e, 1);
        this.gateVisual.fillRect(obs.x - w / 2, obs.y - h / 2, w, h);
        this.gateBody = this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true, restitution: 0.2, friction: 0.5, label: 'gate',
        }) as MatterJS.BodyType;
        break;
      }
      case 'peg': {
        const r = obs.radius ?? 12;
        const g = this.add.graphics();
        g.fillStyle(0x3a3a6e, 1);
        g.fillCircle(obs.x, obs.y, r);
        g.lineStyle(2, 0x5a5aae, 0.8);
        g.strokeCircle(obs.x, obs.y, r);
        this.matter.add.circle(obs.x, obs.y, r, {
          isStatic: true, restitution: 0.65, friction: 0.1, label: 'peg',
        });
        break;
      }
      case 'bumper': {
        const r = obs.radius ?? 22;
        const colors = [0xffd700, 0xff6b6b, 0x00ffff, 0xff9900, 0x00ff88];
        const color = colors[Math.floor((obs.x + obs.y) % colors.length)];
        const g = this.add.graphics();
        g.fillStyle(color, 0.9);
        g.fillCircle(obs.x, obs.y, r);
        g.lineStyle(3, 0xffffff, 0.5);
        g.strokeCircle(obs.x, obs.y, r);
        this.matter.add.circle(obs.x, obs.y, r, {
          isStatic: true, restitution: 0.95, friction: 0.05, label: 'bumper',
        });
        break;
      }
      case 'speedpad': {
        const g = this.add.graphics();
        g.fillStyle(0x00ff88, 0.55);
        g.fillRect(obs.x - w / 2, obs.y - h / 2, w, h);
        g.lineStyle(2, 0x00ff88, 1);
        g.strokeRect(obs.x - w / 2, obs.y - h / 2, w, h);
        // Downward chevrons — pads boost toward the finish
        g.fillStyle(0xccffee, 1);
        g.fillTriangle(obs.x, obs.y + 16, obs.x - 9, obs.y + 4, obs.x + 9, obs.y + 4);
        this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true, isSensor: true, label: 'speedpad',
        });
        break;
      }
      case 'spinner': {
        const visual = this.add.rectangle(obs.x, obs.y, w, h, 0xff9900);
        visual.setStrokeStyle(2, 0xffcc66, 0.9);
        const body = this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true, restitution: 0.6, friction: 0.05, label: 'spinner',
        }) as MatterJS.BodyType;
        // Hub visual
        const hub = this.add.graphics();
        hub.fillStyle(0xffcc66, 1);
        hub.fillCircle(obs.x, obs.y, 6);
        this.spinners.push({ body, visual, speed: obs.spinSpeed ?? 2.0 });
        break;
      }
      case 'slingshot': {
        const g = this.add.graphics();
        g.save();
        g.translateCanvas(obs.x, obs.y);
        g.rotateCanvas(angle);
        g.fillStyle(0xff44aa, 0.9);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.restore();
        // Restitution > 1 adds energy on contact: the pinball "kick"
        this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true, angle, restitution: 1.15, friction: 0, label: 'slingshot',
        });
        break;
      }
      default: { // wall / ramp / funnel_wall
        const g = this.add.graphics();
        g.save();
        g.translateCanvas(obs.x, obs.y);
        g.rotateCanvas(angle);
        g.fillStyle(obs.type === 'funnel_wall' ? 0x2a2a5e : 0x1a1a4e, 1);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.restore();
        // Near-frictionless everywhere a marble can rest: tan(slope) must
        // exceed pair friction by a wide margin or Matter's contact solver
        // parks marbles mid-slope (verified empirically at tan=0.12 vs 0.08)
        this.matter.add.rectangle(obs.x, obs.y, w, h, {
          isStatic: true, angle,
          restitution: obs.type === 'ramp' ? 0.3 : 0.2,
          friction: obs.type === 'ramp' ? 0.05 : 0.01,
          label: obs.type,
        });
      }
    }
  }

  private drawBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060618, 0x060618, 0x0d1a35, 0x0d1a35, 1);
    bg.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    bg.fillStyle(0x1a1a4e, 1);
    bg.fillRect(0, 0, 20, TRACK_HEIGHT);
    bg.fillRect(TRACK_WIDTH - 20, 0, 20, TRACK_HEIGHT);
  }

  private drawFinishLine() {
    const squareSize = 20;
    const numSquares = Math.ceil(TRACK_WIDTH / squareSize);
    const g = this.add.graphics();
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < numSquares; i++) {
        const isWhite = (i + row) % 2 === 0;
        g.fillStyle(isWhite ? 0xffffff : 0x000000, 1);
        g.fillRect(i * squareSize, FINISH_LINE_Y + row * squareSize, squareSize, squareSize);
      }
    }
    const finishText = this.add.text(TRACK_WIDTH / 2, FINISH_LINE_Y - 30, '🏁 FINISH LINE 🏁', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    });
    finishText.setOrigin(0.5, 0.5);
    g.lineStyle(4, 0xffd700, 0.8);
    g.lineBetween(0, FINISH_LINE_Y - 2, TRACK_WIDTH, FINISH_LINE_Y - 2);
  }

  private hexToNum(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  private createMarbleTexture(entrant: Entrant): string {
    const key = `marble-${entrant.id}`;
    const size = MARBLE_RADIUS * 2;
    const rt = this.add.renderTexture(0, 0, size, size);
    rt.setVisible(false);

    const gfx = this.add.graphics();
    const color = this.hexToNum(entrant.colour);
    gfx.fillStyle(color, 1);
    gfx.fillCircle(size / 2, size / 2, MARBLE_RADIUS);
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillCircle(size / 2 + 3, size / 2 + 4, MARBLE_RADIUS * 0.7);
    gfx.fillStyle(0xffffff, 0.45);
    gfx.fillEllipse(size / 2 - MARBLE_RADIUS * 0.28, size / 2 - MARBLE_RADIUS * 0.28, MARBLE_RADIUS * 0.6, MARBLE_RADIUS * 0.4);
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
      return this.createMarbleTexture(entrant);
    }

    // Draw the photo through a circular canvas clip. (A GeometryMask
    // can't be used here: it applies in camera space, not RenderTexture
    // space, and clipped marbles rendered as partial wedges.)
    const canvasTex = this.textures.createCanvas(key, size, size);
    if (!canvasTex) return this.createMarbleTexture(entrant);
    const ctx = canvasTex.getContext();
    const src = this.textures.get(imgKey).getSourceImage() as CanvasImageSource & { width: number; height: number };

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, MARBLE_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    // cover-fit: crop the shorter axis so the photo fills the circle
    const s = Math.min(src.width, src.height);
    ctx.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, size, size);

    // Sphere shading: darker lower-right, glossy highlight upper-left
    const shade = ctx.createRadialGradient(size * 0.62, size * 0.7, size * 0.1, size / 2, size / 2, size * 0.6);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(size / 2 - MARBLE_RADIUS * 0.3, size / 2 - MARBLE_RADIUS * 0.35, MARBLE_RADIUS * 0.32, MARBLE_RADIUS * 0.2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    try {
      canvasTex.refresh();
    } catch {
      // canvas tainted (image served without CORS) — fall back to colour
      this.textures.remove(key);
      return this.createMarbleTexture(entrant);
    }
    return key;
  }

  private spawnMarbles() {
    if (this.entrants.length === 0) return;

    // Grid of slots INSIDE the chute walls so every marble starts behind
    // the gate. Slots are shuffled for a fair (random) start.
    const margin = MARBLE_RADIUS + 4;
    const lo = CHUTE_LEFT + margin;
    const hi = CHUTE_RIGHT - margin;
    const cols = Math.floor((hi - lo) / (MARBLE_RADIUS * 2 + 10)) || 1;
    const colStep = cols > 1 ? (hi - lo) / (cols - 1) : 0;
    const slots: { x: number; y: number }[] = [];
    for (let i = 0; i < this.entrants.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      slots.push({ x: cols > 1 ? lo + col * colStep : (lo + hi) / 2, y: 60 + row * (MARBLE_RADIUS * 2 + 8) });
    }
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    for (let i = 0; i < this.entrants.length; i++) {
      const entrant = this.entrants[i];
      const { x: spawnX, y: spawnY } = slots[i];

      const textureKey = entrant.marbleTextureUrl
        ? this.createMarbleFromImage(entrant)
        : this.createMarbleTexture(entrant);

      const body = this.matter.add.circle(spawnX, spawnY, MARBLE_RADIUS, {
        restitution: 0.4,
        friction: 0.25,
        frictionStatic: 0, // never stick to a slope
        frictionAir: 0.008, // sets rolling/terminal speed; the maze pace lives here
        density: 0.002,
        label: 'marble',
      }) as MatterJS.BodyType;

      const img = this.add.image(spawnX, spawnY, textureKey);
      img.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);

      const label = this.add.text(spawnX, spawnY - MARBLE_RADIUS - 18, entrant.displayName, {
        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3, resolution: 2,
      });
      label.setOrigin(0.5, 0.5);

      this.marbles.push({ entrant, body, label, imageObj: img, finishTimeMs: null, finished: false });
    }
  }

  /** Release the marbles. Safe to call before create() has run. */
  openGate() {
    if (!this.sceneReady) {
      this.pendingOpen = true;
      return;
    }
    if (this.gateBody) {
      this.matter.world.remove(this.gateBody);
      this.gateBody = null;
    }
    this.gateVisual?.destroy();
    this.gateVisual = null;
    if (!this.raceActive) {
      this.raceActive = true;
      this.elapsedMs = 0;
      this.bestProgressY = 0;
      this.bestProgressAtMs = 0;
    }
  }

  /** Camera follows this entrant (null = follow the leader). */
  setTracked(entrantId: string | null) {
    this.trackedEntrantId = entrantId;
  }

  update(_time: number, delta: number) {
    // Spinners turn even before the gate opens — the track feels alive
    for (const s of this.spinners) {
      const a = s.body.angle + s.speed * (delta / 1000);
      this.matter.body.setAngle(s.body, a);
      s.visual.setRotation(a);
    }

    // Visuals always follow bodies (marbles settle in the chute pre-race)
    for (const marble of this.marbles) {
      if (marble.finished) continue;
      const { x: bx, y: by } = marble.body.position;
      marble.imageObj?.setPosition(bx, by);
      marble.imageObj?.setRotation(marble.body.angle);
      marble.label.setPosition(bx, by - MARBLE_RADIUS - 18);
    }

    if (!this.raceActive) return;

    this.elapsedMs += delta;
    this.positionUpdateTimer += delta;
    this.nudgeTimer += delta;
    const doNudge = this.nudgeTimer >= 500;
    if (doNudge) this.nudgeTimer = 0;

    let leaderY = 0;
    for (const marble of this.marbles) {
      if (marble.finished) continue;
      const body = marble.body;
      const by = body.position.y;
      if (by > leaderY) leaderY = by;

      // Velocity clamp: prevents tunneling through thin walls
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > MAX_SPEED) {
        const k = MAX_SPEED / speed;
        this.matter.body.setVelocity(body, { x: body.velocity.x * k, y: body.velocity.y * k });
      }

      // Random micro-forces for fairness + a stronger kick for marbles
      // that have stalled (pile arches, shallow ledges)
      if (doNudge) {
        const stalled = speed < 1.0;
        const mag = stalled ? 0.009 : 0.0015;
        this.matter.applyForce(body, { x: (Math.random() - 0.5) * 2 * mag, y: 0 });
      }

      if (by >= FINISH_LINE_Y) {
        marble.finished = true;
        marble.finishTimeMs = Math.round(this.elapsedMs);
        this.finishedCount++;
        if (this.firstFinishAtMs === null) this.firstFinishAtMs = this.elapsedMs;

        // Park below the finish as a non-colliding trophy row
        this.matter.body.setStatic(body, true);
        body.isSensor = true;
        const col = (this.finishedCount - 1) % 14;
        const row = Math.floor((this.finishedCount - 1) / 14);
        const px = 40 + col * 55;
        const py = FINISH_LINE_Y + 90 + row * 44;
        this.matter.body.setPosition(body, { x: px, y: py });
        marble.imageObj?.setPosition(px, py);
        marble.label.setPosition(px, py - MARBLE_RADIUS - 14);

        // A finish is progress: reset the stall watchdog so the bar set by
        // the finisher's final y doesn't strand the trailing pack
        this.bestProgressY = 0;
        this.bestProgressAtMs = this.elapsedMs;

        if (this.finishedCount >= this.marbles.length) {
          this.endRace('all-finished');
          return;
        }
      }
    }

    // Camera: tracked marble takes priority, otherwise the leader
    let camY = leaderY;
    if (this.trackedEntrantId) {
      const tracked = this.marbles.find((m) => m.entrant.id === this.trackedEntrantId);
      if (tracked && !tracked.finished) camY = tracked.body.position.y;
    }
    if (camY > 0) {
      this.cameras.main.scrollY = Phaser.Math.Linear(
        this.cameras.main.scrollY,
        Math.max(0, camY - 280),
        0.08
      );
    }

    if (this.positionUpdateTimer >= 200 && this.onPositionUpdate) {
      this.positionUpdateTimer = 0;
      const positions: MarblePosition[] = this.marbles.map((m) => ({
        entrantId: m.entrant.id,
        x: m.body.position.x,
        y: m.finished ? FINISH_LINE_Y + TRACK_HEIGHT : m.body.position.y,
        angle: m.body.angle,
      }));
      this.onPositionUpdate(positions);
    }

    // End conditions: grace window after the winner, global stall, timeout
    if (this.firstFinishAtMs !== null && this.elapsedMs - this.firstFinishAtMs >= 20000) {
      this.endRace('grace-window');
      return;
    }
    // Threshold must beat slow nudge-creep, or a stuck pack inching along
    // a wall refreshes the watchdog forever
    if (leaderY > this.bestProgressY + 12) {
      this.bestProgressY = leaderY;
      this.bestProgressAtMs = this.elapsedMs;
    } else if (this.elapsedMs - this.bestProgressAtMs > 15000) {
      this.endRace('stall-watchdog');
      return;
    }
    if (this.elapsedMs >= this.raceTimeoutMs) this.endRace('timeout');
  }

  private endRace(reason: string) {
    if (this.completionCalled) return;
    this.completionCalled = true;
    this.raceActive = false;
    // eslint-disable-next-line no-console
    console.log(`[race] ended: ${reason} at ${Math.round(this.elapsedMs)}ms, finished ${this.finishedCount}/${this.marbles.length}`);

    const finished = this.marbles
      .filter((m) => m.finished)
      .sort((a, b) => (a.finishTimeMs ?? 0) - (b.finishTimeMs ?? 0));
    const unfinished = this.marbles
      .filter((m) => !m.finished)
      .sort((a, b) => b.body.position.y - a.body.position.y);

    const results: FinishResult[] = [...finished, ...unfinished].map((m, idx) => ({
      entrantId: m.entrant.id,
      displayName: m.entrant.displayName,
      position: idx + 1,
      finishTimeMs: m.finishTimeMs ?? 0,
      didFinish: m.finished,
    }));

    this.onRaceComplete?.(results);
  }
}
