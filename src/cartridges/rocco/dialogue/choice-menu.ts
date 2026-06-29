import type { RoccoGridMenuActivation, RoccoGridMenuDefinition } from '../../../engine/video/grid-menu';

const DEFAULT_DIALOGUE_MENU_SLOT_WIDTH = 560;
const DEFAULT_DIALOGUE_MENU_SLOT_HEIGHT = 42;
const DEFAULT_DIALOGUE_MENU_GAP = 8;
const DEFAULT_DIALOGUE_MENU_PADDING = 16;

export interface RoccoDialogueChoice {
  id: string;
  text: string;
  enabled?: boolean;
}

export interface RoccoDialogueChoiceMenu {
  id: string;
  choices: readonly RoccoDialogueChoice[];
  gridMenu: RoccoGridMenuDefinition;
}

export interface RoccoDialogueChoiceMenuOptions {
  id: string;
  choices: readonly RoccoDialogueChoice[];
  title?: string;
  x?: number;
  y?: number;
}

export function createRoccoDialogueChoiceMenu(
  options: RoccoDialogueChoiceMenuOptions,
): RoccoDialogueChoiceMenu {
  const choices = options.choices.map((choice) => ({ ...choice }));

  return {
    id: options.id,
    choices,
    gridMenu: {
      id: options.id,
      title: options.title,
      layout: 'text-list',
      columns: 1,
      rows: Math.max(1, choices.length),
      x: options.x,
      y: options.y,
      slotWidth: DEFAULT_DIALOGUE_MENU_SLOT_WIDTH,
      slotHeight: DEFAULT_DIALOGUE_MENU_SLOT_HEIGHT,
      gap: DEFAULT_DIALOGUE_MENU_GAP,
      padding: DEFAULT_DIALOGUE_MENU_PADDING,
      closeOnActivate: true,
      reorderable: false,
      panelFill: '#10170f',
      panelStroke: '#d7e6c5',
      slotFill: '#182317',
      slotStroke: '#5b704f',
      hoverStroke: '#8ecf6e',
      items: choices.map((choice, index) => ({
        id: choice.id,
        label: choice.text,
        enabled: choice.enabled,
        slotIndex: index,
      })),
    },
  };
}

export function resolveRoccoDialogueChoice(
  menu: RoccoDialogueChoiceMenu,
  activation: RoccoGridMenuActivation,
): RoccoDialogueChoice | undefined {
  if (
    activation.definitionId !== menu.id ||
    activation.interaction !== 'activate' ||
    !activation.itemId
  ) {
    return undefined;
  }

  return menu.choices.find((choice) => choice.id === activation.itemId);
}
