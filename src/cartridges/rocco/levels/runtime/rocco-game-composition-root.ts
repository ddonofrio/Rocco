import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoLevelMountOptions, RoccoLevel } from '../rocco-level-types';
import { ROCCO_BAIT_SHOP_TOILET_LEVEL_ID } from '../../games/rocco-default/maps/shop';
import {
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
  ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
  RoccoInventory,
  createRoccoMagazineInventoryItem,
  createRoccoMysteriousKeyInventoryItem,
  planRoccoCoralRelicAssembly,
} from '../../games/rocco-default/inventory';
import {
  createRoccoDefaultGameMaps,
  ROCCO_DEFAULT_GAME_CROSS_CONNECTIONS,
  ROCCO_DEFAULT_GAME_ID,
} from '../../games/rocco-default';
import { ROCCO_PIER_START_LEVEL_ID } from '../../games/rocco-default/maps/pier/pier-level-ids';
import {
  installPierBeginningAmbient,
  type RoccoPierBeginningAmbientPersistentState,
} from '../../games/rocco-default/maps/pier';
import { createRoccoInteractionRegistry } from '../../interactions';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import { RoccoInventoryRuntimeController } from './rocco-inventory-runtime-controller';
import { RoccoLevelRegistry } from './rocco-level-registry';
import { RoccoLevelTransitionController } from './rocco-level-transition-controller';
import { RoccoLevelTransitionService } from './rocco-level-transition-service';
import { RoccoSceneActionRouter } from './rocco-scene-action-router';
import { RoccoScriptedSequenceController } from './rocco-scripted-sequence-controller';
import { isRoccoAppearanceCapability } from './rocco-level-capabilities';
import { RpceGameCompiler, type RpceCompiledGame } from '../../rpce/core';
import type { RoccoLocalization } from '../../games/rocco-default/localization';
import type { RoccoPlayerAppearance } from '../../games/rocco-default/player';
import type { RoccoPoint } from '../../../../console/video/sprites';
import type { RoccoInventoryItem } from '../../games/rocco-default/inventory';
import {
  RoccoFinalScreenSession,
  type RoccoFinalScreenInvocation,
} from './rocco-final-screen-session';

import { ROCCO_PLAYER_CONFIG } from '../../games/rocco-default/player/rocco-player-config';
import { PIER_BAIT_SHOP_DOOR_CONFIG } from '../../games/rocco-default/maps/pier/pier-bait-shop-door-config';

const BAIT_SHOP_DOOR_PLAYER_RIGHT_EDGE_OFFSET = Math.round(
  (ROCCO_PLAYER_CONFIG.frame.width - ROCCO_PLAYER_CONFIG.frame.groundAnchor.x) *
    ROCCO_PLAYER_CONFIG.motion.scale,
);
const BAIT_SHOP_DOOR_END_GROUND_X =
  PIER_BAIT_SHOP_DOOR_CONFIG.x +
  PIER_BAIT_SHOP_DOOR_CONFIG.width -
  BAIT_SHOP_DOOR_PLAYER_RIGHT_EDGE_OFFSET;

