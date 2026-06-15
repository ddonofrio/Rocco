import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../engine/video/action-menu';
import {
  roccoDefaultKeysSoundUrl,
  roccoDefaultYouLoseSoundUrl,
} from '../../rocco-default-assets';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_KEYS_X,
  DEFAULT_KEYS_Y,
  DEFAULT_KEYS_PRESENTATION_PITCH_DEGREES,
  DEFAULT_KEYS_RENDER_LAYER,
  DEFAULT_KEYS_SPRITE_DEFINITION_ID,
  DEFAULT_KEYS_SPRITE_INSTANCE_ID,
  DEFAULT_KEYS_SPRITE_SCALE,
  DEFAULT_KEYS_Z_INDEX,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_PICK_UP_ACTION_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
} from '../../rocco-default-constants';
import {
  createDefaultKeysActionMenu,
  createDefaultKeysSpriteDefinition,
  KEYS_ACTION_MENU_ID,
  KEYS_GRAB_ACTION_ID,
} from './pier-keys-definition';

const KEYS_APPROACH_KEEP_DISTANCE = 0;
const KEYS_SIDE_APPROACH_RATIO = 0.85;
const KEYS_SHAKE_DURATION_MS = 420;
const KEYS_SHAKE_AMPLITUDE = 4;
const KEYS_FALL_SPEED = 430;
const KEYS_COLLECT_DURATION_MS = 780;
const KEYS_COLLECT_ARC_HEIGHT = 76;
const KEYS_COLLECT_SCALE_BOOST = 0.38;
const KEYS_DEFEAT_FADE_PRIMITIVE_ID = 'rocco-keys-defeat-fade';
const KEYS_DEFEAT_TITLE_ID = 'rocco-keys-defeat-title';
const KEYS_SOUND_ID = 'rocco-keys-sound';
const KEYS_SOUND_VOLUME = 0.3;
const KEYS_DEFEAT_SOUND_ID = 'rocco-keys-defeat-sound';
const KEYS_DEFEAT_SOUND_VOLUME = 0.25;
const KEYS_DEFEAT_MESSAGE_TTL_MS = 6400;
const KEYS_DEFEAT_FADE_DURATION_MS = 1300;
const KEYS_DEFEAT_TITLE_DURATION_MS = 3600;

export interface RoccoDefaultKeysController {
  update(deltaMs: number): void;
  handleAction(activation: RoccoActionMenuActivation): void;
  revealAt(x: number, y: number): void;
  isRevealed(): boolean;
  cancel(): void;
}

export type RoccoDefaultKeysStateStatus = 'hidden' | 'revealed' | 'collected';

export interface RoccoDefaultKeysState {
  status: RoccoDefaultKeysStateStatus;
  x?: number;
  y?: number;
}

export interface RoccoDefaultKeysControllerOptions {
  localization?: RoccoLocalization;
  initialState?: RoccoDefaultKeysState;
  onCollected?: () => void;
  onRestartRequested?: () => void;
}

type KeysGrabMode = 'side-hit' | 'rear-collect';
type KeysControllerState =
  | 'hidden'
  | 'revealed'
  | 'approaching-grab'
  | 'side-shake'
  | 'falling-out'
  | 'defeat-speaking'
  | 'defeat-fading'
  | 'defeat-title'
  | 'restarting'
  | 'collecting'
  | 'gone'
  | 'collected';

class RoccoKeysController implements RoccoDefaultKeysController {
  private readonly engine: RoccoEngine;
  private readonly localization: RoccoLocalization;
  private readonly onCollected: (() => void) | undefined;
  private readonly onRestartRequested: (() => void) | undefined;
  private state: KeysControllerState = 'hidden';
  private grabMode: KeysGrabMode = 'side-hit';
  private elapsedMs = 0;
  private keysX = 0;
  private keysY = 0;
  private roccoBaseX = 0;
  private roccoBaseY = 0;
  private revealed = false;
  private lastDefeatLineIndex: number | null = null;

