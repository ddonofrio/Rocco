import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_WIDTH, ROCCO_DESIGN_HEIGHT } from '../../game-design';
import { ROCCO_ACTIVE_WALK_MAP_ID } from '../../../../levels/rocco-level-runtime-ids';
import { uninstallRoccoPlayerSprite, type RoccoPlayerSpriteController } from '../../player';
import type { RoccoLocalization } from '../../localization';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import {
  installRoccoLevelConnectorTargets,
  uninstallRoccoLevelConnectorTargets,
} from '../../../../levels/rocco-level-connector-targets';
import { netherResetOfficeSecondAssetUrls } from './nether-assets';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';
import {
  createGuyspriteSpriteDefinition,
  createGuyspriteTypingSpriteDefinition,
  GUYSPRITE_CONFIG,
} from '../../characters/guysprite';
import { GUYSPRITE_TYPING_DEFINITION_ID } from '../../characters/guysprite/guysprite-typing-sprite-definition';
import {
  installNetherResetOfficeGuysprite,
  restoreNetherResetOfficeGuyspriteStanding,
  setNetherResetOfficeRoccoSequenceControl,
  startNetherResetOfficeGuyspriteArrival,
  updateGuyspriteFacingTowardsRocco,
} from './nether-office-arrival-support';
import {
  NetherResetOfficeSecondPrinterController,
  NETHER_RESET_OFFICE_SECOND_PRINTER_READING_PLANE,
} from './nether-reset-office-second-printer';
import {
  didHandleNetherOfficeGuyspriteAction,
  type NetherOfficeGuyspriteTargetShape,
  canOpenNetherOfficeGuyspriteMenuAt,
  registerNetherOfficeGuyspriteInteraction,
  unregisterNetherOfficeGuyspriteInteraction,
} from './nether-office-guysprite-interaction';
import { NetherOfficePatienceController } from './nether-office-patience';
import { installNetherOfficePlayer } from './nether-office-player';

export const ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID = 'nether-reset-office-second';
export const ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID = 'rocco-nether-reset-office-second-scene';

const NETHER_RESET_OFFICE_RETURN_CONNECTOR_ID = 'south';
const NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT = 30;
const NETHER_RESET_OFFICE_ENTRY_POSITION = { x: 371, y: 138 } as const;
const NETHER_RESET_OFFICE_ROCCO_SCALE = ROCCO_PLAYER_CONFIG.motion.scale * 1.8;
const NETHER_RESET_OFFICE_ROCCO_TINT = '#cccccc';
const NETHER_RESET_OFFICE_FAR_SCALE = 0.8;
const NETHER_RESET_OFFICE_GUYSPRITE_SCALE = GUYSPRITE_CONFIG.motion.scale * 1.65;
const NETHER_RESET_OFFICE_GUYSPRITE_ARRIVAL_SPEED = GUYSPRITE_CONFIG.motion.runSpeed * 1.5;
const NETHER_RESET_OFFICE_GUYSPRITE_TYPING_POSITION = { x: 523, y: 179 } as const;
const NETHER_RESET_OFFICE_GUYSPRITE_TYPING_DELAY_MS = 250;
const NETHER_RESET_OFFICE_GUYSPRITE_TYPING_MIN_FRAME_DELAY_MS = 1000;
const NETHER_RESET_OFFICE_GUYSPRITE_TYPING_MAX_FRAME_DELAY_MS = 5000;
const NETHER_RESET_OFFICE_GUYSPRITE_ENTRY_GROUND_POINT = { x: 775, y: 530 } as const;
const NETHER_RESET_OFFICE_GUYSPRITE_TARGET_GROUND_POINT = { x: 596, y: 465 } as const;
const NETHER_RESET_OFFICE_GUYSPRITE_TARGET_SHAPE: NetherOfficeGuyspriteTargetShape = {
  kind: 'rect',
  x: 525,
  y: 165,
  width: 145,
  height: 310,
};
const NETHER_RESET_OFFICE_SECOND_CHAIR_PLANE_ID = 'rocco-nether-reset-office-second-desk-chair';
const NETHER_RESET_OFFICE_SECOND_CHAIR_POSITION = { x: 534, y: 249 } as const;
const NETHER_RESET_OFFICE_SECOND_CHAIR_SIZE = { width: 125, height: 216 } as const;
const NETHER_RESET_OFFICE_SECOND_ARRIVAL_INPUT_LEASE_ID = 'nether-office-second-arrival';

