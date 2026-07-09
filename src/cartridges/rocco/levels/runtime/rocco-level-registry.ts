import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_Y_VALUES,
  PIER_BACKGROUND_SCROLL_LEFT_X,
  PIER_BACKGROUND_SCROLL_RIGHT_X,
  PIER_END_SCENE_ID,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
  PIER_START_SCENE_ID,
  ROCCO_PIER_END_LEVEL_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../rocco-default-constants';
import type { RoccoLocalization } from '../../localization';
import { RoccoPierMiddleLevel } from '../pier/pier-level';
import {
  RoccoPierSideLevel,
  type RoccoPierSideLevelDefinition,
} from '../pier/pier-side-level';
import type { RoccoLevel, RoccoLevelConnector } from '../rocco-level-types';
import { RoccoBaitShopLevel } from '../bait-shop/bait-shop-level';
import { RoccoBaitShopSecondLevel } from '../bait-shop/bait-shop-second-level';
import {
  RoccoBaitShopToiletLevel,
  type RoccoBaitShopToiletLevelOptions,
} from '../bait-shop/bait-shop-toilet-level';
import { RoccoNetherConsoleHardwareSpawnLevel } from '../nether/nether-console-hardware-spawn-level';
import { RoccoNetherEndOfHallwayDoorLevel } from '../nether/nether-end-of-hallway-door-level';
import { RoccoNetherResetOfficeLevel } from '../nether/nether-reset-office-level';
import { RoccoNetherResetOfficeSecondLevel } from '../nether/nether-reset-office-second-level';

export interface RoccoLevelRegistryOptions {
  localization: RoccoLocalization;
  mountPierBeginningAmbient: NonNullable<RoccoPierSideLevelDefinition['mountAmbient']>;
  isStanIdentified: () => boolean;
  hasMysteriousKey: () => boolean;
  onMysteriousKeyCollected: () => boolean;
  hasMagazine: () => boolean;
  onMagazineCollected: (known: boolean) => boolean;
  hasCoralRelic: () => boolean;
  getCoralRelicAssemblyPlan: NonNullable<
    RoccoBaitShopToiletLevelOptions['getCoralRelicAssemblyPlan']
  >;
  allowToiletReuseDuringUrgency: () => boolean;
  openStorageInventory: (storageId: string, onInventoryClosed?: () => void) => void;
  closeStorageInventory: (storageId: string) => void;
}

const DEFAULT_ENTRY_Y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;

const PIER_START_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: 'west',
    exitArea: {
      x: 0,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_LEFT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'right',
  },
];

const PIER_END_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: 'east',
    exitArea: {
      x: DEFAULT_DESIGN_WIDTH - PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_RIGHT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'left',
  },
];

export class RoccoLevelRegistry {
  private readonly levels = new Map<string, RoccoLevel>();
  private readonly options: RoccoLevelRegistryOptions;

  constructor(options: RoccoLevelRegistryOptions) {
    this.options = options;
    this.registerLevels(this.createDefaultLevels());
  }

  requireLevel(levelId: string): RoccoLevel {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level '${levelId}' is not registered.`);
    }

    return level;
  }

  listLevels(): readonly RoccoLevel[] {
    return [...this.levels.values()];
  }

  resetNetherLevels(): void {
    this.registerLevels(this.createNetherLevels());
  }

  private registerLevels(levels: readonly RoccoLevel[]): void {
    for (const level of levels) {
      this.levels.set(level.id, level);
    }
  }

  private createDefaultLevels(): readonly RoccoLevel[] {
    return [
      new RoccoPierMiddleLevel(this.options.localization),
      new RoccoPierSideLevel({
        id: ROCCO_PIER_START_LEVEL_ID,
        title: this.options.localization.text.levels.beginning,
        sceneId: PIER_START_SCENE_ID,
        backgroundScrollX: PIER_BACKGROUND_SCROLL_RIGHT_X,
        connectors: PIER_START_CONNECTORS,
        mountAmbient: (engine) => this.options.mountPierBeginningAmbient(engine),
      }),
      new RoccoPierSideLevel({
        id: ROCCO_PIER_END_LEVEL_ID,
        title: this.options.localization.text.levels.end,
        sceneId: PIER_END_SCENE_ID,
        backgroundScrollX: PIER_BACKGROUND_SCROLL_LEFT_X,
        connectors: PIER_END_CONNECTORS,
      }),
      new RoccoBaitShopLevel(this.options.localization, {
        isStanIdentified: () => this.options.isStanIdentified(),
        hasMysteriousKey: () => this.options.hasMysteriousKey(),
        onMysteriousKeyCollected: () => this.options.onMysteriousKeyCollected(),
        onOpenStorageInventoryRequested: (storageId, onInventoryClosed) => {
          this.options.openStorageInventory(storageId, onInventoryClosed);
        },
        onCloseStorageInventoryRequested: (storageId) => {
          this.options.closeStorageInventory(storageId);
        },
      }),
      new RoccoBaitShopSecondLevel(this.options.localization, {
        hasMagazine: () => this.options.hasMagazine(),
        hasMysteriousKey: () => this.options.hasMysteriousKey(),
        onMagazineCollected: (known) => this.options.onMagazineCollected(known),
      }),
      new RoccoBaitShopToiletLevel(this.options.localization, {
        hasMagazine: () => this.options.hasMagazine(),
        hasCoralRelic: () => this.options.hasCoralRelic(),
        getCoralRelicAssemblyPlan: () => this.options.getCoralRelicAssemblyPlan(),
        allowReuseDuringUrgency: () => this.options.allowToiletReuseDuringUrgency(),
        isStanIdentified: () => this.options.isStanIdentified(),
      }),
      ...this.createNetherLevels(),
    ];
  }

  private createNetherLevels(): readonly RoccoLevel[] {
    return [
      new RoccoNetherConsoleHardwareSpawnLevel(this.options.localization),
      new RoccoNetherEndOfHallwayDoorLevel(this.options.localization),
      new RoccoNetherResetOfficeLevel(this.options.localization),
      new RoccoNetherResetOfficeSecondLevel(this.options.localization),
    ];
  }
}