export interface RoccoGameCompositionRootCallbacks {
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  setActiveLevel: (level: RoccoLevel | null) => void;
  cancelActiveActions: (reason: string) => void;
  createMountOptions: () => RoccoLevelMountOptions;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
  resolvePlayerBaseScale: () => number;
  resolveDroppedInventoryGroundPoint: () => RoccoPoint | undefined;
  tryAddItemToInventory: (item: RoccoInventoryItem) => boolean;
  storeDroppedInventoryItem: (
    levelId: string,
    droppedItem: { item: RoccoInventoryItem; groundPoint: RoccoPoint },
  ) => boolean;
  syncActiveLevelDroppedInventoryPresentation: () => void;
  refreshStatus: () => void;
  hasAccessibleInventoryItem: (levelId: string, itemId: string) => boolean;
  listAccessibleInventoryItemIds: (levelId: string) => string[];
  openInventoryTransferMenu: (storageId: string, onInventoryClosed?: () => void) => void;
  closeInventoryTransferMenu: (storageId: string) => void;
  switchToLevel: (
    levelId: string,
    entryConnectorId?: string,
    shouldForceArrivalSequence?: boolean,
  ) => Promise<boolean>;
  requestFinalScreen: (invocation: RoccoFinalScreenInvocation) => void;
  enterBaitShop: () => Promise<void>;
  canCollectIntoInventory: (itemId: string, shouldShowFullMessage?: boolean) => boolean;
  resolveLevelTitle: (levelId: string) => string;
  onRestartRequested?: () => void;
  getRoccoAppearance: () => RoccoPlayerAppearance;
  setRoccoAppearance: (appearance: RoccoPlayerAppearance) => void;
  isStanIdentified: () => boolean;
  isStanAwake: () => boolean;
  doesPlayerOverlapBaitShopDoor: () => boolean;
  onToiletReuseEventChanged: () => void;
  onNetherOfficeConfidenceMaxRequested: () => void;
  finalScreenSession: RoccoFinalScreenSession;
}

export interface RoccoGameCompositionRootOptions {
  localization: RoccoLocalization;
  inventory?: RoccoInventory;
  beginningAmbientState: RoccoPierBeginningAmbientPersistentState;
  callbacks: RoccoGameCompositionRootCallbacks;
}

export interface RoccoGameComposition {
  readonly levelRegistry: RoccoLevelRegistry;
  readonly transitions: RoccoLevelTransitionController;
  readonly inventoryRuntime: RoccoInventoryRuntimeController;
  readonly droppedInventory: RoccoDroppedInventoryController;
  readonly scriptedSequences: RoccoScriptedSequenceController;
  readonly developerRuntime: RoccoDeveloperRuntimeController;
  readonly actionRouter: RoccoSceneActionRouter;
  readonly levelTransitionService: RoccoLevelTransitionService;
  readonly compiledGame: RpceCompiledGame<RoccoLevel>;
}

interface RoccoRuntimeControllerBundle {
  readonly droppedInventory: RoccoDroppedInventoryController;
  readonly scriptedSequences: RoccoScriptedSequenceController;
  readonly inventoryRuntime: RoccoInventoryRuntimeController;
  readonly developerRuntime: RoccoDeveloperRuntimeController;
  getActionRouter(): RoccoSceneActionRouter;
  setActionRouter(actionRouter: RoccoSceneActionRouter): void;
  setTransitions(transitions: RoccoLevelTransitionController): void;
}

function createRuntimeControllers(
  options: RoccoGameCompositionRootOptions,
): RoccoRuntimeControllerBundle {
  const { callbacks, localization } = options;
  let transitions: RoccoLevelTransitionController | undefined;
  let actionRouter: RoccoSceneActionRouter | undefined;
  const droppedInventory = new RoccoDroppedInventoryController({
    localization,
    resolvePlayerGroundPoint: callbacks.resolvePlayerGroundPoint,
    resolvePlayerBaseScale: callbacks.resolvePlayerBaseScale,
    tryAddItemToInventory: callbacks.tryAddItemToInventory,
  });
  const scriptedSequences = new RoccoScriptedSequenceController({
    localization,
    onRestartRequested: callbacks.onRestartRequested,
    onEnterBaitShopRequested: callbacks.enterBaitShop,
    clearPendingExitIntent: () => transitionControllerOrThrow(transitions).clearPendingExitIntent(),
    resolvePlayerGroundPoint: callbacks.resolvePlayerGroundPoint,
    doesPlayerOverlapBaitShopDoor: callbacks.doesPlayerOverlapBaitShopDoor,
    isStanAwake: callbacks.isStanAwake,
    baitShopDoorEndGroundX: BAIT_SHOP_DOOR_END_GROUND_X,
  });
  const inventoryRuntime = new RoccoInventoryRuntimeController({
    localization,
    inventory: options.inventory,
    getActiveLevelId: () => callbacks.getActiveLevel()?.id ?? null,
    handleSpecialSceneClick: (activation, carriedItem) =>
      actionRouterOrThrow(actionRouter).handleSpecialInventorySceneClick(activation, carriedItem),
    resolveDroppedInventoryGroundPoint: callbacks.resolveDroppedInventoryGroundPoint,
    storeDroppedInventoryItem: callbacks.storeDroppedInventoryItem,
    syncWorldPresentation: callbacks.syncActiveLevelDroppedInventoryPresentation,
    refreshStatus: callbacks.refreshStatus,
  });
  const developerRuntime = createDeveloperRuntimeController(options, inventoryRuntime);
  return {
    droppedInventory,
    scriptedSequences,
    inventoryRuntime,
    developerRuntime,
    getActionRouter: () => actionRouterOrThrow(actionRouter),
    setActionRouter: (value) => {
      actionRouter = value;
    },
    setTransitions: (value) => {
      transitions = value;
    },
  };
}

