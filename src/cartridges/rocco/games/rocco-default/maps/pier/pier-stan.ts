import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoSpriteDefinition,
} from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { RoccoDialogueSession, roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { pierStanAssetUrl } from './pier-stan-assets';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { PIER_STAN_CONFIG } from './pier-stan-config';
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
const STAN_AWAKE_IDLE_TIMEOUT_MS = 12_000;
const STAN_SHOP_EXIT_DOOR_REACTION_WINDOW_MS = 5000;
const STAN_REAR_ALERT_HALF_WIDTH = 92;
const STAN_REAR_ALERT_MAX_GROUND_Y = PIER_STAN_CONFIG.y + 28;
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
type RoccoStanSceneClickResult = { suppressDefaultPlayerMove: true } | undefined;

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

function createDefaultStanPersistentState(): RoccoStanPersistentState {
  return { isIdentified: false };
}

function createStanAnimations(
  sleepingFrameId: string,
  wakingFrameId: string,
  attentiveFrameId: string,
  lookLeftFrameId: string,
  lookRightFrameId: string,
): RoccoSpriteDefinition['animations'] {
  return Object.fromEntries(
    [
      [PIER_STAN_CONFIG.sleepingAnimationId, sleepingFrameId],
      [STAN_WAKE_ANIMATION_ID, wakingFrameId],
      [STAN_ATTENTIVE_ANIMATION_ID, attentiveFrameId],
      [STAN_LOOK_LEFT_ANIMATION_ID, lookLeftFrameId],
      [STAN_LOOK_RIGHT_ANIMATION_ID, lookRightFrameId],
    ].map(([id, frameId]) => [
      id,
      {
        id,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId, durationMs: STAN_FRAME_DURATION_MS }],
      },
    ]),
  );
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
        uri: pierStanAssetUrl,
        width: PIER_STAN_CONFIG.sheetWidth,
        height: PIER_STAN_CONFIG.sheetHeight,
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
    id: PIER_STAN_CONFIG.spriteDefinitionId,
    name: 'Pier Beginning Stan',
    images: crop.images,
    frames: crop.frames,
    animations: createStanAnimations(
      sleepingFrameId,
      wakingFrameId,
      attentiveFrameId,
      lookLeftFrameId,
      lookRightFrameId,
    ),
    defaultAnimation: PIER_STAN_CONFIG.sleepingAnimationId,
    render: {
      renderLayer: PIER_STAN_CONFIG.renderLayer,
      zIndex: PIER_STAN_CONFIG.zIndex,
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
  private readonly engine: CartridgeSdkV1Runtime;
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
    engine: CartridgeSdkV1Runtime,
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
      playerSpriteInstanceId: ROCCO_PLAYER_CONFIG.ids.instance,
      npcSpriteInstanceId: PIER_STAN_CONFIG.spriteInstanceId,
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

  private updateShopExitReactionWindow(deltaMs: number): void {
    if (!this.justExitedShop) {
      return;
    }

    this.shopExitElapsedMs += deltaMs;
    if (this.shopExitElapsedMs > STAN_SHOP_EXIT_DOOR_REACTION_WINDOW_MS) {
      this.justExitedShop = false;
    }
  }

  private handleRearPresence(isRoccoBehindStan: boolean): void {
    if (!isRoccoBehindStan) {
      return;
    }

    this.awakeIdleMs = 0;
    this.wakeForRearPresence();
  }

  private advanceActiveSequence(deltaMs: number): number | undefined {
    if (!this.sequence) {
      return undefined;
    }

    const isDialogueBusy = this.dialogue.isActive() && !this.dialogue.isAwaitingChoice();
    const remainingDeltaMs = this.advanceSequence(deltaMs);
    const consumedDeltaMs = deltaMs - remainingDeltaMs;
    if (isDialogueBusy && consumedDeltaMs > 0) {
      this.dialogue.update(consumedDeltaMs);
    }

    this.awakeIdleMs = 0;
    return remainingDeltaMs;
  }

  private updateActiveDialogue(deltaMs: number): boolean {
    if (!this.dialogue.isActive() || this.dialogue.isAwaitingChoice()) {
      return false;
    }

    this.awakeIdleMs = 0;
    this.dialogue.update(deltaMs);
    return true;
  }

  private updateAwaitingChoiceState(deltaMs: number, isRoccoBehindStan: boolean): boolean {
    if (!this.dialogue.isAwaitingChoice()) {
      return false;
    }

    this.updateAwakeIdle(deltaMs, isRoccoBehindStan);
    return true;
  }

  private updateAwakeState(deltaMs: number, isRoccoBehindStan: boolean): boolean {
    if (this.state !== 'awake') {
      return false;
    }

    this.updateAwakeIdle(deltaMs, isRoccoBehindStan);
    return true;
  }

  private updateAwakeIdle(deltaMs: number, isRoccoBehindStan: boolean): void {
    if (isRoccoBehindStan) {
      return;
    }

    this.awakeIdleMs += deltaMs;
    if (this.awakeIdleMs >= STAN_AWAKE_IDLE_TIMEOUT_MS) {
      this.fallAsleep();
    }
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
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
      {
        ttlMs: DEFAULT_STAN_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
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
      return (
        STAN_WAKE_STEP_DURATION_MS * 2 +
        (shouldLookAround ? STAN_LOOK_AROUND_STEP_DURATION_MS * 2 : 0)
      );
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
    this.engine.video.sprites.setVisibleDescription(PIER_STAN_CONFIG.spriteInstanceId, {
      enabled: true,
      text: this.localization.text.descriptions.stan,
    });
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
    this.engine.video.sprites.playAnimation(PIER_STAN_CONFIG.spriteInstanceId, animationIds[0], {
      restart: true,
    });
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
        PIER_STAN_CONFIG.spriteInstanceId,
        animationIds[nextStepIndex],
        {
          restart: true,
        },
      );
      return leftoverDeltaMs;
    }

    this.sequence = undefined;
    if (currentSequence.kind === 'look-around') {
      this.engine.video.sprites.playAnimation(
        PIER_STAN_CONFIG.spriteInstanceId,
        this.resolveStanRestingAnimationId(),
        {
          restart: true,
        },
      );
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
      PIER_STAN_CONFIG.spriteInstanceId,
      PIER_STAN_CONFIG.sleepingAnimationId,
      {
        restart: true,
      },
    );
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
    const stan = this.engine.video.sprites.getSprite(PIER_STAN_CONFIG.spriteInstanceId);
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
      PIER_STAN_CONFIG.spriteInstanceId,
      this.resolveStanRestingAnimationId(),
      {
        restart: true,
      },
    );
  }

  private resolveStanRestingAnimationId(): string {
    const roccoGroundPoint = this.getRoccoGroundPoint();
    const stan = this.engine.video.sprites.getSprite(PIER_STAN_CONFIG.spriteInstanceId);
    if (!roccoGroundPoint || !stan) {
      return STAN_ATTENTIVE_ANIMATION_ID;
    }

    if (roccoGroundPoint.x >= stan.transform.x) {
      return STAN_LOOK_RIGHT_ANIMATION_ID;
    }

    return STAN_LOOK_LEFT_ANIMATION_ID;
  }

  private getRoccoGroundPoint(): { x: number; y: number } | undefined {
    const rocco = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    if (!rocco) {
      return undefined;
    }

    return {
      x:
        rocco.transform.x +
        ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * (rocco.transform.scaleX || 1),
      y:
        rocco.transform.y +
        ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * (rocco.transform.scaleY || 1),
    };
  }

  private syncAwakeFacing(): void {
    const stan = this.engine.video.sprites.getSprite(PIER_STAN_CONFIG.spriteInstanceId);
    if (!stan) {
      return;
    }

    const animationId = this.resolveStanRestingAnimationId();
    if (stan.animation.animationId === animationId) {
      return;
    }

    this.engine.video.sprites.playAnimation(PIER_STAN_CONFIG.spriteInstanceId, animationId, {
      restart: true,
    });
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
    if (lines.length === 0) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      PIER_STAN_CONFIG.spriteInstanceId,
      [...lines],
      {
        ttlMs: DEFAULT_STAN_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey: 'stan-shop-exit-door-thought',
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private showSleepThought(): void {
    this.engine.video.messages.think(
      PIER_STAN_CONFIG.spriteInstanceId,
      [...STAN_SLEEP_THOUGHT_LINES],
      {
        id: STAN_SLEEP_THOUGHT_MESSAGE_ID,
        background: true,
        ttlMs: STAN_SLEEP_THOUGHT_LINE_TTL_MS,
        side: 'above',
      },
    );
  }

  private resetSleepThoughtCycle(): void {
    this.sleepThoughtRemainingMs = STAN_SLEEP_THOUGHT_DELAY_MS;
    this.engine.video.messages.removeMessage(STAN_SLEEP_THOUGHT_MESSAGE_ID);
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    this.updateShopExitReactionWindow(deltaMs);
    const isRoccoBehindStan = this.isRoccoBehindStan();
    this.handleRearPresence(isRoccoBehindStan);
    if (this.state === 'awake' && !this.sequence) {
      this.syncAwakeFacing();
    }

    let remainingDeltaMs = deltaMs;
    while (remainingDeltaMs > 0) {
      const remainingSequenceDeltaMs = this.advanceActiveSequence(remainingDeltaMs);
      if (remainingSequenceDeltaMs !== undefined) {
        remainingDeltaMs = remainingSequenceDeltaMs;
        continue;
      }

      if (this.updateActiveDialogue(remainingDeltaMs)) {
        return;
      }

      if (this.updateAwaitingChoiceState(remainingDeltaMs, isRoccoBehindStan)) {
        return;
      }

      if (this.updateAwakeState(remainingDeltaMs, isRoccoBehindStan)) {
        return;
      }

      this.updateSleepThought(remainingDeltaMs);
      return;
    }
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (activation.targetInstanceId !== PIER_STAN_CONFIG.spriteInstanceId) {
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

    this.beginConversation();
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    if (!this.dialogue.handleGridMenu(activation)) {
      return;
    }

    this.awakeIdleMs = 0;
  }

  handleSceneClick(_activation: RoccoSceneClickAction): RoccoStanSceneClickResult {
    if (!this.dialogue.isActive() || this.dialogue.isAwaitingChoice()) {
      return undefined;
    }

    this.dialogue.advance();
    return { suppressDefaultPlayerMove: true };
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.sequence = undefined;
    this.dialogue.cancel();
    this.resetSleepThoughtCycle();
    uninstallDefaultStanActionMenu(engine);
    engine.video.sprites.removeSprite(PIER_STAN_CONFIG.spriteInstanceId);
  }
}

export async function installDefaultStan(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization = createRoccoLocalization(),
  persistentState?: RoccoStanPersistentState,
  options: RoccoStanInstallOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoPierSideAmbientController> {
  const resolvedPersistentState = persistentState ?? createDefaultStanPersistentState();
  const definition = await createDefaultStanSpriteDefinition(localization, resolvedPersistentState);
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(PIER_STAN_CONFIG.spriteInstanceId);

  engine.video.sprites.createSpriteFromDefinition(PIER_STAN_CONFIG.spriteDefinitionId, {
    id: PIER_STAN_CONFIG.spriteInstanceId,
    transform: {
      x: PIER_STAN_CONFIG.x,
      y: PIER_STAN_CONFIG.y,
      scaleX: PIER_STAN_CONFIG.spriteScale,
      scaleY: PIER_STAN_CONFIG.spriteScale,
      rotation: 0,
    },
    renderLayer: PIER_STAN_CONFIG.renderLayer,
    zIndex: PIER_STAN_CONFIG.zIndex,
    depthMode: 'baseline-sort',
    interactive: true,
    collisionEnabled: false,
  });
  engine.video.sprites.playAnimation(
    PIER_STAN_CONFIG.spriteInstanceId,
    PIER_STAN_CONFIG.sleepingAnimationId,
    {
      restart: true,
    },
  );
  installDefaultStanActionMenu(engine, localization);

  return new RoccoStanController(engine, localization, resolvedPersistentState, options);
}
