import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoSpriteDefinition,
} from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { RoccoDialogueSession, roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { roccoDefaultStanAssetUrl } from '../../sprites';
import {
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_STAN_RENDER_LAYER,
  DEFAULT_STAN_SLEEPING_ANIMATION_ID,
  DEFAULT_STAN_SPRITE_DEFINITION_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
  DEFAULT_STAN_SPRITE_SCALE,
  DEFAULT_STAN_SHEET_HEIGHT,
  DEFAULT_STAN_SHEET_WIDTH,
  DEFAULT_STAN_X,
  DEFAULT_STAN_Y,
  DEFAULT_STAN_Z_INDEX,
  DEFAULT_SPRITE_INSTANCE_ID,
} from '../../constants';
import {
  DEFAULT_STAN_MESSAGE_TTL_MS,
  installDefaultStanActionMenu,
  uninstallDefaultStanActionMenu,
} from './pier-stan-action-menu';
import type { RoccoPierSideAmbientController } from './pier-side-level';

export const DEFAULT_STAN_DIALOGUE_MENU_ID = 'rocco-stan-dialogue-menu';
export const DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID = 'stan-look-right';
export const DEFAULT_STAN_DIALOGUE_TEXT_COLOR = '#2d114a';

const STAN_SHEET_IMAGE_ID = 'rocco-stan-sheet';
const STAN_WAKE_ANIMATION_ID = 'stan-waking';
const STAN_ATTENTIVE_ANIMATION_ID = 'stan-attentive';
const STAN_LOOK_LEFT_ANIMATION_ID = 'stan-look-left';
const STAN_LOOK_RIGHT_ANIMATION_ID = DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID;
const STAN_WAKE_FRAME_INDEX = 0;
const STAN_ATTENTIVE_FRAME_INDEX = 4;
const STAN_LOOK_LEFT_FRAME_INDEX = 5;
const STAN_LOOK_RIGHT_FRAME_INDEX = 3;
const STAN_SLEEPING_FRAME_INDEX = 6;
const STAN_FRAME_DURATION_MS = 1000;
const STAN_SHEET_ALPHA_THRESHOLD = 8;
const STAN_SHEET_PADDING = 8;
const STAN_SHEET_MIN_OPAQUE_PIXELS = 4000;
const STAN_WAKE_STEP_DURATION_MS = 1000;
const STAN_LOOK_AROUND_STEP_DURATION_MS = 1000;
const STAN_DIALOGUE_MENU_Y = 286;
const STAN_AWAKE_IDLE_TIMEOUT_MS = 12000;
const STAN_SHOP_EXIT_DOOR_REACTION_WINDOW_MS = 5000;
const STAN_REAR_ALERT_HALF_WIDTH = 92;
const STAN_REAR_ALERT_MAX_GROUND_Y = DEFAULT_STAN_Y + 28;
const STAN_SLEEP_THOUGHT_MESSAGE_ID = 'rocco-stan-sleep-thought';
const STAN_SLEEP_THOUGHT_DELAY_MS = 0;
const STAN_SLEEP_THOUGHT_LINE_TTL_MS = 640;
const STAN_SLEEP_THOUGHT_MIN_LENGTH = 2;
const STAN_SLEEP_THOUGHT_MAX_LENGTH = 18;
const STAN_SLEEP_THOUGHT_LINES = Array.from(
  { length: STAN_SLEEP_THOUGHT_MAX_LENGTH - STAN_SLEEP_THOUGHT_MIN_LENGTH + 1 },
  (_, index) => `Z${'z'.repeat(STAN_SLEEP_THOUGHT_MIN_LENGTH - 1 + index)}`,
);
const STAN_SLEEP_THOUGHT_LOOP_DURATION_MS =
  STAN_SLEEP_THOUGHT_LINES.length * STAN_SLEEP_THOUGHT_LINE_TTL_MS;

type RoccoStanPoseState = 'sleeping' | 'awake';
type RoccoStanSequenceKind = 'wake' | 'look-around';

interface RoccoStanSequence {
  kind: RoccoStanSequenceKind;
  stepIndex: number;
  remainingMs: number;
  onComplete?: () => void;
}

export interface RoccoStanPersistentState {
  isIdentified: boolean;
}

export interface RoccoStanInstallOptions {
  onConversationProgress?: () => void;
  justExitedShop?: boolean;
}

async function createDefaultStanSpriteDefinition(
  localization: RoccoLocalization,
  persistentState: RoccoStanPersistentState,
): Promise<RoccoSpriteDefinition> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'sheet-components',
    sources: [
      {
        id: STAN_SHEET_IMAGE_ID,
        uri: roccoDefaultStanAssetUrl,
        width: DEFAULT_STAN_SHEET_WIDTH,
        height: DEFAULT_STAN_SHEET_HEIGHT,
      },
    ],
    frameIdPrefix: 'stan-pose',
    durationMs: STAN_FRAME_DURATION_MS,
    alphaThreshold: STAN_SHEET_ALPHA_THRESHOLD,
    padding: STAN_SHEET_PADDING,
    minOpaquePixels: STAN_SHEET_MIN_OPAQUE_PIXELS,
    pivot: { mode: 'bottom-center' },
    hitbox: 'none',
  });

  const fallbackFrameId = crop.frameIds[0] ?? 'stan-pose-1';
  const wakingFrameId = crop.frameIds[STAN_WAKE_FRAME_INDEX] ?? fallbackFrameId;
  const attentiveFrameId = crop.frameIds[STAN_ATTENTIVE_FRAME_INDEX] ?? wakingFrameId;
  const lookLeftFrameId = crop.frameIds[STAN_LOOK_LEFT_FRAME_INDEX] ?? attentiveFrameId;
  const lookRightFrameId = crop.frameIds[STAN_LOOK_RIGHT_FRAME_INDEX] ?? attentiveFrameId;
  const sleepingFrameId =
    crop.frameIds[STAN_SLEEPING_FRAME_INDEX] ?? crop.frameIds.at(-1) ?? attentiveFrameId;

  return {
    id: DEFAULT_STAN_SPRITE_DEFINITION_ID,
    name: 'Pier Beginning Stan',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [DEFAULT_STAN_SLEEPING_ANIMATION_ID]: {
        id: DEFAULT_STAN_SLEEPING_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: sleepingFrameId, durationMs: STAN_FRAME_DURATION_MS }],
      },
      [STAN_WAKE_ANIMATION_ID]: {
        id: STAN_WAKE_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: wakingFrameId, durationMs: STAN_FRAME_DURATION_MS }],
      },
      [STAN_ATTENTIVE_ANIMATION_ID]: {
        id: STAN_ATTENTIVE_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: attentiveFrameId, durationMs: STAN_FRAME_DURATION_MS }],
      },
      [STAN_LOOK_LEFT_ANIMATION_ID]: {
        id: STAN_LOOK_LEFT_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: lookLeftFrameId, durationMs: STAN_FRAME_DURATION_MS }],
      },
      [STAN_LOOK_RIGHT_ANIMATION_ID]: {
        id: STAN_LOOK_RIGHT_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: lookRightFrameId, durationMs: STAN_FRAME_DURATION_MS }],
      },
    },
    defaultAnimation: DEFAULT_STAN_SLEEPING_ANIMATION_ID,
    render: {
      renderLayer: DEFAULT_STAN_RENDER_LAYER,
      zIndex: DEFAULT_STAN_Z_INDEX,
      depthMode: 'baseline-sort',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: persistentState.isIdentified
        ? localization.text.descriptions.stan
        : localization.text.descriptions.oldMan,
    },
    metadata: {
      purpose: 'pier-start-stan',
    },
  };
}