function createDeveloperRuntimeController(
  options: RoccoGameCompositionRootOptions,
  inventoryRuntime: RoccoInventoryRuntimeController,
): RoccoDeveloperRuntimeController {
  const { callbacks, localization } = options;
  return new RoccoDeveloperRuntimeController({
    localization,
    inventory: inventoryRuntime.getPlayerInventory(),
    getRoccoAppearance: callbacks.getRoccoAppearance,
    setRoccoAppearance: callbacks.setRoccoAppearance,
    resolveLevelTitle: callbacks.resolveLevelTitle,
    switchToLevel: (levelId, entryConnectorId, shouldForceArrivalSequence) =>
      callbacks.switchToLevel(levelId, entryConnectorId, shouldForceArrivalSequence),
    requestFinalScreen: callbacks.requestFinalScreen,
    canCollectInventoryItem: callbacks.canCollectIntoInventory,
    refreshStatus: callbacks.refreshStatus,
    onToiletReuseEventChanged: callbacks.onToiletReuseEventChanged,
    onNetherOfficeConfidenceMaxRequested: callbacks.onNetherOfficeConfidenceMaxRequested,
  });
}

function transitionControllerOrThrow(
  transitions: RoccoLevelTransitionController | undefined,
): RoccoLevelTransitionController {
  if (!transitions) {
    throw new Error('Rocco transition controller was used before composition completed.');
  }
  return transitions;
}

function actionRouterOrThrow(
  actionRouter: RoccoSceneActionRouter | undefined,
): RoccoSceneActionRouter {
  if (!actionRouter) {
    throw new Error('Rocco action router was used before composition completed.');
  }
  return actionRouter;
}

function createCompiledGame(
  options: RoccoGameCompositionRootOptions,
  controllers: RoccoRuntimeControllerBundle,
): RpceCompiledGame<RoccoLevel> {
  const { callbacks, localization, beginningAmbientState } = options;
  const inventory = controllers.inventoryRuntime.getPlayerInventory();
  const compiledMaps = createRoccoDefaultGameMaps({
    localization,
    finalScreenSession: callbacks.finalScreenSession,
    mountPierBeginningAmbient: (
      engine,
      _localization,
      _persistentState,
      _preloader,
      entryConnectorId,
    ) =>
      installPierBeginningAmbient(
        engine,
        localization,
        beginningAmbientState,
        undefined,
        entryConnectorId,
      ),
    isStanIdentified: callbacks.isStanIdentified,
    hasMysteriousKey: () => inventory.hasItem(ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID),
    onMysteriousKeyCollected: () =>
      callbacks.tryAddItemToInventory(createRoccoMysteriousKeyInventoryItem(localization)),
    hasMagazine: () => inventory.hasItem(ROCCO_INVENTORY_MAGAZINE_ITEM_ID),
    onMagazineCollected: (isKnown) =>
      callbacks.tryAddItemToInventory(createRoccoMagazineInventoryItem(localization, isKnown)),
    hasCoralRelic: () =>
      callbacks.hasAccessibleInventoryItem(
        ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
        ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
      ),
    getCoralRelicAssemblyPlan: () =>
      planRoccoCoralRelicAssembly(
        callbacks.listAccessibleInventoryItemIds(ROCCO_BAIT_SHOP_TOILET_LEVEL_ID),
      ),
    allowToiletReuseDuringUrgency: () =>
      controllers.developerRuntime.isToiletReuseAllowedDuringUrgency(),
    openStorageInventory: callbacks.openInventoryTransferMenu,
    closeStorageInventory: callbacks.closeInventoryTransferMenu,
    onExitShopRequested: () => {
      void callbacks.switchToLevel(ROCCO_PIER_START_LEVEL_ID, 'shop-exit');
    },
  });
  return new RpceGameCompiler().compile({
    id: ROCCO_DEFAULT_GAME_ID,
    title: 'ROCCO',
    initialMapId: 'pier',
    maps: compiledMaps,
    connections: ROCCO_DEFAULT_GAME_CROSS_CONNECTIONS,
  });
}

