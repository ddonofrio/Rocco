import type { RoccoEngine } from '../../console/engine-sdk';
import type { RoccoGridMenuDefinition } from '../../console/video/grid-menu';
import { createRoccoDialogueChoiceMenu } from './rpce/dialogue';
import type { RoccoLocalization } from './localization';
import {
  createRoccoCoralRelicInventoryItem,
  createRoccoKeysInventoryItem,
  createRoccoMagazineInventoryItem,
  createRoccoMysteriousKeyInventoryItem,
  createRoccoTwentyEurosInventoryItem,
  type RoccoInventory,
  type RoccoInventoryItem,
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
  ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from './inventory';

export const ROCCO_PLAYER_DEVELOPER_ACTION_ID = 'open-developer-mode';
export const ROCCO_DEVELOPER_ROOT_MENU_ID = 'rocco-developer-mode-menu';
export const ROCCO_DEVELOPER_LEVEL_MENU_ID = 'rocco-developer-level-menu';
export const ROCCO_DEVELOPER_SCREEN_MENU_ID = 'rocco-developer-screen-menu';
export const ROCCO_DEVELOPER_INVENTORY_MENU_ID = 'rocco-developer-inventory-menu';
export const ROCCO_DEVELOPER_EVENT_LEVEL_MENU_ID = 'rocco-developer-event-level-menu';
export const ROCCO_DEVELOPER_EVENT_SCREEN_MENU_ID = 'rocco-developer-event-screen-menu';
export const ROCCO_DEVELOPER_EVENT_MENU_ID = 'rocco-developer-event-menu';
export const ROCCO_DEVELOPER_JUMP_CHOICE_ID = 'jump';
export const ROCCO_DEVELOPER_INVENTORY_CHOICE_ID = 'inventory';
export const ROCCO_DEVELOPER_EVENTS_CHOICE_ID = 'events';
export const ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID = 'cycle-sprite';
const ROCCO_DEVELOPER_MAGAZINE_CHOICE_ID = 'developer-magazine';
const ROCCO_DEVELOPER_MICROMANIA_CHOICE_ID = 'developer-micromania';

export function isRoccoDeveloperModeEnabled(
  engine: Pick<RoccoEngine, 'isDeveloperModeEnabled'> | null | undefined,
): boolean {
  return engine?.isDeveloperModeEnabled?.() ?? false;
}

export interface RoccoDeveloperScreenOption {
  id: string;
  title: string;
  targetLevelId: string;
  requiresPlacementClick?: boolean;
}

export interface RoccoDeveloperLevelOption {
  id: string;
  title: string;
  screens: readonly RoccoDeveloperScreenOption[];
}

export interface RoccoDeveloperEventOption {
  id: string;
  text: string;
  enabled: boolean;
}

export interface RoccoDeveloperEventScreenOption {
  id: string;
  title: string;
  events: readonly RoccoDeveloperEventOption[];
}

export interface RoccoDeveloperEventLevelOption {
  id: string;
  title: string;
  screens: readonly RoccoDeveloperEventScreenOption[];
}

interface RoccoDeveloperInventoryOption {
  itemId: string;
  itemLabel: string;
  present: boolean;
}

export function createRoccoDeveloperRootMenuDefinition(
  localization: RoccoLocalization,
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_ROOT_MENU_ID,
    title: localization.text.developer.title,
    choices: [
      {
        id: ROCCO_DEVELOPER_JUMP_CHOICE_ID,
        text: localization.text.developer.jump,
      },
      {
        id: ROCCO_DEVELOPER_INVENTORY_CHOICE_ID,
        text: localization.text.developer.inventory,
      },
      {
        id: ROCCO_DEVELOPER_EVENTS_CHOICE_ID,
        text: localization.text.developer.events,
      },
      {
        id: ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID,
        text: localization.text.developer.cycleSprite,
      },
    ],
  }).gridMenu;
}

export function createRoccoDeveloperLevelMenuDefinition(
  localization: RoccoLocalization,
  levels: readonly RoccoDeveloperLevelOption[],
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_LEVEL_MENU_ID,
    title: localization.text.developer.jumpLevelTitle,
    choices: levels.map((level) => ({
      id: level.id,
      text: level.title,
    })),
  }).gridMenu;
}

export function createRoccoDeveloperScreenMenuDefinition(
  localization: RoccoLocalization,
  screens: readonly RoccoDeveloperScreenOption[],
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_SCREEN_MENU_ID,
    title: localization.text.developer.jumpScreenTitle,
    choices: screens.map((screen) => ({
      id: screen.id,
      text: screen.title,
    })),
  }).gridMenu;
}