class RoccoStanController implements RoccoPierSideAmbientController {
  private readonly engine: RoccoEngine;
  private readonly localization: RoccoLocalization;
  private readonly persistentState: RoccoStanPersistentState;
  private readonly dialogue: RoccoDialogueSession;
  private readonly options: RoccoStanInstallOptions;
  private state: RoccoStanPoseState = 'sleeping';
  private awakeIdleMs = 0;
  private sleepThoughtRemainingMs = STAN_SLEEP_THOUGHT_DELAY_MS;
  private shopExitElapsedMs = 0;
  private justExitedShop: boolean;
  private sequence: RoccoStanSequence | undefined;

  constructor(
    engine: RoccoEngine,
    localization: RoccoLocalization,
    persistentState: RoccoStanPersistentState,
    options: RoccoStanInstallOptions = {},
  ) {
    this.engine = engine;
    this.localization = localization;
    this.persistentState = persistentState;
    this.options = options;
    this.justExitedShop = options.justExitedShop ?? false;
    this.dialogue = new RoccoDialogueSession({
      id: DEFAULT_STAN_DIALOGUE_MENU_ID,
      engine,
      playerSpriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      npcSpriteInstanceId: DEFAULT_STAN_SPRITE_INSTANCE_ID,
      menuY: STAN_DIALOGUE_MENU_Y,
      npcMessageStyle: {
        fill: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
      },
      hooks: {
        beforeNpcReply: (choice) => {
          this.options.onConversationProgress?.();
          return this.playPreReplySequence(choice);
        },
        afterNpcLine: (choice) => {
          if (choice.id === 'introduce-self') {
            this.revealIdentity();
          }
        },
      },
    });
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.justExitedShop) {
      this.shopExitElapsedMs += deltaMs;
      if (this.shopExitElapsedMs > STAN_SHOP_EXIT_DOOR_REACTION_WINDOW_MS) {
        this.justExitedShop = false;
      }
    }