function createActionRouter(
  options: RoccoGameCompositionRootOptions,
  controllers: RoccoRuntimeControllerBundle,
  transitions: RoccoLevelTransitionController,
): RoccoSceneActionRouter {
  const { callbacks, localization } = options;
  const inventory = controllers.inventoryRuntime.getPlayerInventory();
  return new RoccoSceneActionRouter({
    localization,
    inventory,
    transitions,
    inventoryRuntime: controllers.inventoryRuntime,
    droppedInventory: controllers.droppedInventory,
    scriptedSequences: controllers.scriptedSequences,
    developerRuntime: controllers.developerRuntime,
    registry: createRoccoInteractionRegistry(),
    getSdk: callbacks.getEngine,
    getActiveLevel: callbacks.getActiveLevel,
    getRoccoAppearance: callbacks.getRoccoAppearance,
    setRoccoAppearance: (appearance) => {
      callbacks.setRoccoAppearance(appearance);
      const activeLevel = callbacks.getActiveLevel();
      if (activeLevel && isRoccoAppearanceCapability(activeLevel)) {
        activeLevel.applyRoccoAppearance(appearance);
      }
    },
    isStanIdentified: callbacks.isStanIdentified,
    isStanAwake: callbacks.isStanAwake,
  });
}

export function createRoccoGameCompositionRoot(
  options: RoccoGameCompositionRootOptions,
): RoccoGameComposition {
  const { callbacks } = options;
  const controllers = createRuntimeControllers(options);
  const compiledGame = createCompiledGame(options, controllers);
  const inventory = controllers.inventoryRuntime.getPlayerInventory();
  const transitions = new RoccoLevelTransitionController({
    compiledGame,
    canTraverseConnector: (connector) =>
      !connector.requiresKeys || inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
    resolvePlayerGroundPoint: callbacks.resolvePlayerGroundPoint,
  });
  controllers.setTransitions(transitions);
  const levelTransitionService = new RoccoLevelTransitionService({
    getEngine: callbacks.getEngine,
    getActiveLevel: callbacks.getActiveLevel,
    setActiveLevel: callbacks.setActiveLevel,
    cancelActiveActions: callbacks.cancelActiveActions,
    createMountOptions: callbacks.createMountOptions,
  });
  const actionRouter = createActionRouter(options, controllers, transitions);
  controllers.setActionRouter(actionRouter);
  const levelRegistry = new RoccoLevelRegistry({ compiledGame });
  return {
    levelRegistry,
    transitions,
    inventoryRuntime: controllers.inventoryRuntime,
    droppedInventory: controllers.droppedInventory,
    scriptedSequences: controllers.scriptedSequences,
    developerRuntime: controllers.developerRuntime,
    actionRouter,
    levelTransitionService,
    compiledGame,
  };
}
