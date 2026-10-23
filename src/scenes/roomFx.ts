import Phaser from 'phaser';
import { PALETTE, reducedMotion } from '../config';
import type { PatrolPoint } from '../game/types';

/** Room view bounds in canvas pixels (see ROOM_BLOCKOUT.md). */
export const ROOM_X = 0;
export const ROOM_Y = 40;
export const ROOM_W = 960;
export const ROOM_H = 464;


const WALK_MS = 1200;
const BOB_MS = 220;
const CHIME_DEPTH = 3;
const SHADE_DEPTH = 4;

interface Spot {
  /** Feet position. Farther patrol points sit higher and smaller. */
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

const SPOTS: Readonly<Record<PatrolPoint, Spot>> = {
  office: { x: 247, y: 221, scale: 2, alpha: 0.55 },
  corridor: { x: 677, y: 243, scale: 3, alpha: 0.8 },
  'lift-lobby': { x: 886, y: 266, scale: 4, alpha: 1 },
};

type Body = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

/** Walk frame texture: chime-0/chime-1 when both exist, else a single 'chime' sprite, else none. */
function chimeKey(scene: Phaser.Scene, frame: number): string | null {
  if (scene.textures.exists(`chime-${frame}`)) return `chime-${frame}`;
  if (scene.textures.exists('chime-0')) return 'chime-0';
  return scene.textures.exists('chime') ? 'chime' : null;
}

/** Chime in the room: walks between patrol spots with a two-frame bob. */
export class ChimeSprite {
  private readonly body: Body;
  private readonly scene: Phaser.Scene;
  /** Spot scales are tuned for 16x28 art; larger sprites (Ishaan's 64px Chime) scale down to match. */
  private readonly unit: number;
  private frame = 0;
  private bob?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, point: PatrolPoint) {
    this.scene = scene;
    const spot = SPOTS[point];
    const key = chimeKey(scene, 0);
    this.unit = key && scene.textures.get(key).getSourceImage().height > 40 ? 0.5 : 1;
    if (key) {
      this.body = scene.add.image(spot.x, spot.y, key);
    } else {
      this.body = scene.add.rectangle(spot.x, spot.y, 16, 28, 0xb08d3c).setStrokeStyle(1, PALETTE.ink);
    }
    this.body.setOrigin(0.5, 1).setScale(spot.scale * this.unit).setAlpha(spot.alpha).setDepth(CHIME_DEPTH);
  }

  moveTo(point: PatrolPoint): void {
    const spot = SPOTS[point];
    if (reducedMotion()) {
      this.body.setPosition(spot.x, spot.y).setScale(spot.scale * this.unit).setAlpha(spot.alpha);
      return;
    }
    this.startBob();
    this.scene.tweens.add({
      targets: this.body,
      x: spot.x,
      y: spot.y,
      scale: spot.scale * this.unit,
      alpha: spot.alpha,
      duration: WALK_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.stopBob(),
    });
  }

  private startBob(): void {
    this.bob?.remove();
    this.bob = this.scene.time.addEvent({
      delay: BOB_MS,
      loop: true,
      callback: () => {
        this.frame = this.frame === 0 ? 1 : 0;
        const key = chimeKey(this.scene, this.frame);
        if (this.body instanceof Phaser.GameObjects.Image && key) this.body.setTexture(key);
      },
    });
  }

  private stopBob(): void {
    this.bob?.remove();
    this.bob = undefined;
    this.frame = 0;
    const key = chimeKey(this.scene, 0);
    if (this.body instanceof Phaser.GameObjects.Image && key) this.body.setTexture(key);
  }
}

const VIGNETTE_KEY = 'room-vignette';
const DUST_KEY = 'room-dust';
/** Darkness and red vignette per Chime step (0 = office, 1 = corridor, 2 = lobby, 3 = caught). */
const DIM_BY_STEP = [0, 0.12, 0.24, 0.32];
const VIGNETTE_BY_STEP = [0, 0.35, 0.6, 0.8];

