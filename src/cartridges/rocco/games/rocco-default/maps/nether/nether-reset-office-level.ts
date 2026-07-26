import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_ACTIVE_WALK_MAP_ID } from '../../../../levels/rocco-level-runtime-ids';
import {
  installRoccoPlayerSprite,
  uninstallRoccoPlayerSprite,
  type RoccoPlayerSpriteController,
} from '../../player';
import type { RoccoLocalization } from '../../localization';
import { createGuyspriteSpriteDefinition, GUYSPRITE_CONFIG } from '../../characters/guysprite';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import {
  installRoccoLevelConnectorTargets,
  uninstallRoccoLevelConnectorTargets,
} from '../../../../levels/rocco-level-connector-targets';
import { netherResetOfficeAssetUrls } from './nether-assets';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  toOriginFromGroundPoint,
} from './nether-level-support';
import { ROCCO_LAB_COAT_PLAYER_APPEARANCE } from '../../player';
import { updateGuyspriteFacingTowardsRocco } from './nether-office-arrival-support';
import { preloadNetherOfficeArrivalAssets } from './nether-office-arrival-assets';
import { ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID } from './nether-console-hardware-spawn-level';
import { RoccoNetherOfficeDialogueController } from './nether-office-dialogue';
import {
  beginNetherOfficeDefeatFade,
  showNetherOfficeDefeatTitle,
  isNetherOfficeDefeatFadeComplete,
} from './nether-office-defeat';
import {
  NETHER_RESET_OFFICE_ARRIVAL_INPUT_LEASE_ID,
  NETHER_RESET_OFFICE_ARRIVAL_MESSAGE_TTL_MS,
  NETHER_RESET_OFFICE_CONNECTORS,
  NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID,
  NETHER_RESET_OFFICE_DEFEAT_SOUND_ID,
  NETHER_RESET_OFFICE_DEFEAT_TITLE_DURATION_MS,
  NETHER_RESET_OFFICE_DEFEAT_TITLE_ID,
  NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_ID,
  NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_TTL_MS,
  NETHER_RESET_OFFICE_DEPARTURE_REMINDER_INTERVAL_MS,
  NETHER_RESET_OFFICE_DOOR_CLOSE_DIALOGUE_DELAY_MS,
  NETHER_RESET_OFFICE_ENTRY_POSITION,
  NETHER_RESET_OFFICE_FAR_SCALE,
  NETHER_RESET_OFFICE_GUYSPRITE_GROUND_POINT,
  NETHER_RESET_OFFICE_GUYSPRITE_SCALE,
  NETHER_RESET_OFFICE_OPEN_DOOR_PLANE_ID,
  NETHER_RESET_OFFICE_ROCCO_ARRIVAL_GROUND_POINT,
  NETHER_RESET_OFFICE_ROCCO_FINAL_GROUND_POINT,
  NETHER_RESET_OFFICE_ROCCO_SCALE,
  NETHER_RESET_OFFICE_ROCCO_TINT,
  NETHER_RESET_OFFICE_SCENE_DEFINITION,
  ROCCO_NETHER_RESET_OFFICE_SCENE_ID,
} from './nether-reset-office-scene';
import {
  didHandleNetherOfficeGuyspriteAction,
  NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE,
  canOpenNetherOfficeGuyspriteMenuAt,
  registerNetherOfficeGuyspriteInteraction,
  setNetherOfficeGuyspriteInteractionEnabled,
  unregisterNetherOfficeGuyspriteInteraction,
} from './nether-office-guysprite-interaction';

type NetherOfficeArrivalPhase =
  | 'speaking'
  | 'walking'
  | 'dialogue-delay'
  | 'defeat-fading'
  | 'defeat-title';

interface NetherOfficeArrivalSequence {
  phase: NetherOfficeArrivalPhase;
  elapsedMs: number;
}

type NetherOfficeDeparturePhase = 'waiting-for-exit' | 'security-warning';

interface NetherOfficeDepartureSequence {
  phase: NetherOfficeDeparturePhase;
  elapsedMs: number;
  reminderIndex: number;
}

export const ROCCO_NETHER_RESET_OFFICE_LEVEL_ID = 'nether-reset-office';

export class RoccoNetherResetOfficeLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private engine: CartridgeSdkV1Runtime | undefined;
  private spriteController: RoccoPlayerSpriteController | undefined = undefined;
  private guyspriteDefinition:
    | Awaited<ReturnType<typeof createGuyspriteSpriteDefinition>>
    | undefined;
  private roccoHasLabCoat = false;
  private onRestartRequested: RoccoLevelMountOptions['onRestartRequested'];
  private arrivalSequence: NetherOfficeArrivalSequence | undefined;
  private departureSequence: NetherOfficeDepartureSequence | undefined;
  private arrivalInputLease: { dispose(): void } | undefined;
  private officeDialogue: RoccoNetherOfficeDialogueController | undefined;
  readonly id = ROCCO_NETHER_RESET_OFFICE_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_RESET_OFFICE_CONNECTORS;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = localization.text.levels.resetOfficeTitle;
  }

  private setOpenDoorVisible(isVisible: boolean): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.planes.updatePlane(
      ROCCO_NETHER_RESET_OFFICE_SCENE_ID,
      NETHER_RESET_OFFICE_OPEN_DOOR_PLANE_ID,
      { enabled: isVisible, visible: isVisible },
    );
  }

  private setRoccoSequenceControl(isEnabled: boolean): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.setInteractive(ROCCO_PLAYER_CONFIG.ids.instance, isEnabled);
    this.engine.video.sprites.setCollisionEnabled(ROCCO_PLAYER_CONFIG.ids.instance, isEnabled);
    if (!isEnabled) {
      this.engine.video.sprites.stopMovement(ROCCO_PLAYER_CONFIG.ids.instance);
    }
  }

  private installGuysprite(): void {
    if (!this.engine || !this.guyspriteDefinition) {
      return;
    }

    const scale = NETHER_RESET_OFFICE_GUYSPRITE_SCALE;
    const origin = toOriginFromGroundPoint(NETHER_RESET_OFFICE_GUYSPRITE_GROUND_POINT, scale);
    this.engine.video.sprites.removeSprite(GUYSPRITE_CONFIG.ids.instance);
    this.engine.video.sprites.createSpriteFromDefinition(GUYSPRITE_CONFIG.ids.definition, {
      id: GUYSPRITE_CONFIG.ids.instance,
      transform: {
        x: origin.x,
        y: origin.y,
        scaleX: scale,
        scaleY: scale,
        rotation: 0,
      },
      renderLayer: 'world.actors',
      zIndex: 50,
      depthMode: 'baseline-sort',
      interactive: false,
      collisionEnabled: false,
    });
    updateGuyspriteFacingTowardsRocco(
      this.engine,
      NETHER_RESET_OFFICE_GUYSPRITE_GROUND_POINT,
      true,
    );
  }

  private showArrivalLine(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.say(
      GUYSPRITE_CONFIG.ids.instance,
      this.roccoHasLabCoat
        ? this.localization.text.nether.officeArrival.welcomeLine
        : this.localization.text.nether.officeArrival.caughtLine,
      {
        ttlMs: NETHER_RESET_OFFICE_ARRIVAL_MESSAGE_TTL_MS,
        background: true,
        style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE,
      },
    );
  }

  private beginDefeat(): void {
    if (!this.engine) {
      return;
    }

    this.departureSequence = undefined;
    this.arrivalSequence = { phase: 'defeat-fading', elapsedMs: 0 };
    this.engine.video.messages.clearMessages();
    this.engine.audio.playSound(NETHER_RESET_OFFICE_DEFEAT_SOUND_ID, {
      restart: true,
      volume: 0.25,
    });
    beginNetherOfficeDefeatFade(this.engine);
  }

  private finishDefeat(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.titles.removeTitle(NETHER_RESET_OFFICE_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID);
    this.engine.audio.stopSound(NETHER_RESET_OFFICE_DEFEAT_SOUND_ID);
    this.arrivalInputLease?.dispose();
    this.arrivalInputLease = undefined;
    this.arrivalSequence = undefined;
    this.onRestartRequested?.({
      levelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
      entryConnectorId: 'entry',
      forceArrivalSequence: true,
    });
  }

  private startArrivalWalk(): void {
    if (!this.engine) {
      return;
    }

    const scale = NETHER_RESET_OFFICE_ROCCO_SCALE;
    const target = toOriginFromGroundPoint(NETHER_RESET_OFFICE_ROCCO_FINAL_GROUND_POINT, scale);
    this.arrivalSequence = { phase: 'walking', elapsedMs: 0 };
    this.engine.video.sprites.moveTo(ROCCO_PLAYER_CONFIG.ids.instance, target.x, target.y, {
      action: ROCCO_PLAYER_CONFIG.ids.runAction,
      idleAction: ROCCO_PLAYER_CONFIG.ids.idleAction,
      constrainToWalkMap: false,
      stopDistance: 1,
    });
  }

  private showDepartureReminder(line: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.say(GUYSPRITE_CONFIG.ids.instance, line, {
      id: NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_ID,
      ttlMs: NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_TTL_MS,
      background: true,
      side: 'left',
      maxWidth: 420,
      zIndex: 5000,
      style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE,
    });
  }

  private beginOfficeDepartureSequence(): void {
    this.arrivalInputLease?.dispose();
    this.arrivalInputLease = undefined;
    if (this.engine) {
      setNetherOfficeGuyspriteInteractionEnabled(this.engine, true);
      this.engine.video.sprites.setInteractive(GUYSPRITE_CONFIG.ids.instance, true);
    }
    this.setRoccoSequenceControl(true);
    this.departureSequence = {
      phase: 'waiting-for-exit',
      elapsedMs: 0,
      reminderIndex: 0,
    };
  }

  private updateOfficeDeparture(deltaMs: number): void {
    if (!this.departureSequence || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    const sequence = this.departureSequence;
    sequence.elapsedMs += deltaMs;

    if (sequence.phase === 'security-warning') {
      if (sequence.elapsedMs >= NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_TTL_MS) {
        this.departureSequence = undefined;
        this.beginDefeat();
      }
      return;
    }

    if (sequence.elapsedMs < NETHER_RESET_OFFICE_DEPARTURE_REMINDER_INTERVAL_MS) {
      return;
    }

    sequence.elapsedMs = 0;
    const reminderLines =
      this.localization.text.nether.officeArrival.dialogue.departureReminderLines;
    const line = reminderLines[sequence.reminderIndex];
    if (!line) {
      return;
    }

    this.showDepartureReminder(line);
    sequence.reminderIndex += 1;
    if (sequence.reminderIndex === reminderLines.length) {
      sequence.phase = 'security-warning';
    }
  }

  private updateArrivalSpeaking(sequence: NetherOfficeArrivalSequence): void {
    if (sequence.elapsedMs < NETHER_RESET_OFFICE_ARRIVAL_MESSAGE_TTL_MS) {
      return;
    }

    if (this.roccoHasLabCoat) {
      this.startArrivalWalk();
    } else {
      this.beginDefeat();
    }
  }

  private updateArrivalWalking(): void {
    if (!this.engine || this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
      return;
    }

    this.setOpenDoorVisible(false);
    this.engine.video.sprites.setFacing(ROCCO_PLAYER_CONFIG.ids.instance, 'left');
    this.arrivalSequence = { phase: 'dialogue-delay', elapsedMs: 0 };
  }

  private updateArrivalDialogueDelay(sequence: NetherOfficeArrivalSequence): void {
    if (sequence.elapsedMs < NETHER_RESET_OFFICE_DOOR_CLOSE_DIALOGUE_DELAY_MS) {
      return;
    }

    this.arrivalInputLease?.dispose();
    this.arrivalInputLease = undefined;
    this.arrivalSequence = undefined;
    this.officeDialogue?.begin(() => this.beginOfficeDepartureSequence());
  }

  private updateArrivalDefeatFading(sequence: NetherOfficeArrivalSequence): void {
    if (!this.engine) {
      return;
    }

    if (isNetherOfficeDefeatFadeComplete(this.engine, sequence.elapsedMs)) {
      this.arrivalSequence = { phase: 'defeat-title', elapsedMs: 0 };
      showNetherOfficeDefeatTitle(this.engine, this.localization);
    }
  }

  private updateArrival(deltaMs: number): void {
    if (!this.engine || !this.arrivalSequence || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    const sequence = this.arrivalSequence;
    sequence.elapsedMs += deltaMs;
    switch (sequence.phase) {
      case 'speaking': {
        this.updateArrivalSpeaking(sequence);
        return;
      }
      case 'walking': {
        this.updateArrivalWalking();
        return;
      }
      case 'dialogue-delay': {
        this.updateArrivalDialogueDelay(sequence);
        return;
      }
      case 'defeat-fading': {
        this.updateArrivalDefeatFading(sequence);
        return;
      }
      case 'defeat-title': {
        if (sequence.elapsedMs >= NETHER_RESET_OFFICE_DEFEAT_TITLE_DURATION_MS) {
          this.finishDefeat();
        }
        return;
      }
    }
  }

  beginNetherOfficeBellArrival(): void {
    if (!this.engine || this.arrivalSequence) {
      return;
    }

    const scale = NETHER_RESET_OFFICE_ROCCO_SCALE;
    const roccoPosition = toOriginFromGroundPoint(
      NETHER_RESET_OFFICE_ROCCO_ARRIVAL_GROUND_POINT,
      scale,
    );
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.setOpenDoorVisible(true);
    this.engine.video.sprites.setPosition(
      ROCCO_PLAYER_CONFIG.ids.instance,
      roccoPosition.x,
      roccoPosition.y,
      { constrainToWalkMap: false },
    );
    this.engine.video.sprites.setFacing(ROCCO_PLAYER_CONFIG.ids.instance, 'down');
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.idleAction,
      {
        direction: 'down',
        restart: true,
      },
    );
    this.setRoccoSequenceControl(false);
    this.installGuysprite();
    this.showArrivalLine();
    this.arrivalInputLease = this.engine.acquireInputLease(
      NETHER_RESET_OFFICE_ARRIVAL_INPUT_LEASE_ID,
      'advance-only',
    );
    this.arrivalSequence = { phase: 'speaking', elapsedMs: 0 };
    this.departureSequence = undefined;
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.officeDialogue = new RoccoNetherOfficeDialogueController(engine, this.localization);
    this.spriteController = undefined;
    this.arrivalSequence = undefined;
    this.arrivalInputLease = undefined;
    this.onRestartRequested = options.onRestartRequested;
    this.roccoHasLabCoat = options.roccoAppearance === ROCCO_LAB_COAT_PLAYER_APPEARANCE;

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...NETHER_RESET_OFFICE_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'down';
    const scene = await loadOrCreateNetherScene(engine, NETHER_RESET_OFFICE_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(netherResetOfficeAssetUrls.walkPath);

    this.guyspriteDefinition = await preloadNetherOfficeArrivalAssets(
      engine,
      scene,
      this.localization,
      preloader,
    );
    engine.loadPlaneScene(scene);
    installRoccoLevelConnectorTargets(engine, this.id, this.connectors, this.localization);
    registerNetherOfficeGuyspriteInteraction(engine, this.localization, false);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    this.spriteController = await installRoccoPlayerSprite(
      engine,
      {
        appearance: options.roccoAppearance,
        initialFacing,
        initialPosition: { ...initialPosition },
        scale: NETHER_RESET_OFFICE_ROCCO_SCALE,
        tint: NETHER_RESET_OFFICE_ROCCO_TINT,
        localization: this.localization,
        playIntro: false,
        perspectiveAutoAdjust: {
          farY: walkMapProfile.farY,
          nearY: walkMapProfile.nearY,
          farScale: NETHER_RESET_OFFICE_FAR_SCALE,
          nearScale: 1,
          scaleCurve: 'linear',
        },
      },
      preloader,
    );

    return scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.officeDialogue?.cancel();
    this.arrivalInputLease?.dispose();
    this.arrivalInputLease = undefined;
    this.arrivalSequence = undefined;
    this.departureSequence = undefined;
    this.setOpenDoorVisible(false);
    engine.video.titles.removeTitle(NETHER_RESET_OFFICE_DEFEAT_TITLE_ID);
    engine.video.primitives.removePrimitive(NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID);
    engine.audio.stopSound(NETHER_RESET_OFFICE_DEFEAT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_RESET_OFFICE_DEFEAT_SOUND_ID);
    engine.video.actionMenus.closeMenu();
    unregisterNetherOfficeGuyspriteInteraction(engine);
    engine.video.messages.clearMessages();
    uninstallRoccoLevelConnectorTargets(engine, this.id, this.connectors);
    uninstallRoccoPlayerSprite(engine);
    engine.video.sprites.removeSprite(GUYSPRITE_CONFIG.ids.instance);
    engine.video.sprites.unregisterSpriteDefinition(GUYSPRITE_CONFIG.ids.definition);
    engine.video.sprites.unregisterWalkMap(ROCCO_ACTIVE_WALK_MAP_ID);
    this.engine = undefined;
    this.guyspriteDefinition = undefined;
    this.officeDialogue = undefined;
    this.onRestartRequested = undefined;
    this.roccoHasLabCoat = false;
    this.spriteController = undefined;
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.officeDialogue?.update(deltaMs);
    if (this.engine) {
      updateGuyspriteFacingTowardsRocco(
        this.engine,
        NETHER_RESET_OFFICE_GUYSPRITE_GROUND_POINT,
        false,
      );
    }
    this.updateArrival(deltaMs);
    this.updateOfficeDeparture(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (!this.engine || !this.departureSequence) {
      return;
    }

    didHandleNetherOfficeGuyspriteAction(this.engine, this.localization, activation);
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    this.officeDialogue?.handleGridMenu(activation);
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    if (
      this.departureSequence &&
      this.engine &&
      canOpenNetherOfficeGuyspriteMenuAt(this.engine, activation.sceneX, activation.sceneY)
    ) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (this.arrivalSequence?.phase === 'speaking') {
      this.arrivalSequence.elapsedMs = NETHER_RESET_OFFICE_ARRIVAL_MESSAGE_TTL_MS;
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    return this.officeDialogue?.handleSceneClick();
  }
}
