import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { roccoDefaultKeysSoundUrl } from '../../sprites';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_KEYS_X,
  DEFAULT_KEYS_Y,
  DEFAULT_KEYS_PRESENTATION_PITCH_DEGREES,
  DEFAULT_KEYS_RENDER_LAYER,
  DEFAULT_KEYS_SPRITE_DEFINITION_ID,
  DEFAULT_KEYS_SPRITE_INSTANCE_ID,
  DEFAULT_KEYS_SPRITE_SCALE,
  DEFAULT_KEYS_Z_INDEX,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_PICK_UP_ACTION_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
} from '../../constants';
import {
  createDefaultKeysActionMenu,
  createDefaultKeysSpriteDefinition,
  KEYS_ACTION_MENU_ID,
  KEYS_ACTION_MESSAGE_TTL_MS,
  KEYS_GRAB_ACTION_ID,
} from './pier-keys-definition';

const KEYS_APPROACH_KEEP_DISTANCE = 0;
const KEYS_COLLECT_DURATION_MS = 780;
const KEYS_COLLECT_ARC_HEIGHT = 76;
const KEYS_COLLECT_SCALE_BOOST = 0.38;
const KEYS_SOUND_ID = 'rocco-keys-sound';
const KEYS_SOUND_VOLUME = 0.3;

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
  onCollectRequested?: () => boolean;
  onCollected?: () => void;
}

type KeysControllerState =
  | 'hidden'
  | 'revealed'
  | 'approaching-grab'
  | 'collecting'
  | 'gone'
  | 'collected';

class RoccoKeysController implements RoccoDefaultKeysController {
  private readonly engine: RoccoEngine;
  private readonly localization: RoccoLocalization;
  private readonly onCollectRequested: (() => boolean) | undefined;
  private readonly onCollected: (() => void) | undefined;
  private state: KeysControllerState = 'hidden';
  private elapsedMs = 0;
  private keysX = 0;
  private keysY = 0;
  private roccoBaseX = 0;
  private roccoBaseY = 0;
  private revealed = false;

  constructor(engine: RoccoEngine, options?: RoccoDefaultKeysControllerOptions) {
    this.engine = engine;
    this.localization = options?.localization ?? createRoccoLocalization();
    this.onCollectRequested = options?.onCollectRequested;
    this.onCollected = options?.onCollected;
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

    if (this.state === 'collecting') {
      this.updateCollecting(deltaMs);
    }
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (activation.targetInstanceId !== DEFAULT_KEYS_SPRITE_INSTANCE_ID) {
      return;
    }

    if (this.handleSimpleAction(activation.actionId)) {
      return;
    }

    if (activation.actionId !== KEYS_GRAB_ACTION_ID || this.state !== 'revealed') {
      return;
    }

    if (this.onCollectRequested?.() === false) {
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

  private handleSimpleAction(actionId: string): boolean {
    if (this.state !== 'revealed') {
      return false;
    }

    if (actionId === 'look') {
      this.showRoccoThought(this.localization.text.keys.lookLines, 'keys-look');
      return true;
    }

    if (actionId === 'kick') {
      this.showRoccoThought(this.localization.text.keys.kickLines, 'keys-kick');
      return true;
    }

    return false;
  }

  private showRoccoThought(lines: readonly string[], historyKey: string): void {
    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: KEYS_ACTION_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
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
    this.state = 'approaching-grab';
    this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
    const started = this.engine.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, this.keysX, this.keysY, {
      targetInstanceId: DEFAULT_KEYS_SPRITE_INSTANCE_ID,
      keepDistance: KEYS_APPROACH_KEEP_DISTANCE,
      action: DEFAULT_SPRITE_RUN_ACTION_ID,
      idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
      stopDistance: 1,
      faceTargetOnComplete: true,
      idleSettleDelayMs: 0,
      idleSettleFacing: 'diagonal-from-facing',
    });
    if (!started) {
      this.state = 'revealed';
      this.engine.setInputEnabled(true);
      this.engine.video.actionMenus.registerMenu(createDefaultKeysActionMenu(this.localization));
    }
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
    this.startCollecting();
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

  private playKeysSound(): void {
    this.engine.audio.playSound(KEYS_SOUND_ID, {
      restart: true,
      volume: KEYS_SOUND_VOLUME,
    });
  }

  cancel(): void {
    // Cancel any non-cancelable sequence and re-enable input
    if (
      this.state === 'approaching-grab' ||
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
  preloader?: RoccoAssetPreloader,
): Promise<RoccoDefaultKeysController> {
  const localization = options?.localization ?? createRoccoLocalization();
  const definition = createDefaultKeysSpriteDefinition(localization);
  engine.audio.unregisterSound(KEYS_SOUND_ID);
  engine.audio.registerSound({
    id: KEYS_SOUND_ID,
    uri: roccoDefaultKeysSoundUrl,
    volume: KEYS_SOUND_VOLUME,
    loop: false,
  });
  await preloader?.preloadSound(engine, KEYS_SOUND_ID).catch(() => {
    engine.log('Audio', 'Keys sound could not be preloaded.');
  });
  await (preloader?.preloadSpriteDefinition(engine, definition) ?? engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_KEYS_SPRITE_INSTANCE_ID);
  engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
  engine.audio.stopSound(KEYS_SOUND_ID);
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
  engine.audio.unregisterSound(KEYS_SOUND_ID);
  engine.video.render(0);
}
