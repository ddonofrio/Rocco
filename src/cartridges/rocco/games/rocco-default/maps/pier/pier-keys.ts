import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { InputPolicyLease } from '../../../../../../console/input';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { pierKeysSoundUrl } from './pier-keys-assets';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { PIER_KEYS_CONFIG } from './pier-keys-config';
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
const KEYS_SOUND_VOLUME = 0.8;
const KEYS_COLLECT_INPUT_LEASE_ID = 'pier-keys-collect';

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
  private readonly engine: CartridgeSdkV1Runtime;
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
  private collectInputLease: InputPolicyLease | undefined;

  constructor(engine: CartridgeSdkV1Runtime, options?: RoccoDefaultKeysControllerOptions) {
    this.engine = engine;
    this.localization = options?.localization ?? createRoccoLocalization();
    this.onCollectRequested = options?.onCollectRequested;
    this.onCollected = options?.onCollected;
    this.restoreState(options?.initialState ?? { status: 'hidden' });
  }

  private restoreState(state: RoccoDefaultKeysState): void {
    if (state.status === 'revealed') {
      this.revealAt(state.x ?? PIER_KEYS_CONFIG.x, state.y ?? PIER_KEYS_CONFIG.y);
      return;
    }

    if (state.status === 'collected') {
      this.state = 'collected';
      this.revealed = false;
      this.engine.video.sprites.removeSprite(PIER_KEYS_CONFIG.spriteInstanceId);
      this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
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
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
      {
        ttlMs: KEYS_ACTION_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private acquireCollectInputLease(): void {
    this.collectInputLease ??= this.engine.acquireInputLease(
      KEYS_COLLECT_INPUT_LEASE_ID,
      'blocked',
    );
  }

  private releaseCollectInputLease(): void {
    this.collectInputLease?.dispose();
    this.collectInputLease = undefined;
  }

  private startGrabApproach(): void {
    const rocco = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    const keys = this.engine.video.sprites.getSprite(PIER_KEYS_CONFIG.spriteInstanceId);
    if (!rocco || !keys) {
      this.releaseCollectInputLease();
      return;
    }

    this.keysX = keys.transform.x;
    this.keysY = keys.transform.y;
    this.state = 'approaching-grab';
    this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
    const isStarted = this.engine.video.sprites.goTo(
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.keysX,
      this.keysY,
      {
        targetInstanceId: PIER_KEYS_CONFIG.spriteInstanceId,
        keepDistance: KEYS_APPROACH_KEEP_DISTANCE,
        action: ROCCO_PLAYER_CONFIG.ids.runAction,
        idleAction: ROCCO_PLAYER_CONFIG.ids.idleAction,
        stopDistance: 1,
        faceTargetOnComplete: true,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!isStarted) {
      this.state = 'revealed';
      this.releaseCollectInputLease();
      this.engine.video.actionMenus.registerMenu(createDefaultKeysActionMenu(this.localization));
    }
  }

  private updateApproach(): void {
    if (this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
      return;
    }

    const rocco = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    const keys = this.engine.video.sprites.getSprite(PIER_KEYS_CONFIG.spriteInstanceId);
    if (!rocco || !keys) {
      this.state = 'gone';
      this.releaseCollectInputLease();
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
    this.engine.video.sprites.setPresentationTransform(PIER_KEYS_CONFIG.spriteInstanceId, {
      pitchDegrees: 0,
      yawDegrees: 0,
    });
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.idleAction,
      {
        direction: 'down',
        restart: true,
      },
    );
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.pickUpAction,
      {
        direction: 'down',
        restart: true,
      },
    );
    this.playKeysSound();
  }

  private updateCollecting(deltaMs: number): void {
    const rocco = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
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
      PIER_KEYS_CONFIG.spriteScale * (1 + Math.sin(progress * Math.PI) * KEYS_COLLECT_SCALE_BOOST);

    this.engine.video.sprites.setPosition(PIER_KEYS_CONFIG.spriteInstanceId, x, y);
    this.engine.video.sprites.setScale(PIER_KEYS_CONFIG.spriteInstanceId, scale, scale);
    if (this.elapsedMs >= KEYS_COLLECT_DURATION_MS) {
      this.engine.video.sprites.removeSprite(PIER_KEYS_CONFIG.spriteInstanceId);
      this.engine.video.sprites.playAction(
        ROCCO_PLAYER_CONFIG.ids.instance,
        ROCCO_PLAYER_CONFIG.ids.idleAction,
        {
          direction: 'down',
          restart: true,
        },
      );
      this.state = 'collected';
      this.revealed = false;
      this.onCollected?.();
      this.releaseCollectInputLease();
    }
  }

  private snapRoccoToKeysGround(scaleX: number, scaleY: number): void {
    this.roccoBaseX = this.keysX - ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * scaleX;
    this.roccoBaseY = this.keysY - ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * scaleY;
    this.engine.video.sprites.setPosition(
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.roccoBaseX,
      this.roccoBaseY,
    );
  }

  private playKeysSound(): void {
    this.engine.audio.playSound(KEYS_SOUND_ID, {
      restart: true,
      volume: KEYS_SOUND_VOLUME,
    });
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
    if (activation.targetInstanceId !== PIER_KEYS_CONFIG.spriteInstanceId) {
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

    this.acquireCollectInputLease();

    if (this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
      this.state = 'approaching-grab';
      const keys = this.engine.video.sprites.getSprite(PIER_KEYS_CONFIG.spriteInstanceId);
      if (keys) {
        this.keysX = keys.transform.x;
        this.keysY = keys.transform.y;
      }
      this.engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
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
    this.engine.video.sprites.removeSprite(PIER_KEYS_CONFIG.spriteInstanceId);
    this.engine.video.sprites.createSpriteFromDefinition(PIER_KEYS_CONFIG.spriteDefinitionId, {
      id: PIER_KEYS_CONFIG.spriteInstanceId,
      transform: {
        x,
        y,
        scaleX: PIER_KEYS_CONFIG.spriteScale,
        scaleY: PIER_KEYS_CONFIG.spriteScale,
        rotation: 0,
        presentation: {
          pitchDegrees: PIER_KEYS_CONFIG.presentationPitchDegrees,
        },
      },
      renderLayer: PIER_KEYS_CONFIG.renderLayer,
      zIndex: PIER_KEYS_CONFIG.zIndex,
      depthMode: 'fixed',
      opacity: 1,
      interactive: true,
      collisionEnabled: true,
    });
    this.engine.video.actionMenus.registerMenu(createDefaultKeysActionMenu(this.localization));
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  cancel(): void {
    if (!(this.state === 'approaching-grab' || this.state === 'collecting')) {
      return;
    }

    this.state = 'revealed';
    this.releaseCollectInputLease();
    this.revealAt(this.keysX, this.keysY);
  }
}

export async function installDefaultKeys(
  engine: CartridgeSdkV1Runtime,
  options?: RoccoDefaultKeysControllerOptions,
  preloader?: RoccoAssetPreloader,
): Promise<RoccoDefaultKeysController> {
  const localization = options?.localization ?? createRoccoLocalization();
  const definition = createDefaultKeysSpriteDefinition(localization);
  engine.audio.unregisterSound(KEYS_SOUND_ID);
  engine.audio.registerSound({
    id: KEYS_SOUND_ID,
    uri: pierKeysSoundUrl,
    volume: KEYS_SOUND_VOLUME,
    loop: false,
  });
  try {
    await preloader?.preloadSound(engine, KEYS_SOUND_ID);
  } catch {
    engine.log('Audio', 'Keys sound could not be preloaded.');
  }
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(PIER_KEYS_CONFIG.spriteInstanceId);
  engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
  engine.audio.stopSound(KEYS_SOUND_ID);
  return new RoccoKeysController(engine, {
    ...options,
    localization,
  });
}

export function uninstallDefaultKeys(engine: CartridgeSdkV1Runtime): void {
  engine.video.sprites.removeSprite(PIER_KEYS_CONFIG.spriteInstanceId);
  engine.video.actionMenus.unregisterMenu(KEYS_ACTION_MENU_ID);
  engine.audio.stopSound(KEYS_SOUND_ID);
  engine.audio.unregisterSound(KEYS_SOUND_ID);
}