  constructor(engine: RoccoEngine, options?: RoccoDefaultKeysControllerOptions) {
    this.engine = engine;
    this.localization = options?.localization ?? createRoccoLocalization();
    this.onCollected = options?.onCollected;
    this.onRestartRequested = options?.onRestartRequested;
    this.restoreState(options?.initialState ?? { status: 'hidden' });
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.state === 'approaching-grab') {
      this.updateApproach();
      return;
    }

    if (this.state === 'side-shake') {
      this.updateSideShake(deltaMs);
      return;
    }

    if (this.state === 'falling-out') {
      this.updateFallingOut(deltaMs);
      return;
    }

    if (this.state === 'defeat-speaking') {
      this.updateDefeatSpeaking(deltaMs);
      return;
    }

    if (this.state === 'defeat-fading') {
      this.updateDefeatFading(deltaMs);
      return;
    }

    if (this.state === 'defeat-title') {
      this.updateDefeatTitle(deltaMs);
      return;
    }

    if (this.state === 'collecting') {
      this.updateCollecting(deltaMs);
    }
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (
      activation.targetInstanceId !== DEFAULT_KEYS_SPRITE_INSTANCE_ID ||
      activation.actionId !== KEYS_GRAB_ACTION_ID ||
      this.state !== 'revealed'
    ) {
      return;
    }

    // Block input immediately to prevent interruption during sequence
    this.engine.setInputEnabled(false);