export function createRoccoDeveloperInventoryMenuDefinition(
  localization: RoccoLocalization,
  inventory: RoccoInventory,
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_INVENTORY_MENU_ID,
    title: localization.text.developer.inventoryTitle,
    choices: createRoccoDeveloperInventoryOptions(localization, inventory).map((option) => ({
      id: option.itemId,
      text: `${option.present ? localization.text.developer.remove : localization.text.developer.add} ${option.itemLabel}`,
    })),
  }).gridMenu;
}

export function createRoccoDeveloperEventLevelMenuDefinition(
  localization: RoccoLocalization,
  levels: readonly RoccoDeveloperEventLevelOption[],
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_EVENT_LEVEL_MENU_ID,
    title: localization.text.developer.eventLevelTitle,
    choices: levels.map((level) => ({
      id: level.id,
      text: level.title,
    })),
  }).gridMenu;
}

export function createRoccoDeveloperEventScreenMenuDefinition(
  localization: RoccoLocalization,
  screens: readonly RoccoDeveloperEventScreenOption[],
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_EVENT_SCREEN_MENU_ID,
    title: localization.text.developer.eventScreenTitle,
    choices: screens.map((screen) => ({
      id: screen.id,
      text: screen.title,
    })),
  }).gridMenu;
}

export function createRoccoDeveloperEventMenuDefinition(
  localization: RoccoLocalization,
  events: readonly RoccoDeveloperEventOption[],
): RoccoGridMenuDefinition {
  return createRoccoDialogueChoiceMenu({
    id: ROCCO_DEVELOPER_EVENT_MENU_ID,
    title: localization.text.developer.eventTitle,
    choices: events.map((event) => ({
      id: event.id,
      text: `${event.text}: ${event.enabled ? localization.text.developer.on : localization.text.developer.off}`,
    })),
  }).gridMenu;
}

export function createRoccoDeveloperInventoryItem(
  localization: RoccoLocalization,
  itemId: string,
): RoccoInventoryItem | undefined {
  switch (itemId) {
    case ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID: {
      return createRoccoCoralRelicInventoryItem(localization);
    }
    case ROCCO_INVENTORY_KEYS_ITEM_ID: {
      return createRoccoKeysInventoryItem(localization);
    }
    case ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID: {
      return createRoccoMysteriousKeyInventoryItem(localization);
    }
    case ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID: {
      return createRoccoTwentyEurosInventoryItem(localization);
    }
    case ROCCO_DEVELOPER_MAGAZINE_CHOICE_ID: {
      return createRoccoMagazineInventoryItem(localization, false);
    }
    case ROCCO_DEVELOPER_MICROMANIA_CHOICE_ID: {
      return createRoccoMagazineInventoryItem(localization, true);
    }
    default: {
      return undefined;
    }
  }
}

function createRoccoDeveloperInventoryOptions(
  localization: RoccoLocalization,
  inventory: RoccoInventory,
): readonly RoccoDeveloperInventoryOption[] {
  const currentMagazineLabel =
    inventory.listItems().find((item) => item.id === ROCCO_INVENTORY_MAGAZINE_ITEM_ID)?.label ?? undefined;

  return [
    {
      itemId: ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
      itemLabel: createRoccoCoralRelicInventoryItem(localization).label,
      present: inventory.hasItem(ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID),
    },
    {
      itemId: ROCCO_INVENTORY_KEYS_ITEM_ID,
      itemLabel: localization.text.inventory.keysLabel,
      present: inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
    },
    {
      itemId: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
      itemLabel: localization.text.inventory.twentyEurosLabel,
      present: inventory.hasItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID),
    },
    {
      itemId: ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
      itemLabel: localization.text.inventory.mysteriousKeyLabel,
      present: inventory.hasItem(ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID),
    },
    {
      itemId: ROCCO_DEVELOPER_MAGAZINE_CHOICE_ID,
      itemLabel: localization.text.inventory.magazineLabel,
      present: currentMagazineLabel === localization.text.inventory.magazineLabel,
    },
    {
      itemId: ROCCO_DEVELOPER_MICROMANIA_CHOICE_ID,
      itemLabel: localization.text.inventory.micromaniaLabel,
      present: currentMagazineLabel === localization.text.inventory.micromaniaLabel,
    },
  ];
}
