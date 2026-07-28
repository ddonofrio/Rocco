import type { RoccoGridMenuDefinition } from '../../../../../../console/video/grid-menu';

export const NETHER_OFFICE_CARTRIDGE_MENU_ID = 'rocco-nether-office-cartridge-menu';
export const NETHER_OFFICE_CARTRIDGE_MISSING_BUTTON_ID = 'missing-cartridge';
export const NETHER_OFFICE_CARTRIDGE_READY_BUTTON_ID = 'ready-cartridge';

export function createNetherOfficeCartridgeMenu(
  prompt: string,
  missingCartridgeLabel: string,
  readyCartridgeLabel: string,
): RoccoGridMenuDefinition {
  return {
    id: NETHER_OFFICE_CARTRIDGE_MENU_ID,
    title: prompt,
    layout: 'text-list',
    columns: 1,
    rows: 1,
    slotWidth: 600,
    slotHeight: 30,
    gap: 8,
    padding: 18,
    buttonHeight: 46,
    buttonGap: 10,
    closeOnActivate: true,
    closeOnEmptyClick: false,
    reorderable: false,
    blockedSlotIndexes: [0],
    items: [],
    buttons: [
      { id: NETHER_OFFICE_CARTRIDGE_MISSING_BUTTON_ID, label: missingCartridgeLabel },
      { id: NETHER_OFFICE_CARTRIDGE_READY_BUTTON_ID, label: readyCartridgeLabel },
    ],
    backdropFill: '#000000',
    backdropAlpha: 1,
    panelFill: '#10170f',
    panelStroke: '#8ecf6e',
    slotFill: '#10170f',
    slotStroke: '#10170f',
    hoverStroke: '#8ecf6e',
  };
}