    // If Rocco is already moving (from the menu click), wait for him to arrive
    // Otherwise, start the approach
    if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      this.state = 'approaching-grab';
      const keys = this.engine.video.sprites.getSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
      if (keys) {
        this.keysX = keys.transform.x;
        this.keysY = keys.transform.y;
        const rocco = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
        if (rocco) {
          this.grabMode = this.resolveGrabMode(rocco.transform.x, rocco.transform.y);
        }
      }
      this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
      this.engine.video.render(0);
    } else {
      this.startGrabApproach();
    }
  }

  revealAt(x: number, y: number): void {
    if (this.revealed) {
      return;
    }

    this.revealed = true;
    this.state = 'revealed';
    this.keysX = x;
    this.keysY = y;
    this.engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(DEFAULT_KEYS_SPRITE_DEFINITION_ID, {
      id: DEFAULT_KEYS_SPRITE_INSTANCE_ID,
      transform: {
        x,
        y,
        scaleX: DEFAULT_KEYS_SPRITE_SCALE,
        scaleY: DEFAULT_KEYS_SPRITE_SCALE,
        rotation: 0,
        presentation: {
          pitchDegrees: DEFAULT_KEYS_PRESENTATION_PITCH_DEGREES,
        },
      },
      renderLayer: DEFAULT_KEYS_RENDER_LAYER,
      zIndex: DEFAULT_KEYS_Z_INDEX,
      depthMode: 'fixed',
      opacity: 1,
      interactive: true,
      collisionEnabled: true,
    });
    this.engine.video.actionMenus.registerMenu(createDefaultKeysActionMenu(this.localization));
    this.engine.video.render(0);
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  private restoreState(state: RoccoDefaultKeysState): void {
    if (state.status === 'revealed') {
      this.revealAt(state.x ?? DEFAULT_KEYS_X, state.y ?? DEFAULT_KEYS_Y);
      return;
    }

    if (state.status === 'collected') {
      this.state = 'collected';
      this.revealed = false;
      this.engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
      this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
      this.engine.video.render(0);
    }
  }

  private startGrabApproach(): void {
    const rocco = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const keys = this.engine.video.sprites.getSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
    if (!rocco || !keys) {
      this.engine.setInputEnabled(true);
      return;
    }

    this.keysX = keys.transform.x;
    this.keysY = keys.transform.y;
    this.grabMode = this.resolveGrabMode(rocco.transform.x, rocco.transform.y);
    this.state = 'approaching-grab';
    this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
    this.engine.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, this.keysX, this.keysY, {
      targetInstanceId: DEFAULT_KEYS_SPRITE_INSTANCE_ID,
      keepDistance: KEYS_APPROACH_KEEP_DISTANCE,
      action: DEFAULT_SPRITE_RUN_ACTION_ID,
      idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
      stopDistance: 1,
      faceTargetOnComplete: true,
      idleSettleDelayMs: 0,
      idleSettleFacing: 'diagonal-from-facing',
    });
    this.engine.video.render(0);
  }

  private updateApproach(): void {
    if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    const rocco = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const keys = this.engine.video.sprites.getSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
    if (!rocco || !keys) {
      this.state = 'gone';
      return;
    }

    this.roccoBaseX = rocco.transform.x;
    this.roccoBaseY = rocco.transform.y;
    this.keysX = keys.transform.x;
    this.keysY = keys.transform.y;
    this.snapRoccoToKeysGround(rocco.transform.scaleX, rocco.transform.scaleY);
    if (this.grabMode === 'side-hit') {
      this.startSideShake();
      return;
    }

    this.startCollecting();
  }

  private startSideShake(): void {
    this.elapsedMs = 0;
    this.state = 'side-shake';
    this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_PICK_UP_ACTION_ID,
      {
        direction: 'down',
        restart: true,
      },
    );
    this.engine.video.render(0);
  }

  private updateSideShake(deltaMs: number): void {
    this.elapsedMs = Math.min(KEYS_SHAKE_DURATION_MS, this.elapsedMs + deltaMs);
    const shake = Math.sin(this.elapsedMs * 0.18) * KEYS_SHAKE_AMPLITUDE;
    this.engine.video.sprites.setPosition(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.roccoBaseX + shake,
      this.roccoBaseY,
    );
    this.engine.video.sprites.setPosition(
      DEFAULT_KEYS_SPRITE_INSTANCE_ID,
      this.keysX - shake * 0.8,
      this.keysY,
    );
    this.engine.video.render(0);

    if (this.elapsedMs >= KEYS_SHAKE_DURATION_MS) {
      this.engine.video.sprites.setPosition(
        DEFAULT_SPRITE_INSTANCE_ID,
        this.roccoBaseX,
        this.roccoBaseY,
      );
      this.engine.video.render(0);
      this.state = 'falling-out';
      this.elapsedMs = 0;
      this.playKeysSound();
      this.engine.setInputEnabled(true);
    }
  }

  private updateFallingOut(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.keysY += KEYS_FALL_SPEED * (deltaMs / 1000);
    this.engine.video.sprites.setPosition(DEFAULT_KEYS_SPRITE_INSTANCE_ID, this.keysX, this.keysY);
    this.engine.video.render(0);
    if (this.keysY > DEFAULT_DESIGN_HEIGHT + 80) {
      this.engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
      this.engine.video.render(0);
      this.revealed = false;
      this.startDefeatSpeaking();
      // Input stays disabled during defeat sequence - will be re-enabled in updateDefeatTitle
    }
  }

  private startCollecting(): void {
    this.elapsedMs = 0;
    this.state = 'collecting';
    this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
    this.engine.video.sprites.setPresentationTransform(DEFAULT_KEYS_SPRITE_INSTANCE_ID, {
      pitchDegrees: 0,
      yawDegrees: 0,
    });
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction: 'down',
        restart: true,
      },
    );
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_PICK_UP_ACTION_ID,
      {
        direction: 'down',
        restart: true,
      },
    );
    this.engine.video.render(0);
    this.playKeysSound();
  }

  private updateCollecting(deltaMs: number): void {
    const rocco = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!rocco) {
      return;
    }

    this.elapsedMs = Math.min(KEYS_COLLECT_DURATION_MS, this.elapsedMs + deltaMs);
    const progress = this.elapsedMs / KEYS_COLLECT_DURATION_MS;
    const targetX = rocco.transform.x + 52;
    const targetY = rocco.transform.y + 150;
    const x = this.keysX + (targetX - this.keysX) * progress;
    const y =
      this.keysY +
      (targetY - this.keysY) * progress -
      Math.sin(progress * Math.PI) * KEYS_COLLECT_ARC_HEIGHT;
    const scale =
      DEFAULT_KEYS_SPRITE_SCALE * (1 + Math.sin(progress * Math.PI) * KEYS_COLLECT_SCALE_BOOST);

    this.engine.video.sprites.setPosition(DEFAULT_KEYS_SPRITE_INSTANCE_ID, x, y);
    this.engine.video.sprites.setScale(DEFAULT_KEYS_SPRITE_INSTANCE_ID, scale, scale);
    this.engine.video.render(0);
    if (this.elapsedMs >= KEYS_COLLECT_DURATION_MS) {
      this.engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
      this.engine.video.sprites.playAction(
        DEFAULT_SPRITE_INSTANCE_ID,
        DEFAULT_SPRITE_IDLE_ACTION_ID,
        {
          direction: 'down',
          restart: true,
        },
      );
      this.engine.video.render(0);
      this.state = 'collected';
      this.revealed = false;
      this.onCollected?.();
      this.engine.setInputEnabled(true);
    }
  }

  private snapRoccoToKeysGround(scaleX: number, scaleY: number): void {
    this.roccoBaseX = this.keysX - DEFAULT_SPRITE_GROUND_ANCHOR_X * scaleX;
    this.roccoBaseY = this.keysY - DEFAULT_SPRITE_GROUND_ANCHOR_Y * scaleY;
    this.engine.video.sprites.setPosition(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.roccoBaseX,
      this.roccoBaseY,
    );
    this.engine.video.render(0);
  }

  private startDefeatSpeaking(): void {
    this.elapsedMs = 0;
    this.state = 'defeat-speaking';
    this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
    this.engine.video.messages.say(DEFAULT_SPRITE_INSTANCE_ID, this.pickDefeatLine(), {
      ttlMs: KEYS_DEFEAT_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);
  }

  private updateDefeatSpeaking(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < KEYS_DEFEAT_MESSAGE_TTL_MS) {
      return;
    }

    this.elapsedMs = 0;
    this.state = 'defeat-fading';
    this.addDefeatFadePrimitive(0);
    this.engine.audio.playSound(KEYS_DEFEAT_SOUND_ID, {
      restart: true,
      volume: KEYS_DEFEAT_SOUND_VOLUME,
    });
  }

  private updateDefeatFading(deltaMs: number): void {
    this.elapsedMs = Math.min(KEYS_DEFEAT_FADE_DURATION_MS, this.elapsedMs + deltaMs);
    this.addDefeatFadePrimitive(this.elapsedMs / KEYS_DEFEAT_FADE_DURATION_MS);

    if (this.elapsedMs < KEYS_DEFEAT_FADE_DURATION_MS) {
      return;
    }

    this.elapsedMs = 0;
    this.state = 'defeat-title';
    this.engine.video.titles.addTitle({
      id: KEYS_DEFEAT_TITLE_ID,
      text: this.localization.text.keys.defeatTitle,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: DEFAULT_DESIGN_HEIGHT / 2,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 42,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#1f2a20',
          width: 6,
          alpha: 0.95,
        },
      },
      visible: true,
    });
    this.engine.video.render(0);
  }

  private updateDefeatTitle(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < KEYS_DEFEAT_TITLE_DURATION_MS) {
      return;
    }

    this.state = 'restarting';
    this.elapsedMs = 0;
    this.engine.video.titles.removeTitle(KEYS_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(KEYS_DEFEAT_FADE_PRIMITIVE_ID);
    this.engine.video.render(0);
    this.engine.setInputEnabled(true);
    this.onRestartRequested?.();
  }

  private addDefeatFadePrimitive(alpha: number): void {
    this.engine.video.primitives.addPrimitive({
      id: KEYS_DEFEAT_FADE_PRIMITIVE_ID,
      kind: 'rect',
      renderLayer: 'overlay.primitives',
      zIndex: 5000,
      color: DEFAULT_ROCCO_GREEN_BLACK,
      alpha,
      visible: true,
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
      fill: true,
    });
    this.engine.video.render(0);
  }

  private playKeysSound(): void {
    this.engine.audio.playSound(KEYS_SOUND_ID, {
      restart: true,
      volume: KEYS_SOUND_VOLUME,
    });
  }

  private pickDefeatLine(): string {
    const lines = this.localization.text.keys.defeatLines;
    if (lines.length === 1) {
      return lines[0] ?? '';
    }

    let index = Math.floor(Math.random() * lines.length);
    if (index === this.lastDefeatLineIndex) {
      index = (index + 1) % lines.length;
    }
    this.lastDefeatLineIndex = index;
    return lines[index] ?? '';
  }

  private resolveGrabMode(roccoX: number, roccoY: number): KeysGrabMode {
    const dx = Math.abs(this.keysX - roccoX);
    const dy = Math.abs(this.keysY - roccoY);
    return dx > dy * KEYS_SIDE_APPROACH_RATIO ? 'side-hit' : 'rear-collect';
  }

  cancel(): void {
    // Cancel any non-cancelable sequence and re-enable input
    if (
      this.state === 'approaching-grab' ||
      this.state === 'side-shake' ||
      this.state === 'falling-out' ||
      this.state === 'collecting'
    ) {
      this.state = 'revealed';
      this.engine.setInputEnabled(true);
      this.revealAt(this.keysX, this.keysY);
    }
  }
}