    const roccoBehindStan = this.isRoccoBehindStan();
    if (roccoBehindStan) {
      this.awakeIdleMs = 0;
      this.wakeForRearPresence();
    }

    if (this.state === 'awake' && !this.sequence) {
      this.syncAwakeFacing();
    }

    let remainingDeltaMs = deltaMs;
    while (remainingDeltaMs > 0) {
      if (this.sequence) {
        const dialogueWasBusy =
          this.dialogue.isActive() && !this.dialogue.isAwaitingChoice();
        const deltaBeforeSequence = remainingDeltaMs;
        remainingDeltaMs = this.advanceSequence(remainingDeltaMs);
        const consumedDeltaMs = deltaBeforeSequence - remainingDeltaMs;
        if (dialogueWasBusy && consumedDeltaMs > 0) {
          this.dialogue.update(consumedDeltaMs);
        }
        this.awakeIdleMs = 0;
        continue;
      }

      if (this.dialogue.isActive() && !this.dialogue.isAwaitingChoice()) {
        this.awakeIdleMs = 0;
        this.dialogue.update(remainingDeltaMs);
        return;
      }

      if (this.dialogue.isAwaitingChoice()) {
        if (!roccoBehindStan) {
          this.awakeIdleMs += remainingDeltaMs;
          if (this.awakeIdleMs >= STAN_AWAKE_IDLE_TIMEOUT_MS) {
            this.fallAsleep();
          }
        }
        return;
      }

      if (this.state === 'awake') {
        if (!roccoBehindStan) {
          this.awakeIdleMs += remainingDeltaMs;
          if (this.awakeIdleMs >= STAN_AWAKE_IDLE_TIMEOUT_MS) {
            this.fallAsleep();
          }
        }
        return;
      }

      this.updateSleepThought(remainingDeltaMs);
      return;
    }
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (activation.targetInstanceId !== DEFAULT_STAN_SPRITE_INSTANCE_ID) {
      return;
    }

    this.awakeIdleMs = 0;
    if (this.handleSimpleAction(activation.actionId)) {
      return;
    }

    if (activation.actionId !== 'talk') {
      return;
    }

    if (this.sequence || (this.dialogue.isActive() && !this.dialogue.isAwaitingChoice())) {
      return;
    }

    if (this.dialogue.isAwaitingChoice()) {
      this.dialogue.reopenChoices();
      return;
    }

    if (this.state === 'sleeping') {
      this.beginConversation();
      return;
    }

