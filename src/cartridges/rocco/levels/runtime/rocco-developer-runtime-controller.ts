import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../console/video/grid-menu';
import type {
  RoccoPoint,
  RoccoSpriteDefinition,
  RoccoSpriteFrame,
  RoccoSpriteInstance,
} from '../../../../console/video/sprites';
import type { RoccoInventory } from '../../inventory';
import type { RoccoLocalization } from '../../localization';
import { ROCCO_PLAYER_CONFIG } from '../../games/rocco-default/player/rocco-player-config';
import {
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from '../../games/rocco-default/player';
import {
  ROCCO_PIER_END_LEVEL_ID,
  ROCCO_PIER_MIDDLE_LEVEL_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../games/rocco-default/maps/pier/pier-level-ids';
import {
  createRoccoDeveloperEventLevelMenuDefinition,
  createRoccoDeveloperEventMenuDefinition,
  createRoccoDeveloperEventScreenMenuDefinition,
  createRoccoDeveloperInventoryItem,
  createRoccoDeveloperInventoryMenuDefinition,
  createRoccoDeveloperLevelMenuDefinition,
  createRoccoDeveloperRootMenuDefinition,
  createRoccoDeveloperScreenMenuDefinition,
  isRoccoDeveloperModeEnabled,
  type RoccoDeveloperEventLevelOption,
  type RoccoDeveloperLevelOption,
  ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID,
  ROCCO_DEVELOPER_EVENT_LEVEL_MENU_ID,
  ROCCO_DEVELOPER_EVENT_MENU_ID,
  ROCCO_DEVELOPER_EVENT_SCREEN_MENU_ID,
  ROCCO_DEVELOPER_EVENTS_CHOICE_ID,
  ROCCO_DEVELOPER_FINAL_SCREEN_CHOICE_ID,
  ROCCO_DEVELOPER_INVENTORY_CHOICE_ID,
  ROCCO_DEVELOPER_INVENTORY_MENU_ID,
  ROCCO_DEVELOPER_JUMP_CHOICE_ID,
  ROCCO_DEVELOPER_LEVEL_MENU_ID,
  ROCCO_DEVELOPER_ROOT_MENU_ID,
  ROCCO_DEVELOPER_SCREEN_MENU_ID,
} from '../../rocco-developer-mode';
import { isRoccoPlayerDeveloperAction } from '../../games/rocco-default/player';
import { ROCCO_BAIT_SHOP_LEVEL_ID } from '../bait-shop/bait-shop-level';
import { ROCCO_BAIT_SHOP_SECOND_LEVEL_ID } from '../bait-shop/bait-shop-second-level';
import { ROCCO_BAIT_SHOP_TOILET_LEVEL_ID } from '../bait-shop/bait-shop-toilet-level';
import {
  ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
  ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID,
  ROCCO_NETHER_RESET_OFFICE_LEVEL_ID,
  ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
} from '../../games/rocco-default/maps/nether';
import { showNetherOfficeFinalScreen } from '../../games/rocco-default/maps/nether/nether-office-final-screen';

interface RoccoDeveloperEventState {
  allowToiletReuseDuringUrgency: boolean;
}

interface RoccoDeveloperSpriteCycleOriginalState {
  animationId: string;
  frameIndex: number;
  playbackRate: number;
  playing: boolean;
  action?: NonNullable<RoccoSpriteInstance['action']>;
  facing?: RoccoSpriteInstance['facing'];
}

interface RoccoDeveloperSpriteCyclePreview {
  image: RoccoSpriteDefinition['images'][number];
  frame: RoccoSpriteFrame;
}

export interface RoccoDeveloperRuntimeSnapshot {
  allowToiletReuseDuringUrgency: boolean;
  developerJumpPending: boolean;
  developerEventScreenSelectionId: string | undefined;
}

export interface RoccoDeveloperRuntimeControllerOptions {
  localization: RoccoLocalization;
  inventory: RoccoInventory;
  getRoccoAppearance?: () => RoccoPlayerAppearance;
  setRoccoAppearance?: (appearance: RoccoPlayerAppearance) => void;
  resolveLevelTitle: (levelId: string) => string;
  switchToLevel: (
    levelId: string,
    entryConnectorId?: string,
    shouldForceArrivalSequence?: boolean,
  ) => Promise<boolean>;
  canCollectInventoryItem: (itemId: string, isShowFullMessage?: boolean) => boolean;
  refreshStatus: () => void;
  onToiletReuseEventChanged?: () => void;
  onNetherOfficeConfidenceMaxRequested?: () => void;
}

const DEVELOPER_SPRITE_CYCLE_ANIMATION_ID = '__rocco-developer-sprite-cycle__';
const DEVELOPER_SPRITE_CYCLE_FRAME_ID_PREFIX = '__rocco-developer-sprite-cycle-frame';
const DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS = 1000;
const DEVELOPER_SPRITE_CYCLE_TOP_TITLE_ID = 'rocco-developer-sprite-cycle-top-title';
const DEVELOPER_SPRITE_CYCLE_SPRITE_TITLE_ID = 'rocco-developer-sprite-cycle-sprite-title';
const DEVELOPER_ALLOW_TOILET_REUSE_EVENT_ID = 'allow-toilet-reuse';
const DEVELOPER_NETHER_RESET_OFFICE_CONFIDENCE_MAX_EVENT_ID = 'nether-reset-office-confidence-max';
const DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_EVENT_ID = 'nether-reset-office-second-arrival';
const DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_SCREEN_ID = 'nether-reset-office-second-arrival';

export class RoccoDeveloperRuntimeController {
  private readonly localization: RoccoLocalization;
  private readonly inventory: RoccoInventory;
  private readonly options: RoccoDeveloperRuntimeControllerOptions;
  private readonly developerEvents: RoccoDeveloperEventState = {
    allowToiletReuseDuringUrgency: false,
  };
  private developerJumpPending = false;
  private developerSpriteCycleActive = false;
  private developerEventScreenSelectionId: string | undefined;
  private readonly developerSpriteCycleIndexes = new Map<string, number>();
  private readonly developerSpriteCycleOriginalStates = new Map<
    string,
    RoccoDeveloperSpriteCycleOriginalState
  >();

  constructor(options: RoccoDeveloperRuntimeControllerOptions) {
    this.options = options;
    this.localization = options.localization;
    this.inventory = options.inventory;
  }

  private openDeveloperRootMenu(engine: CartridgeSdkV1Runtime): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    this.clearTransientState(engine);
    engine.video.actionMenus.closeMenu();
    engine.video.gridMenus.openMenu(createRoccoDeveloperRootMenuDefinition(this.localization));
    this.options.refreshStatus();
  }

  private handleDeveloperRootSelection(
    engine: CartridgeSdkV1Runtime,
    itemId: string | undefined,
  ): void {
    if (!itemId) {
      return;
    }

    if (itemId === ROCCO_DEVELOPER_JUMP_CHOICE_ID) {
      this.openDeveloperLevelMenu(engine);
      return;
    }

    if (itemId === ROCCO_DEVELOPER_INVENTORY_CHOICE_ID) {
      this.openDeveloperInventoryMenu(engine);
      return;
    }

    if (itemId === ROCCO_DEVELOPER_EVENTS_CHOICE_ID) {
      this.openDeveloperEventLevelMenu(engine);
      return;
    }

    if (itemId === ROCCO_DEVELOPER_FINAL_SCREEN_CHOICE_ID) {
      this.clearTransientState(engine);
      showNetherOfficeFinalScreen(engine, this.localization);
      return;
    }

    if (itemId === ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID) {
      this.activateDeveloperSpriteCycleMode(engine);
    }
  }

  private openDeveloperLevelMenu(engine: CartridgeSdkV1Runtime): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    this.clearTransientState(engine);
    engine.video.gridMenus.openMenu(
      createRoccoDeveloperLevelMenuDefinition(
        this.localization,
        this.createDeveloperLevelOptions(),
      ),
    );
    this.options.refreshStatus();
  }

  private openDeveloperScreenMenu(engine: CartridgeSdkV1Runtime, levelOptionId: string): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    const levelOption = this.findDeveloperLevelOption(levelOptionId);
    if (!levelOption) {
      return;
    }

    if (levelOption.screens.length === 1) {
      void this.prepareDeveloperJump(engine, levelOption.screens[0].id);
      return;
    }

    this.clearTransientState(engine);
    engine.video.gridMenus.openMenu(
      createRoccoDeveloperScreenMenuDefinition(this.localization, levelOption.screens),
    );
    this.options.refreshStatus();
  }

  private openDeveloperInventoryMenu(engine: CartridgeSdkV1Runtime): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    this.clearTransientState(engine);
    engine.video.gridMenus.openMenu(
      createRoccoDeveloperInventoryMenuDefinition(this.localization, this.inventory),
    );
    this.options.refreshStatus();
  }

  private openDeveloperEventLevelMenu(engine: CartridgeSdkV1Runtime): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    this.clearTransientState(engine);
    this.developerEventScreenSelectionId = undefined;
    engine.video.gridMenus.openMenu(
      createRoccoDeveloperEventLevelMenuDefinition(
        this.localization,
        this.createDeveloperEventLevelOptions(),
      ),
    );
    this.options.refreshStatus();
  }

  private openDeveloperEventScreenMenu(engine: CartridgeSdkV1Runtime, levelOptionId: string): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    const levelOption = this.findDeveloperEventLevelOption(levelOptionId);
    if (!levelOption) {
      return;
    }

    this.clearTransientState(engine);
    this.developerEventScreenSelectionId = undefined;
    engine.video.gridMenus.openMenu(
      createRoccoDeveloperEventScreenMenuDefinition(this.localization, levelOption.screens),
    );
    this.options.refreshStatus();
  }

  private openDeveloperEventMenu(engine: CartridgeSdkV1Runtime, screenId: string): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    const screenOption = this.findDeveloperEventScreenOption(screenId);
    if (!screenOption) {
      return;
    }

    this.clearTransientState(engine);
    this.developerEventScreenSelectionId = screenId;
    engine.video.gridMenus.openMenu(
      createRoccoDeveloperEventMenuDefinition(this.localization, screenOption.events),
    );
    this.options.refreshStatus();
  }

  private async prepareDeveloperJump(
    engine: CartridgeSdkV1Runtime,
    screenId: string,
  ): Promise<void> {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    this.clearTransientState(engine);
    const screenOption = this.findDeveloperScreenOption(screenId);
    if (!screenOption) {
      return;
    }

    if (
      screenOption.targetLevelId === ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID &&
      screenOption.forceArrivalSequence === true &&
      this.options.getRoccoAppearance?.() !== ROCCO_LAB_COAT_PLAYER_APPEARANCE
    ) {
      this.options.setRoccoAppearance?.(ROCCO_LAB_COAT_PLAYER_APPEARANCE);
    }

    const isSwitched = await this.options.switchToLevel(
      screenOption.targetLevelId,
      undefined,
      screenOption.forceArrivalSequence,
    );
    if (!isSwitched) {
      this.options.refreshStatus();
      return;
    }

    if (screenOption.requiresPlacementClick === false) {
      this.options.refreshStatus();
      return;
    }

    this.developerJumpPending = true;
    this.options.refreshStatus();
  }

  private toggleDeveloperInventoryItem(engine: CartridgeSdkV1Runtime, itemId: string): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    const item = createRoccoDeveloperInventoryItem(this.localization, itemId);
    if (!item) {
      return;
    }

    if (item.id === itemId) {
      if (this.inventory.hasItem(itemId)) {
        this.inventory.removeItem(itemId);
      } else if (this.options.canCollectInventoryItem(item.id, false)) {
        this.inventory.addItem(item);
      }
    } else {
      const currentVariant = this.inventory
        .listItems()
        .find((inventoryItem) => inventoryItem.id === item.id);
      if (currentVariant?.label === item.label) {
        this.inventory.removeItem(item.id);
      } else if (currentVariant || this.options.canCollectInventoryItem(item.id, false)) {
        this.inventory.addItem(item);
      }
    }

    this.openDeveloperInventoryMenu(engine);
  }

  private toggleDeveloperEvent(engine: CartridgeSdkV1Runtime, eventId: string): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    if (eventId === DEVELOPER_ALLOW_TOILET_REUSE_EVENT_ID) {
      this.developerEvents.allowToiletReuseDuringUrgency =
        !this.developerEvents.allowToiletReuseDuringUrgency;
      this.options.onToiletReuseEventChanged?.();
    }

    if (eventId === DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_EVENT_ID) {
      void this.prepareDeveloperJump(
        engine,
        DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_SCREEN_ID,
      );
      return;
    }

    if (eventId === DEVELOPER_NETHER_RESET_OFFICE_CONFIDENCE_MAX_EVENT_ID) {
      this.options.onNetherOfficeConfidenceMaxRequested?.();
    }

    if (this.developerEventScreenSelectionId) {
      this.openDeveloperEventMenu(engine, this.developerEventScreenSelectionId);
    }
  }

  private createDeveloperLevelOptions(): readonly RoccoDeveloperLevelOption[] {
    const resolveLevelTitle = this.options.resolveLevelTitle;
    return [
      this.createDeveloperPierLevelOption(resolveLevelTitle),
      this.createDeveloperBaitShopLevelOption(resolveLevelTitle),
      this.createDeveloperNetherLevelOption(resolveLevelTitle),
    ];
  }

  private createDeveloperPierLevelOption(
    resolveLevelTitle: (levelId: string) => string,
  ): RoccoDeveloperLevelOption {
    return {
      id: 'pier',
      title: this.localization.text.developer.pierLevelLabel,
      screens: [ROCCO_PIER_START_LEVEL_ID, ROCCO_PIER_MIDDLE_LEVEL_ID, ROCCO_PIER_END_LEVEL_ID].map(
        (id) => ({ id, title: resolveLevelTitle(id), targetLevelId: id }),
      ),
    };
  }

  private createDeveloperBaitShopLevelOption(
    resolveLevelTitle: (levelId: string) => string,
  ): RoccoDeveloperLevelOption {
    const title = resolveLevelTitle(ROCCO_BAIT_SHOP_LEVEL_ID);
    return {
      id: ROCCO_BAIT_SHOP_LEVEL_ID,
      title,
      screens: [
        {
          id: ROCCO_BAIT_SHOP_LEVEL_ID,
          title: `${title} 1`,
          targetLevelId: ROCCO_BAIT_SHOP_LEVEL_ID,
        },
        {
          id: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
          title: `${title} 2`,
          targetLevelId: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
        },
        {
          id: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
          title: resolveLevelTitle(ROCCO_BAIT_SHOP_TOILET_LEVEL_ID),
          targetLevelId: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
        },
      ],
    };
  }

  private createDeveloperNetherLevelOption(
    resolveLevelTitle: (levelId: string) => string,
  ): RoccoDeveloperLevelOption {
    const netherTitle = resolveLevelTitle(ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID);
    const resetOfficeTitle = resolveLevelTitle(ROCCO_NETHER_RESET_OFFICE_LEVEL_ID);
    const screens: readonly RoccoDeveloperLevelOption['screens'][number][] = [
      {
        id: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
        title: `${netherTitle} 1`,
        targetLevelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
      },
      {
        id: ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID,
        title: `${netherTitle} 2`,
        targetLevelId: ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID,
      },
      {
        id: ROCCO_NETHER_RESET_OFFICE_LEVEL_ID,
        title: `${resetOfficeTitle} 1`,
        targetLevelId: ROCCO_NETHER_RESET_OFFICE_LEVEL_ID,
      },
      {
        id: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
        title: `${resetOfficeTitle} 2`,
        targetLevelId: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
        forceArrivalSequence: true,
      },
    ];
    return {
      id: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
      title: netherTitle,
      screens,
    };
  }

  private createDeveloperEventLevelOptions(): readonly RoccoDeveloperEventLevelOption[] {
    return [
      {
        id: ROCCO_BAIT_SHOP_LEVEL_ID,
        title: this.options.resolveLevelTitle(ROCCO_BAIT_SHOP_LEVEL_ID),
        screens: [
          {
            id: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
            title: this.options.resolveLevelTitle(ROCCO_BAIT_SHOP_TOILET_LEVEL_ID),
            events: [
              {
                id: DEVELOPER_ALLOW_TOILET_REUSE_EVENT_ID,
                text: this.localization.text.developer.allowToiletReuseEvent,
                enabled: this.developerEvents.allowToiletReuseDuringUrgency,
              },
            ],
          },
        ],
      },
      {
        id: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
        title: this.options.resolveLevelTitle(ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID),
        screens: [
          {
            id: `${ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID}-arrival`,
            title: this.localization.text.developer.resetOfficeSecondArrival,
            events: [
              {
                id: DEVELOPER_NETHER_RESET_OFFICE_CONFIDENCE_MAX_EVENT_ID,
                text: this.localization.text.developer.netherOfficeConfidenceMaxEvent,
                enabled: false,
                showState: false,
              },
              {
                id: DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_EVENT_ID,
                text: this.localization.text.developer.resetOfficeSecondArrival,
                enabled: false,
                showState: false,
              },
            ],
          },
        ],
      },
    ];
  }

  private findDeveloperLevelOption(levelOptionId: string): RoccoDeveloperLevelOption | undefined {
    return this.createDeveloperLevelOptions().find(
      (levelOption) => levelOption.id === levelOptionId,
    );
  }

  private findDeveloperScreenOption(
    screenId: string,
  ): RoccoDeveloperLevelOption['screens'][number] | undefined {
    if (screenId === DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_SCREEN_ID) {
      return {
        id: DEVELOPER_NETHER_RESET_OFFICE_SECOND_ARRIVAL_SCREEN_ID,
        title: this.localization.text.developer.resetOfficeSecondArrival,
        targetLevelId: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
        forceArrivalSequence: true,
      };
    }

    for (const levelOption of this.createDeveloperLevelOptions()) {
      const screenOption = levelOption.screens.find((screen) => screen.id === screenId);
      if (screenOption) {
        return screenOption;
      }
    }

    return undefined;
  }

  private findDeveloperEventLevelOption(
    levelOptionId: string,
  ): RoccoDeveloperEventLevelOption | undefined {
    return this.createDeveloperEventLevelOptions().find(
      (levelOption) => levelOption.id === levelOptionId,
    );
  }

  private findDeveloperEventScreenOption(
    screenId: string,
  ): RoccoDeveloperEventLevelOption['screens'][number] | undefined {
    for (const levelOption of this.createDeveloperEventLevelOptions()) {
      const screenOption = levelOption.screens.find((screen) => screen.id === screenId);
      if (screenOption) {
        return screenOption;
      }
    }

    return undefined;
  }

  private handleDeveloperJumpSceneClick(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoSceneClickAction,
  ): boolean {
    if (!this.isDeveloperModeEnabled(engine) || !this.developerJumpPending) {
      return false;
    }

    const player = engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    this.developerJumpPending = false;
    engine.video.actionMenus.closeMenu();
    engine.video.gridMenus.closeMenu();
    engine.video.messages.clearMessages();

    if (!player) {
      this.options.refreshStatus();
      return true;
    }

    const scaleX = player.transform.scaleX || 1;
    const scaleY = player.transform.scaleY || 1;
    engine.video.sprites.stopMovement(ROCCO_PLAYER_CONFIG.ids.instance);
    engine.video.sprites.setPosition(
      ROCCO_PLAYER_CONFIG.ids.instance,
      activation.sceneX - ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * scaleX,
      activation.sceneY - ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * scaleY,
      {
        constrainToWalkMap: false,
      },
    );
    this.options.refreshStatus();
    return true;
  }

  private activateDeveloperSpriteCycleMode(engine: CartridgeSdkV1Runtime): void {
    if (!this.isDeveloperModeEnabled(engine)) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateSpriteCycleMode(engine);
    this.developerSpriteCycleIndexes.clear();
    this.developerSpriteCycleActive = true;
    engine.video.actionMenus.closeMenu();
    engine.video.gridMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.options.refreshStatus();
  }

  private handleDeveloperSpriteCycleSceneClick(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoSceneClickAction,
  ): boolean {
    if (!this.isDeveloperModeEnabled(engine) || !this.developerSpriteCycleActive) {
      return false;
    }

    if (!activation.targetInstanceId) {
      this.deactivateSpriteCycleMode(engine);
      this.options.refreshStatus();
      return true;
    }

    const sprite = engine.video.sprites.getSprite(activation.targetInstanceId);
    if (!sprite) {
      this.deactivateSpriteCycleMode(engine);
      this.options.refreshStatus();
      return true;
    }

    this.showNextDeveloperSpriteCyclePreview(engine, sprite);
    return true;
  }

  private showNextDeveloperSpriteCyclePreview(
    engine: CartridgeSdkV1Runtime,
    sprite: RoccoSpriteInstance,
  ): void {
    const definition = this.ensureDeveloperSpriteCycleDefinition(engine, sprite.definitionId);
    if (!definition || definition.images.length === 0) {
      return;
    }

    if (!this.developerSpriteCycleOriginalStates.has(sprite.id)) {
      this.developerSpriteCycleOriginalStates.set(sprite.id, {
        animationId: sprite.animation.animationId,
        frameIndex: sprite.animation.frameIndex,
        playbackRate: sprite.animation.playbackRate,
        playing: sprite.animation.playing,
        action: sprite.action ? { ...sprite.action } : undefined,
        facing: sprite.facing,
      });
    }

    const nextIndex =
      ((this.developerSpriteCycleIndexes.get(sprite.id) ?? -1) + 1) % definition.images.length;
    this.developerSpriteCycleIndexes.set(sprite.id, nextIndex);
    engine.video.sprites.playAnimation(sprite.id, DEVELOPER_SPRITE_CYCLE_ANIMATION_ID, {
      restart: sprite.animation.animationId !== DEVELOPER_SPRITE_CYCLE_ANIMATION_ID,
    });
    engine.video.sprites.setAnimationFrame(sprite.id, nextIndex);
    engine.video.sprites.stopAnimation(sprite.id);

    const preview = this.resolveDeveloperSpriteCyclePreview(definition, nextIndex);
    if (!preview) {
      return;
    }

    this.updateDeveloperSpriteCycleTitles(engine, sprite.id, preview, nextIndex);
  }

  private ensureDeveloperSpriteCycleDefinition(
    engine: CartridgeSdkV1Runtime,
    definitionId: string,
  ): RoccoSpriteDefinition | undefined {
    const definition = engine.video.sprites.getSpriteDefinition(definitionId);
    if (!definition) {
      return undefined;
    }

    if (Object.hasOwn(definition.animations, DEVELOPER_SPRITE_CYCLE_ANIMATION_ID)) {
      return definition;
    }

    const existingFrameByImageId = new Map<string, RoccoSpriteFrame>();
    for (const frame of definition.frames) {
      if (!existingFrameByImageId.has(frame.imageId)) {
        existingFrameByImageId.set(frame.imageId, frame);
      }
    }

    const extraFrames: RoccoSpriteFrame[] = [];
    const previewFrameReferences = definition.images.map((image, index) => {
      const existingFrame = existingFrameByImageId.get(image.id);
      if (existingFrame) {
        return {
          frameId: existingFrame.id,
          durationMs: DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS,
        };
      }

      const frameId = `${DEVELOPER_SPRITE_CYCLE_FRAME_ID_PREFIX}-${index}`;
      extraFrames.push({
        id: frameId,
        imageId: image.id,
        durationMs: DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS,
        pivot: definition.pivot,
        hitbox: definition.hitbox,
      });
      return {
        frameId,
        durationMs: DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS,
      };
    });

    const augmentedDefinition: RoccoSpriteDefinition = {
      ...definition,
      frames: [...definition.frames, ...extraFrames],
      animations: {
        ...definition.animations,
        [DEVELOPER_SPRITE_CYCLE_ANIMATION_ID]: {
          id: DEVELOPER_SPRITE_CYCLE_ANIMATION_ID,
          loop: true,
          playbackRate: 1,
          frames: previewFrameReferences,
        },
      },
    };

    engine.video.sprites.loadSpriteDefinition(augmentedDefinition);
    return augmentedDefinition;
  }

  private resolveDeveloperSpriteCyclePreview(
    definition: RoccoSpriteDefinition,
    imageIndex: number,
  ): RoccoDeveloperSpriteCyclePreview | undefined {
    const clip = definition.animations[DEVELOPER_SPRITE_CYCLE_ANIMATION_ID];
    const image = definition.images[imageIndex];
    const frameId = clip?.frames[imageIndex]?.frameId;
    if (!image || !frameId) {
      return undefined;
    }

    const frame = definition.frames.find((candidate) => candidate.id === frameId);
    if (!frame) {
      return undefined;
    }

    return { image, frame };
  }

  private updateDeveloperSpriteCycleTitles(
    engine: CartridgeSdkV1Runtime,
    instanceId: string,
    preview: RoccoDeveloperSpriteCyclePreview,
    imageIndex: number,
  ): void {
    const sprite = engine.video.sprites.getSprite(instanceId);
    if (!sprite) {
      return;
    }

    const indexText = String(imageIndex);
    const labelPosition = this.resolveDeveloperSpriteCycleLabelPosition(sprite, preview);
    engine.video.titles.addTitle({
      id: DEVELOPER_SPRITE_CYCLE_TOP_TITLE_ID,
      text: indexText,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: ROCCO_PLAYER_CONFIG.placement.centerGroundX,
      y: 34,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#d7e6c5',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 28,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#0f1610',
          width: 5,
          alpha: 0.95,
        },
      },
      visible: true,
    });
    engine.video.titles.addTitle({
      id: DEVELOPER_SPRITE_CYCLE_SPRITE_TITLE_ID,
      text: indexText,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: labelPosition.x,
      y: labelPosition.y,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#8ecf6e',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 22,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#0f1610',
          width: 4,
          alpha: 0.95,
        },
      },
      visible: true,
    });
  }

  private resolveDeveloperSpriteCycleLabelPosition(
    sprite: RoccoSpriteInstance,
    preview: RoccoDeveloperSpriteCyclePreview,
  ): RoccoPoint {
    const previewWidth = preview.frame.rect?.width ?? preview.image.width ?? 0;
    const pivot = preview.frame.pivot ?? { x: 0, y: 0 };
    const scaleX = sprite.transform.scaleX || 1;
    const scaleY = sprite.transform.scaleY || 1;
    const horizontalDirection = sprite.transform.flipX ? -1 : 1;
    const x = sprite.transform.x + (previewWidth / 2 - pivot.x) * scaleX * horizontalDirection;
    const y = Math.max(22, sprite.transform.y - pivot.y * scaleY - 18);
    return { x, y };
  }

  private restoreDeveloperSpriteCycleState(
    engine: CartridgeSdkV1Runtime,
    instanceId: string,
    originalState: RoccoDeveloperSpriteCycleOriginalState,
  ): void {
    const sprite = engine.video.sprites.getSprite(instanceId);
    if (!sprite) {
      return;
    }

    try {
      if (originalState.action) {
        engine.video.sprites.playAction(instanceId, originalState.action.actionId, {
          direction: originalState.action.direction,
          restart: true,
          playbackRate: originalState.playbackRate,
        });
      } else {
        engine.video.sprites.playAnimation(instanceId, originalState.animationId, {
          restart: true,
          playbackRate: originalState.playbackRate,
        });
      }
      engine.video.sprites.setAnimationFrame(instanceId, originalState.frameIndex);
      if (originalState.facing) {
        engine.video.sprites.setFacing(instanceId, originalState.facing);
      }
      if (!originalState.playing) {
        engine.video.sprites.stopAnimation(instanceId);
      }
    } catch (error) {
      engine.log('System', `Developer sprite cycle restore failed: ${String(error)}`);
    }
  }

  private isDeveloperModeEnabled(engine: CartridgeSdkV1Runtime | null | undefined): boolean {
    return isRoccoDeveloperModeEnabled(engine);
  }

  private isDeveloperGridMenuId(definitionId: string): boolean {
    return [
      ROCCO_DEVELOPER_ROOT_MENU_ID,
      ROCCO_DEVELOPER_LEVEL_MENU_ID,
      ROCCO_DEVELOPER_SCREEN_MENU_ID,
      ROCCO_DEVELOPER_INVENTORY_MENU_ID,
      ROCCO_DEVELOPER_EVENT_LEVEL_MENU_ID,
      ROCCO_DEVELOPER_EVENT_SCREEN_MENU_ID,
      ROCCO_DEVELOPER_EVENT_MENU_ID,
    ].includes(definitionId);
  }

  canHandleGridMenuAction(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoGridMenuActivation,
  ): boolean {
    return (
      this.isDeveloperModeEnabled(engine) && this.isDeveloperGridMenuId(activation.definitionId)
    );
  }

  canHandleSceneClick(engine: CartridgeSdkV1Runtime, _activation?: RoccoSceneClickAction): boolean {
    return (
      this.isDeveloperModeEnabled(engine) &&
      (this.developerSpriteCycleActive || this.developerJumpPending)
    );
  }

  canHandlePlayerAction(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoActionMenuActivation,
  ): boolean {
    return this.isDeveloperModeEnabled(engine) && isRoccoPlayerDeveloperAction(activation);
  }

  clearTransientState(engine?: CartridgeSdkV1Runtime | null): void {
    this.developerJumpPending = false;
    this.deactivateSpriteCycleMode(engine);
  }

  resetRuntimeState(engine?: CartridgeSdkV1Runtime | null): void {
    this.clearTransientState(engine);
    this.developerEvents.allowToiletReuseDuringUrgency = false;
    this.developerEventScreenSelectionId = undefined;
  }

  restoreSnapshot(
    snapshot: RoccoDeveloperRuntimeSnapshot,
    engine?: CartridgeSdkV1Runtime | null,
  ): void {
    const isEventChanged =
      this.developerEvents.allowToiletReuseDuringUrgency !== snapshot.allowToiletReuseDuringUrgency;
    this.deactivateSpriteCycleMode(engine);
    this.developerJumpPending = snapshot.developerJumpPending;
    this.developerEventScreenSelectionId = snapshot.developerEventScreenSelectionId;
    this.developerEvents.allowToiletReuseDuringUrgency = snapshot.allowToiletReuseDuringUrgency;
    if (isEventChanged) {
      this.options.onToiletReuseEventChanged?.();
    }
  }

  createSnapshot(): RoccoDeveloperRuntimeSnapshot {
    return {
      allowToiletReuseDuringUrgency: this.developerEvents.allowToiletReuseDuringUrgency,
      developerJumpPending: this.developerJumpPending,
      developerEventScreenSelectionId: this.developerEventScreenSelectionId,
    };
  }

  buildStatusMessage(baseStatus: string): string {
    if (this.developerSpriteCycleActive) {
      return `${baseStatus} | ${this.localization.text.developer.clickToCycleSpriteStatus}`;
    }

    if (!this.developerJumpPending) {
      return baseStatus;
    }

    return `${baseStatus} | ${this.localization.text.developer.clickToJumpStatus}`;
  }

  isToiletReuseAllowedDuringUrgency(): boolean {
    return this.developerEvents.allowToiletReuseDuringUrgency;
  }

  get isJumpPending(): boolean {
    return this.developerJumpPending;
  }

  get isSpriteCycleActive(): boolean {
    return this.developerSpriteCycleActive;
  }

  handlePlayerAction(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoActionMenuActivation,
  ): boolean {
    if (!this.canHandlePlayerAction(engine, activation)) {
      return false;
    }

    this.openDeveloperRootMenu(engine);
    return true;
  }

  handleGridMenuAction(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoGridMenuActivation,
  ): boolean {
    if (!this.canHandleGridMenuAction(engine, activation)) {
      return false;
    }

    if (activation.interaction !== 'activate') {
      return true;
    }

    switch (activation.definitionId) {
      case ROCCO_DEVELOPER_ROOT_MENU_ID: {
        this.handleDeveloperRootSelection(engine, activation.itemId);
        return true;
      }
      case ROCCO_DEVELOPER_LEVEL_MENU_ID: {
        if (activation.itemId) {
          this.openDeveloperScreenMenu(engine, activation.itemId);
        }
        return true;
      }
      case ROCCO_DEVELOPER_SCREEN_MENU_ID: {
        if (activation.itemId) {
          void this.prepareDeveloperJump(engine, activation.itemId);
        }
        return true;
      }
      case ROCCO_DEVELOPER_INVENTORY_MENU_ID: {
        if (activation.itemId) {
          this.toggleDeveloperInventoryItem(engine, activation.itemId);
        }
        return true;
      }
      case ROCCO_DEVELOPER_EVENT_LEVEL_MENU_ID: {
        if (activation.itemId) {
          this.openDeveloperEventScreenMenu(engine, activation.itemId);
        }
        return true;
      }
      case ROCCO_DEVELOPER_EVENT_SCREEN_MENU_ID: {
        if (activation.itemId) {
          this.openDeveloperEventMenu(engine, activation.itemId);
        }
        return true;
      }
      case ROCCO_DEVELOPER_EVENT_MENU_ID: {
        if (activation.itemId) {
          this.toggleDeveloperEvent(engine, activation.itemId);
        }
        return true;
      }
      default: {
        return false;
      }
    }
  }

  handleSceneClick(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoSceneClickAction,
  ): CartridgeActionDisposition | undefined {
    if (this.handleDeveloperSpriteCycleSceneClick(engine, activation)) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (this.handleDeveloperJumpSceneClick(engine, activation)) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    return undefined;
  }

  deactivateSpriteCycleMode(engine?: CartridgeSdkV1Runtime | null): void {
    if (engine) {
      for (const [instanceId, originalState] of this.developerSpriteCycleOriginalStates) {
        this.restoreDeveloperSpriteCycleState(engine, instanceId, originalState);
      }
      engine.video.titles.removeTitle(DEVELOPER_SPRITE_CYCLE_TOP_TITLE_ID);
      engine.video.titles.removeTitle(DEVELOPER_SPRITE_CYCLE_SPRITE_TITLE_ID);
    }

    this.developerSpriteCycleActive = false;
    this.developerSpriteCycleIndexes.clear();
    this.developerSpriteCycleOriginalStates.clear();
  }
}