export async function installDefaultKeys(
  engine: RoccoEngine,
  options?: RoccoDefaultKeysControllerOptions,
): Promise<RoccoDefaultKeysController> {
  const localization = options?.localization ?? createRoccoLocalization();
  const definition = createDefaultKeysSpriteDefinition(localization);
  engine.audio.registerSound({
    id: KEYS_SOUND_ID,
    uri: roccoDefaultKeysSoundUrl,
    volume: KEYS_SOUND_VOLUME,
    loop: false,
  });
  engine.audio.registerSound({
    id: KEYS_DEFEAT_SOUND_ID,
    uri: roccoDefaultYouLoseSoundUrl,
    volume: KEYS_DEFEAT_SOUND_VOLUME,
    loop: false,
  });
  await engine.audio.preloadSound(KEYS_SOUND_ID).catch(() => {
    engine.log('Audio', 'Keys sound could not be preloaded.');
  });
  await engine.audio.preloadSound(KEYS_DEFEAT_SOUND_ID).catch(() => {
    engine.log('Audio', 'Defeat sound could not be preloaded.');
  });
  await engine.video.preloadSpriteDefinition(definition);
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
  engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
  engine.audio.stopSound(KEYS_SOUND_ID);
  engine.audio.stopSound(KEYS_DEFEAT_SOUND_ID);
  engine.video.titles.removeTitle(KEYS_DEFEAT_TITLE_ID);
  engine.video.primitives.removePrimitive(KEYS_DEFEAT_FADE_PRIMITIVE_ID);
  engine.video.render(0);
  return new RoccoKeysController(engine, {
    ...options,
    localization,
  });
}

export function uninstallDefaultKeys(engine: RoccoEngine): void {
  engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
  engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
  engine.audio.stopSound(KEYS_SOUND_ID);
  engine.audio.stopSound(KEYS_DEFEAT_SOUND_ID);
  engine.video.titles.removeTitle(KEYS_DEFEAT_TITLE_ID);
  engine.video.primitives.removePrimitive(KEYS_DEFEAT_FADE_PRIMITIVE_ID);
  engine.video.render(0);
}