    this.beginConversation();
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    if (this.dialogue.handleGridMenu(activation)) {
      this.awakeIdleMs = 0;
      this.engine.video.render(0);
    }
  }

  handleSceneClick(_activation: RoccoSceneClickAction): RoccoCartridgeActionResult | void {
    if (this.dialogue.isActive() && !this.dialogue.isAwaitingChoice()) {
      this.dialogue.advance();
      return { suppressDefaultPlayerMove: true };
    }
  }

  unmount(engine: RoccoEngine): void {
    this.sequence = undefined;
    this.dialogue.cancel();
    this.resetSleepThoughtCycle();
    uninstallDefaultStanActionMenu(engine);
    engine.video.sprites.removeSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    engine.video.render(0);
  }

  private beginConversation(): void {
    this.awakeIdleMs = 0;
    this.resetSleepThoughtCycle();
    this.dialogue.beginConversation({
      choices: this.localization.text.stan.rootChoices,
    });
  }

  private handleSimpleAction(actionId: string): boolean {
    if (actionId === 'look') {
      this.showRoccoThought(this.localization.text.stan.lookLines, 'stan-look');
      return true;
    }

    if (actionId === 'grab') {
      this.showRoccoThought(this.localization.text.stan.grabLines, 'stan-grab');
      return true;
    }

    if (actionId === 'kick') {
      this.showRoccoThought(this.localization.text.stan.kickLines, 'stan-kick');
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
        ttlMs: DEFAULT_STAN_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private wakeForRearPresence(): void {
    if (this.state !== 'sleeping' || this.sequence || this.dialogue.isActive()) {
      return;
    }

    if (this.justExitedShop && this.shopExitElapsedMs <= STAN_SHOP_EXIT_DOOR_REACTION_WINDOW_MS) {
      this.startShopExitDoorReaction();
      return;
    }

    this.startSequence('wake', () => {
      this.state = 'awake';
    });
  }

  private startShopExitDoorReaction(): void {
    this.justExitedShop = false;
    this.startSequence('wake', () => {
      this.state = 'awake';
      this.showStanDoorThought();
      this.startSequence('look-around');
    });
  }

  private playPreReplySequence(choice: { id: string }): number {
    const shouldLookAround = choice.id === 'boo';

    if (this.state === 'sleeping') {
      this.startSequence('wake', () => {
        this.state = 'awake';
        if (shouldLookAround) {
          this.startSequence('look-around');
        }
      });
      return STAN_WAKE_STEP_DURATION_MS * 2 + (shouldLookAround ? STAN_LOOK_AROUND_STEP_DURATION_MS * 2 : 0);
    }

    if (shouldLookAround) {
      this.startSequence('look-around');
      return STAN_LOOK_AROUND_STEP_DURATION_MS * 2;
    }

    this.faceRocco();
    return 0;
  }

  private revealIdentity(): void {
    if (this.persistentState.isIdentified) {
      return;
    }

    this.persistentState.isIdentified = true;
    this.engine.video.sprites.setVisibleDescription(DEFAULT_STAN_SPRITE_INSTANCE_ID, {
      enabled: true,
      text: this.localization.text.descriptions.stan,
    });
    this.engine.video.render(0);
  }

  private startSequence(kind: RoccoStanSequenceKind, onComplete?: () => void): void {
    this.resetSleepThoughtCycle();
    const animationIds = this.resolveSequenceAnimationIds(kind);
    this.sequence = {
      kind,
      stepIndex: 0,
      remainingMs: this.resolveSequenceStepDurationMs(kind),
      onComplete,
    };
    this.engine.video.sprites.playAnimation(DEFAULT_STAN_SPRITE_INSTANCE_ID, animationIds[0], {
      restart: true,
    });
    this.engine.video.render(0);
  }

  private advanceSequence(deltaMs: number): number {
    if (!this.sequence) {
      return deltaMs;
    }

    if (this.sequence.remainingMs > deltaMs) {
      this.sequence.remainingMs -= deltaMs;
      return 0;
    }

    const currentSequence = this.sequence;
    const leftoverDeltaMs = deltaMs - currentSequence.remainingMs;
    const animationIds = this.resolveSequenceAnimationIds(currentSequence.kind);
    const nextStepIndex = currentSequence.stepIndex + 1;

    if (nextStepIndex < animationIds.length) {
      currentSequence.stepIndex = nextStepIndex;
      currentSequence.remainingMs = this.resolveSequenceStepDurationMs(currentSequence.kind);
      this.engine.video.sprites.playAnimation(
        DEFAULT_STAN_SPRITE_INSTANCE_ID,
        animationIds[nextStepIndex],
        {
          restart: true,
        },
      );
      this.engine.video.render(0);
      return leftoverDeltaMs;
    }

    this.sequence = undefined;
    if (currentSequence.kind === 'look-around') {
      this.engine.video.sprites.playAnimation(
        DEFAULT_STAN_SPRITE_INSTANCE_ID,
        this.resolveStanRestingAnimationId(),
        {
          restart: true,
        },
      );
      this.engine.video.render(0);
    }

    currentSequence.onComplete?.();
    return leftoverDeltaMs;
  }

  private fallAsleep(): void {
    this.dialogue.cancel();
    this.sequence = undefined;
    this.awakeIdleMs = 0;
    this.state = 'sleeping';
    this.resetSleepThoughtCycle();
    this.engine.video.sprites.playAnimation(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      DEFAULT_STAN_SLEEPING_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.video.render(0);
  }

  private resolveSequenceAnimationIds(kind: RoccoStanSequenceKind): readonly string[] {
    if (kind === 'wake') {
      return [STAN_WAKE_ANIMATION_ID, this.resolveStanRestingAnimationId()];
    }

    return [STAN_LOOK_LEFT_ANIMATION_ID, STAN_LOOK_RIGHT_ANIMATION_ID];
  }

  private resolveSequenceStepDurationMs(kind: RoccoStanSequenceKind): number {
    if (kind === 'wake') {
      return STAN_WAKE_STEP_DURATION_MS;
    }

    return STAN_LOOK_AROUND_STEP_DURATION_MS;
  }

  private isRoccoBehindStan(): boolean {
    const roccoGroundPoint = this.getRoccoGroundPoint();
    const stan = this.engine.video.sprites.getSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    if (!roccoGroundPoint || !stan) {
      return false;
    }

    return (
      Math.abs(roccoGroundPoint.x - stan.transform.x) <= STAN_REAR_ALERT_HALF_WIDTH &&
      roccoGroundPoint.y <= STAN_REAR_ALERT_MAX_GROUND_Y
    );
  }

  private faceRocco(): void {
    this.engine.video.sprites.playAnimation(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      this.resolveStanRestingAnimationId(),
      {
        restart: true,
      },
    );
    this.engine.video.render(0);
  }

  private resolveStanRestingAnimationId(): string {
    const roccoGroundPoint = this.getRoccoGroundPoint();
    const stan = this.engine.video.sprites.getSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    if (!roccoGroundPoint || !stan) {
      return STAN_ATTENTIVE_ANIMATION_ID;
    }

    if (roccoGroundPoint.x >= stan.transform.x) {
      return STAN_LOOK_RIGHT_ANIMATION_ID;
    }

    return STAN_LOOK_LEFT_ANIMATION_ID;
  }

  private getRoccoGroundPoint(): { x: number; y: number } | undefined {
    const rocco = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!rocco) {
      return undefined;
    }

    return {
      x: rocco.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (rocco.transform.scaleX || 1),
      y: rocco.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (rocco.transform.scaleY || 1),
    };
  }

  private syncAwakeFacing(): void {
    const stan = this.engine.video.sprites.getSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    if (!stan) {
      return;
    }

    const animationId = this.resolveStanRestingAnimationId();
    if (stan.animation.animationId === animationId) {
      return;
    }

    this.engine.video.sprites.playAnimation(DEFAULT_STAN_SPRITE_INSTANCE_ID, animationId, {
      restart: true,
    });
    this.engine.video.render(0);
  }

  private updateSleepThought(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    let remainingDeltaMs = deltaMs;
    while (remainingDeltaMs > 0) {
      if (this.sleepThoughtRemainingMs > remainingDeltaMs) {
        this.sleepThoughtRemainingMs -= remainingDeltaMs;
        return;
      }

      remainingDeltaMs -= this.sleepThoughtRemainingMs;
      this.showSleepThought();
      this.sleepThoughtRemainingMs = STAN_SLEEP_THOUGHT_LOOP_DURATION_MS;
    }
  }

  private showStanDoorThought(): void {
    const lines = this.localization.text.stan.doorWakeThoughtLines;
    if (!lines.length) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: DEFAULT_STAN_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey: 'stan-shop-exit-door-thought',
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private showSleepThought(): void {
    this.engine.video.messages.think(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      [...STAN_SLEEP_THOUGHT_LINES],
      {
        id: STAN_SLEEP_THOUGHT_MESSAGE_ID,
        background: true,
        ttlMs: STAN_SLEEP_THOUGHT_LINE_TTL_MS,
        side: 'above',
      },
    );
    this.engine.video.render(0);
  }

  private resetSleepThoughtCycle(): void {
    this.sleepThoughtRemainingMs = STAN_SLEEP_THOUGHT_DELAY_MS;
    this.engine.video.messages.removeMessage(STAN_SLEEP_THOUGHT_MESSAGE_ID);
  }
}

export async function installDefaultStan(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
  persistentState: RoccoStanPersistentState = { isIdentified: false },
  options: RoccoStanInstallOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoPierSideAmbientController> {
  const definition = await createDefaultStanSpriteDefinition(localization, persistentState);
  await (preloader?.preloadSpriteDefinition(engine, definition) ?? engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_STAN_SPRITE_DEFINITION_ID, {
    id: DEFAULT_STAN_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_STAN_X,
      y: DEFAULT_STAN_Y,
      scaleX: DEFAULT_STAN_SPRITE_SCALE,
      scaleY: DEFAULT_STAN_SPRITE_SCALE,
      rotation: 0,
    },
    renderLayer: DEFAULT_STAN_RENDER_LAYER,
    zIndex: DEFAULT_STAN_Z_INDEX,
    depthMode: 'baseline-sort',
    interactive: true,
    collisionEnabled: false,
  });
  engine.video.sprites.playAnimation(DEFAULT_STAN_SPRITE_INSTANCE_ID, DEFAULT_STAN_SLEEPING_ANIMATION_ID, {
    restart: true,
  });
  installDefaultStanActionMenu(engine, localization);
  engine.video.render(0);

  return new RoccoStanController(engine, localization, persistentState, options);
}
