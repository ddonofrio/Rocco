import type { RoccoGridMenuDefinition } from '../../../../../../console/video/grid-menu';
import { createRoccoDialogueChoiceMenu } from '../../../../rpce/dialogue';
import type { RoccoLocalization } from '../../localization';

export const PRINTER_READING_DETAIL_MENU_ID = 'rocco-nether-printer-reading-detail-menu';
export const PRINTER_READING_DETAIL_REPLY_ID = 'reply-to-guysprite';
export const PRINTER_READING_DETAIL_MORE_ID = 'read-more-messages';
export const PRINTER_READING_REPLY_SAY_ID = 'reply-say-message';
export const PRINTER_READING_REPLY_CONTRARY_ID = 'reply-contrary';
export const PRINTER_READING_REPLY_UNREADABLE_ID = 'reply-unreadable';
export const PRINTER_READING_REPLY_IDS = new Set([
  PRINTER_READING_REPLY_SAY_ID,
  PRINTER_READING_REPLY_CONTRARY_ID,
  PRINTER_READING_REPLY_UNREADABLE_ID,
]);

const PRINTER_READING_DETAIL_MENU_X = 200;
const PRINTER_READING_DETAIL_HEADER_HEIGHT = 320;
const PRINTER_READING_DETAIL_BAR_X = 34;
const PRINTER_READING_DETAIL_BAR_Y = 70;
const PRINTER_READING_DETAIL_BAR_WIDTH = 492;
const PRINTER_READING_DETAIL_BAR_HEIGHT = 69;

type PrinterMessageText = Pick<RoccoLocalization['text']['nether']['printer'], 'messageTexts'>;

type PrinterContraryText = Pick<
  RoccoLocalization['text']['nether']['printer'],
  'messageContraryTexts'
>;

export function splitPrinterSpeechText(text: string): [string, string] {
  const midpoint = Math.floor(text.length / 2);
  const nextSpace = text.indexOf(' ', midpoint);
  const splitAt = nextSpace > 0 ? nextSpace : midpoint;
  return [`${text.slice(0, splitAt).trimEnd()}...`, `...${text.slice(splitAt).trimStart()}`];
}

export function resolvePrinterMessageText(
  targetIds: readonly string[],
  targetId: string,
  printerText: PrinterMessageText,
): string | undefined {
  return printerText.messageTexts[targetIds.indexOf(targetId)];
}

export function resolvePrinterMessageContraryText(
  targetIds: readonly string[],
  targetId: string,
  printerText: PrinterContraryText,
): string | undefined {
  return printerText.messageContraryTexts[targetIds.indexOf(targetId)];
}

type PrinterMenuText = Pick<
  RoccoLocalization['text']['nether']['printer'],
  | 'replyToGuyspriteLabel'
  | 'readMoreMessagesLabel'
  | 'replyReadMessageLabel'
  | 'replyContraryLabel'
  | 'replyUnreadableLabel'
>;

function createPrinterReadingMenuDefinition(
  choices: readonly { id: string; text: string }[],
  messageText: string,
): RoccoGridMenuDefinition {
  const menu = createRoccoDialogueChoiceMenu({
    id: PRINTER_READING_DETAIL_MENU_ID,
    x: PRINTER_READING_DETAIL_MENU_X,
    y: 0,
    choices,
  });
  menu.gridMenu.headerHeight = PRINTER_READING_DETAIL_HEADER_HEIGHT;
  menu.gridMenu.backdropFill = '#000000';
  menu.gridMenu.backdropAlpha = 0.78;
  menu.gridMenu.closeOnPointerLeave = false;
  menu.gridMenu.panelFillAlpha = 0;
  menu.gridMenu.panelStrokeAlpha = 0;
  menu.gridMenu.rectDecorations = [
    {
      id: 'rocco-nether-printer-reading-detail-bar',
      x: PRINTER_READING_DETAIL_BAR_X,
      y: PRINTER_READING_DETAIL_BAR_Y,
      width: PRINTER_READING_DETAIL_BAR_WIDTH,
      height: PRINTER_READING_DETAIL_BAR_HEIGHT,
      fill: '#d7e6c5',
      fillAlpha: 1,
    },
  ];
  menu.gridMenu.textDecorations = [
    {
      id: 'rocco-nether-printer-reading-detail-message',
      text: messageText,
      x: PRINTER_READING_DETAIL_BAR_X + 12,
      y: PRINTER_READING_DETAIL_BAR_Y + 8,
      anchor: { x: 0, y: 0 },
      align: 'left',
      fill: '#10170f',
      fontSize: 12,
      fontWeight: 'normal',
      letterSpacing: 0,
    },
  ];
  return menu.gridMenu;
}

export function createPrinterReadingDetailMenuDefinition(
  printerText: PrinterMenuText,
  messageText: string,
): RoccoGridMenuDefinition {
  return createPrinterReadingMenuDefinition(
    [
      { id: PRINTER_READING_DETAIL_REPLY_ID, text: printerText.replyToGuyspriteLabel },
      { id: PRINTER_READING_DETAIL_MORE_ID, text: printerText.readMoreMessagesLabel },
    ],
    messageText,
  );
}

export function createPrinterReadingReplyMenuDefinition(
  printerText: PrinterMenuText,
): RoccoGridMenuDefinition {
  const menu = createRoccoDialogueChoiceMenu({
    id: PRINTER_READING_DETAIL_MENU_ID,
    choices: [
      { id: PRINTER_READING_REPLY_SAY_ID, text: printerText.replyReadMessageLabel },
      { id: PRINTER_READING_REPLY_CONTRARY_ID, text: printerText.replyContraryLabel },
      { id: PRINTER_READING_REPLY_UNREADABLE_ID, text: printerText.replyUnreadableLabel },
    ],
  });
  menu.gridMenu.closeOnPointerLeave = false;
  return menu.gridMenu;
}