function resolveRandomUnit(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4_294_967_296;
}

type ArrivalSequence = { phase: 'walking' | 'typing-delay'; elapsedMs: number };
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT = {
  x: 371,
  y: ROCCO_DESIGN_HEIGHT - 22,
} as const;
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION = toOriginFromGroundPoint(
  NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT,
  NETHER_RESET_OFFICE_ROCCO_SCALE,
);

const NETHER_RESET_OFFICE_SECOND_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_RESET_OFFICE_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: ROCCO_DESIGN_HEIGHT - NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
      width: ROCCO_DESIGN_WIDTH,
      height: NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
    },
    exitDescriptionKey: 'otherOfficePart',
    entryPoint: {
      ...NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION,
    },
    entryFacing: 'up',
    preservePlayerPosition: true,
  },
] as const;

const NETHER_RESET_OFFICE_SECOND_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-reset-office-second-backplate',
    background: 'rocco-nether-reset-office-second-background',
  },
  backgroundUri: netherResetOfficeSecondAssetUrls.background,
  backgroundName: 'Nether Reset Office Second Background',
  extraPlanes: [
    {
      id: NETHER_RESET_OFFICE_SECOND_CHAIR_PLANE_ID,
      name: 'Nether Reset Office Second Desk Chair',
      enabled: true,
      visible: true,
      source: {
        kind: 'image',
        uri: netherResetOfficeSecondAssetUrls.deskChair,
        width: NETHER_RESET_OFFICE_SECOND_CHAIR_SIZE.width,
        height: NETHER_RESET_OFFICE_SECOND_CHAIR_SIZE.height,
      },
      colorModel: { kind: 'native' },
      transform: {
        x: NETHER_RESET_OFFICE_SECOND_CHAIR_POSITION.x,
        y: NETHER_RESET_OFFICE_SECOND_CHAIR_POSITION.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: {
        x: 0,
        y: 0,
        width: ROCCO_DESIGN_WIDTH,
        height: ROCCO_DESIGN_HEIGHT,
      },
      opacity: 1,
      priority: 0,
      renderLayer: 'world.behind',
    },
    NETHER_RESET_OFFICE_SECOND_PRINTER_READING_PLANE,
  ],
};

export class RoccoNetherResetOfficeSecondLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private engine: CartridgeSdkV1Runtime | undefined;
  private spriteController: RoccoPlayerSpriteController | undefined = undefined;
  private guyspriteDefinition:
    | Awaited<ReturnType<typeof createGuyspriteSpriteDefinition>>
    | undefined;
  private guyspriteTypingDefinition:
    | Awaited<ReturnType<typeof createGuyspriteTypingSpriteDefinition>>
    | undefined;
  private arrivalSequencePlayed = false;
  private guyspriteHasSatAtConsole = false;
  private arrivalSequence: ArrivalSequence | undefined;
  private arrivalInputLease: { dispose(): void } | undefined;
  private guyspriteTypingActive = false;
  private guyspriteTypingElapsedMs = 0;
  private guyspriteTypingNextFrameDelayMs = 0;
  private readonly officePatience: NetherOfficePatienceController;
  private readonly printerController: NetherResetOfficeSecondPrinterController;
  readonly id = ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_RESET_OFFICE_SECOND_CONNECTORS;

  constructor(
    localization: RoccoLocalization,
    officePatience = new NetherOfficePatienceController(localization),
  ) {
    this.localization = localization;
    this.officePatience = officePatience;
    this.title = localization.text.levels.resetOfficeTitle;
    this.printerController = new NetherResetOfficeSecondPrinterController(
      localization,
      ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
      (messageIndex, isCorrect) => this.officePatience.handleMessageReply(messageIndex, isCorrect),
    );
  }

  private updateGuyspriteArrival(deltaMs: number): void {
    if (!this.engine || !this.arrivalSequence || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    this.arrivalSequence.elapsedMs += deltaMs;
    if (this.arrivalSequence.phase === 'walking') {
      if (this.engine.video.sprites.isMoving(GUYSPRITE_CONFIG.ids.instance)) {
        return;
      }

      this.arrivalSequence = { phase: 'typing-delay', elapsedMs: 0 };
      return;
    }

    if (this.arrivalSequence.elapsedMs < NETHER_RESET_OFFICE_GUYSPRITE_TYPING_DELAY_MS) {
      return;
    }

    this.arrivalSequence = undefined;
    this.startGuyspriteTyping();
    this.arrivalInputLease?.dispose();
    this.arrivalInputLease = undefined;
    this.engine.video.sceneTargets?.setEnabled(GUYSPRITE_CONFIG.ids.instance, true);
    this.engine.video.sprites.setInteractive(GUYSPRITE_CONFIG.ids.instance, true);
    setNetherResetOfficeRoccoSequenceControl(this.engine, true);
  }

  private setRandomGuyspriteTypingFrame(): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(GUYSPRITE_CONFIG.ids.instance);
    if (!sprite) {
      return;
    }

    let nextFrameIndex = Math.floor(resolveRandomUnit() * 3);
    if (nextFrameIndex === sprite.animation.frameIndex) {
      nextFrameIndex = (nextFrameIndex + 1) % 3;
    }
    this.engine.video.sprites.setAnimationFrame(GUYSPRITE_CONFIG.ids.instance, nextFrameIndex);
    this.engine.video.sprites.stopAnimation(GUYSPRITE_CONFIG.ids.instance);
  }

  private startGuyspriteTyping(): void {
    if (!this.engine || !this.guyspriteTypingDefinition) {
      return;
    }

    this.engine.video.planes.updatePlane(
      ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
      NETHER_RESET_OFFICE_SECOND_CHAIR_PLANE_ID,
      { enabled: false, visible: false },
    );
    this.engine.video.sprites.removeSprite(GUYSPRITE_CONFIG.ids.instance);
    this.engine.video.sprites.createSpriteFromDefinition(GUYSPRITE_TYPING_DEFINITION_ID, {
      id: GUYSPRITE_CONFIG.ids.instance,
      transform: {
        x: NETHER_RESET_OFFICE_GUYSPRITE_TYPING_POSITION.x,
        y: NETHER_RESET_OFFICE_GUYSPRITE_TYPING_POSITION.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      renderLayer: 'world.actors',
      zIndex: 50,
      depthMode: 'fixed',
      interactive: true,
      collisionEnabled: false,
    });
    this.guyspriteHasSatAtConsole = true;
    this.guyspriteTypingActive = true;
    this.officePatience.beginAtSitting();
    this.guyspriteTypingElapsedMs = 0;
    this.setRandomGuyspriteTypingFrame();
    this.scheduleNextGuyspriteTypingFrame();
  }

  private scheduleNextGuyspriteTypingFrame(): void {
    const range =
      NETHER_RESET_OFFICE_GUYSPRITE_TYPING_MAX_FRAME_DELAY_MS -
      NETHER_RESET_OFFICE_GUYSPRITE_TYPING_MIN_FRAME_DELAY_MS;
    this.guyspriteTypingNextFrameDelayMs =
      NETHER_RESET_OFFICE_GUYSPRITE_TYPING_MIN_FRAME_DELAY_MS + resolveRandomUnit() * range;
  }

  private updateGuyspriteTyping(deltaMs: number): void {
    if (!this.guyspriteTypingActive || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    this.guyspriteTypingElapsedMs += deltaMs;
    if (this.guyspriteTypingElapsedMs < this.guyspriteTypingNextFrameDelayMs) {
      return;
    }

    this.guyspriteTypingElapsedMs = 0;
    this.setRandomGuyspriteTypingFrame();
    this.scheduleNextGuyspriteTypingFrame();
  }

  private resetMountState(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.spriteController = undefined;
    this.printerController.reset(engine);
    this.guyspriteDefinition = createGuyspriteSpriteDefinition(this.localization);
    this.guyspriteTypingDefinition = createGuyspriteTypingSpriteDefinition(this.localization);
    this.arrivalSequence = undefined;
    this.arrivalInputLease = undefined;
    this.guyspriteTypingActive = false;
    this.guyspriteTypingElapsedMs = 0;
    this.guyspriteTypingNextFrameDelayMs = 0;
  }

  private shouldPlayArrivalSequence(options: RoccoLevelMountOptions): boolean {
    return (
      !!options.forceArrivalSequence ||
      !this.arrivalSequencePlayed ||
      !this.guyspriteHasSatAtConsole
    );
  }

  private setupGuyspriteForMount(
    engine: CartridgeSdkV1Runtime,
    shouldPlayArrivalSequence: boolean,
  ): void {
    registerNetherOfficeGuyspriteInteraction(
      engine,
      this.localization,
      !shouldPlayArrivalSequence,
      NETHER_RESET_OFFICE_GUYSPRITE_TARGET_SHAPE,
    );
    engine.video.sprites.loadSpriteDefinition(this.guyspriteDefinition!);
    engine.video.sprites.loadSpriteDefinition(this.guyspriteTypingDefinition!);
    if (shouldPlayArrivalSequence) {
      this.arrivalSequencePlayed = true;
      setNetherResetOfficeRoccoSequenceControl(engine, false);
      this.arrivalInputLease = engine.acquireInputLease(
        NETHER_RESET_OFFICE_SECOND_ARRIVAL_INPUT_LEASE_ID,
        'blocked',
      );
      if (this.guyspriteDefinition) {
        installNetherResetOfficeGuysprite(
          engine,
          toOriginFromGroundPoint(
            NETHER_RESET_OFFICE_GUYSPRITE_ENTRY_GROUND_POINT,
            NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
          ),
          NETHER_RESET_OFFICE_GUYSPRITE_ENTRY_GROUND_POINT,
          NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
          false,
        );
      }
      this.arrivalSequence = { phase: 'walking', elapsedMs: 0 };
      startNetherResetOfficeGuyspriteArrival(
        engine,
        toOriginFromGroundPoint(
          NETHER_RESET_OFFICE_GUYSPRITE_TARGET_GROUND_POINT,
          NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
        ),
        NETHER_RESET_OFFICE_GUYSPRITE_ARRIVAL_SPEED,
      );
    } else if (this.guyspriteHasSatAtConsole && !this.officePatience.isComplete) {
      this.startGuyspriteTyping();
    } else if (this.guyspriteHasSatAtConsole) {
      this.restoreGuyspriteStanding();
    } else {
      if (this.guyspriteDefinition) {
        installNetherResetOfficeGuysprite(
          engine,
          toOriginFromGroundPoint(
            NETHER_RESET_OFFICE_GUYSPRITE_TARGET_GROUND_POINT,
            NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
          ),
          NETHER_RESET_OFFICE_GUYSPRITE_TARGET_GROUND_POINT,
          NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
          true,
        );
      }
    }
  }

  private restoreGuyspriteStanding(): void {
    if (!this.engine || !this.guyspriteDefinition) {
      return;
    }

    this.guyspriteTypingActive = false;
    restoreNetherResetOfficeGuyspriteStanding(
      this.engine,
      ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
      NETHER_RESET_OFFICE_SECOND_CHAIR_PLANE_ID,
      NETHER_RESET_OFFICE_GUYSPRITE_TARGET_GROUND_POINT,
      NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
    );
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.resetMountState(engine);

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...NETHER_RESET_OFFICE_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    const scene = await loadOrCreateNetherScene(
      engine,
      NETHER_RESET_OFFICE_SECOND_SCENE_DEFINITION,
    );
    const walkMapProfile = await createNetherWalkMapProfile(
      netherResetOfficeSecondAssetUrls.walkPath,
    );

    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    await (preloader?.preloadSpriteDefinition(engine, this.guyspriteDefinition!) ??
      engine.video.preloadSpriteDefinition(this.guyspriteDefinition!));
    await (preloader?.preloadSpriteDefinition(engine, this.guyspriteTypingDefinition!) ??
      engine.video.preloadSpriteDefinition(this.guyspriteTypingDefinition!));
    engine.loadPlaneScene(scene);
    installRoccoLevelConnectorTargets(engine, this.id, this.connectors, this.localization);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    this.printerController.installInteraction(
      engine,
      NETHER_RESET_OFFICE_SECOND_SCENE_DEFINITION.planeIds.background,
    );
    this.officePatience.mount(
      engine,
      'second',
      () => this.restoreGuyspriteStanding(),
      options.onRestartRequested,
    );
    this.spriteController = await installNetherOfficePlayer(
      engine,
      options,
      initialFacing,
      initialPosition,
      walkMapProfile,
      NETHER_RESET_OFFICE_ROCCO_SCALE,
      NETHER_RESET_OFFICE_ROCCO_TINT,
      NETHER_RESET_OFFICE_FAR_SCALE,
      this.localization,
      preloader,
    );
    if (options.forceArrivalSequence === true) {
      this.guyspriteHasSatAtConsole = false;
    }
    this.setupGuyspriteForMount(engine, this.shouldPlayArrivalSequence(options));

    return scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.closeMenu();
    unregisterNetherOfficeGuyspriteInteraction(engine);
    this.printerController.unmount(engine);
    this.officePatience.unmount(engine);
    this.arrivalInputLease?.dispose();
    this.arrivalInputLease = undefined;
    this.arrivalSequence = undefined;
    engine.video.messages.clearMessages();
    uninstallRoccoLevelConnectorTargets(engine, this.id, this.connectors);
    uninstallRoccoPlayerSprite(engine);
    engine.video.sprites.removeSprite(GUYSPRITE_CONFIG.ids.instance);
    engine.video.sprites.unregisterSpriteDefinition(GUYSPRITE_CONFIG.ids.definition);
    engine.video.sprites.unregisterSpriteDefinition(GUYSPRITE_TYPING_DEFINITION_ID);
    engine.video.sprites.unregisterWalkMap(ROCCO_ACTIVE_WALK_MAP_ID);
    this.engine = undefined;
    this.guyspriteDefinition = undefined;
    this.guyspriteTypingDefinition = undefined;
    this.guyspriteTypingActive = false;
    this.guyspriteTypingElapsedMs = 0;
    this.spriteController = undefined;
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.printerController.update(deltaMs);
    this.officePatience.update(deltaMs);
    if (this.engine && !this.guyspriteTypingActive) {
      updateGuyspriteFacingTowardsRocco(
        this.engine,
        this.arrivalSequence
          ? NETHER_RESET_OFFICE_GUYSPRITE_ENTRY_GROUND_POINT
          : NETHER_RESET_OFFICE_GUYSPRITE_TARGET_GROUND_POINT,
        false,
      );
    }
    this.updateGuyspriteArrival(deltaMs);
    this.updateGuyspriteTyping(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (this.printerController.handleAction(activation)) {
      return;
    }

    if (this.engine) {
      didHandleNetherOfficeGuyspriteAction(this.engine, this.localization, activation);
    }
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    this.printerController.handleGridMenu(activation);
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    const printerDisposition = this.printerController.handleSceneClick(activation);
    if (printerDisposition) {
      return printerDisposition;
    }

    if (
      this.engine &&
      canOpenNetherOfficeGuyspriteMenuAt(
        this.engine,
        activation.sceneX,
        activation.sceneY,
        NETHER_RESET_OFFICE_GUYSPRITE_TARGET_SHAPE,
      )
    ) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }
  }
}