/** Lamp flicker, stage dimming, red vignette and floating dust over the room view. */
export class Atmosphere {
  private readonly scene: Phaser.Scene;
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly flicker: Phaser.GameObjects.Rectangle;
  private readonly vignette: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.shade = scene.add.rectangle(ROOM_X, ROOM_Y, ROOM_W, ROOM_H, 0x000000, 0).setOrigin(0).setDepth(SHADE_DEPTH);
    this.flicker = scene.add.rectangle(ROOM_X, ROOM_Y, ROOM_W, ROOM_H, 0x000000, 0).setOrigin(0).setDepth(SHADE_DEPTH);
    this.makeVignetteTexture();
    this.vignette = scene.add.image(ROOM_X, ROOM_Y, VIGNETTE_KEY).setOrigin(0).setDepth(SHADE_DEPTH).setAlpha(0);
    if (!reducedMotion()) {
      this.startFlicker();
      this.startDust();
    }
  }

  setStage(step: number): void {
    const i = Math.min(step, DIM_BY_STEP.length - 1);
    const duration = reducedMotion() ? 0 : 600;
    this.scene.tweens.add({ targets: this.shade, alpha: DIM_BY_STEP[i], duration });
    this.scene.tweens.add({ targets: this.vignette, alpha: VIGNETTE_BY_STEP[i], duration });
  }

  private makeVignetteTexture(): void {
    if (this.scene.textures.exists(VIGNETTE_KEY)) return;
    const tex = this.scene.textures.createCanvas(VIGNETTE_KEY, ROOM_W, ROOM_H);
    const ctx = tex?.getContext();
    if (!tex || !ctx) return;
    const gradient = ctx.createRadialGradient(ROOM_W / 2, ROOM_H / 2, 120, ROOM_W / 2, ROOM_H / 2, 400);
    gradient.addColorStop(0, 'rgba(120, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(120, 0, 0, 0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    tex.refresh();
  }

  /** One short dip about once a second at most, well under three flashes per second. */
  private startFlicker(): void {
    this.scene.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        this.scene.tweens.add({
          targets: this.flicker,
          alpha: 0.05 + Math.random() * 0.05,
          duration: 90,
          yoyo: true,
        });
      },
    });
  }

  private startDust(): void {
    if (!this.scene.textures.exists(DUST_KEY)) {
      const g = this.scene.make.graphics({}, false);
      g.fillStyle(PALETTE.paper, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture(DUST_KEY, 2, 2);
      g.destroy();
    }
    this.scene.add.particles(0, 0, DUST_KEY, {
      x: { min: ROOM_X, max: ROOM_X + ROOM_W },
      y: { min: ROOM_Y + 40, max: ROOM_Y + ROOM_H },
      lifespan: 7000,
      speedX: { min: -6, max: 6 },
      speedY: { min: -8, max: -2 },
      alpha: { start: 0.35, end: 0 },
      frequency: 450,
      quantity: 1,
    }).setDepth(2);
  }
}

/**
 * The lift is the brass-doored alcove painted into room-bg (art x 132-166, y 24-71; room-bg is stretched to the 960x464 room, so 5.65x wide and 3.9x tall).
 * The doors are two panels, a seam apart, so the overlay matches them panel for panel.
 */
const LIFT_DOORS = { x: 841, y: 225, w: 192, h: 183 };
const DOOR_BRASS = 0x5c4828;
const DOOR_SHINE = 0x78603a;

function doorPanel(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number): Phaser.GameObjects.Container {
  const panel = scene.add.rectangle(0, 0, w, h, DOOR_BRASS).setStrokeStyle(2, PALETTE.ink);
  const shineA = scene.add.rectangle(-w * 0.2, 0, 4, h - 24, DOOR_SHINE);
  const shineB = scene.add.rectangle(w * 0.2, 0, 4, h - 24, DOOR_SHINE);
  return scene.add.container(cx, cy, [panel, shineA, shineB]).setDepth(9);
}

/**
 * Win moment: warm light fills the alcove, the two doors slide apart into the frame, and a pool of
 * light spills onto the floor, then onDone. One slow fade, never a flash. Reduced motion jumps to the
 * open state.
 */
export function openLiftDoors(scene: Phaser.Scene, onDone: () => void): void {
  const { x, y, w, h } = LIFT_DOORS;
  const half = w / 2 - 2;
  const calm = reducedMotion();

  const interior = scene.add.rectangle(x, y, w, h, 0xf2d58f).setDepth(8).setAlpha(calm ? 1 : 0);
  // inner glow: a brighter core inside the lit alcove
  const core = scene.add.rectangle(x, y, w * 0.5, h * 0.85, 0xfff4d8).setDepth(8).setAlpha(calm ? 0.8 : 0);
  const spill = scene.add.rectangle(x, y + h / 2 + 26, w * 0.9, 44, PALETTE.lamp).setDepth(7).setAlpha(calm ? 0.28 : 0);
  const left = doorPanel(scene, x - half / 2 - 1, y, half, h);
  const right = doorPanel(scene, x + half / 2 + 1, y, half, h);

  if (calm) {
    left.setVisible(false);
    right.setVisible(false);
    scene.time.delayedCall(500, onDone);
    return;
  }

  scene.tweens.add({ targets: [interior, core], alpha: { from: 0, to: 1 }, duration: 350 });
  scene.tweens.add({ targets: spill, alpha: 0.28, duration: 900, delay: 500 });
  // each panel slips behind its own frame edge: it slides outward while squeezing flat
  scene.tweens.add({ targets: left, x: x - w / 2 - 4, scaleX: 0.08, duration: 900, delay: 350, ease: 'Cubic.easeInOut' });
  scene.tweens.add({ targets: right, x: x + w / 2 + 4, scaleX: 0.08, duration: 900, delay: 350, ease: 'Cubic.easeInOut' });
  scene.time.delayedCall(2200, onDone);
}
