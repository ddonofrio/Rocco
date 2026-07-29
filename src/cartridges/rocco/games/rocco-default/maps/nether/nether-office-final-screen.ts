import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type {
  RoccoFinalCreditColumn,
  RoccoFinalCreditEntry,
  RoccoLocalization,
} from '../../../../localization';
import { ROCCO_BACKGROUND_COLOR, ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import {
  NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID,
  ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
} from './nether-reset-office-second-scene';
import { netherOfficeFinalMusicUri } from './nether-office-final-screen-assets';

const NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID = 'rocco-nether-office-final-screen';
const NETHER_OFFICE_FINAL_TITLE_ID_PREFIX = 'rocco-nether-office-final-';
const NETHER_OFFICE_FINAL_DEDICATION_TITLE_ID = 'rocco-nether-office-final-dedication';
const NETHER_OFFICE_FINAL_NAME_TITLE_ID = 'rocco-nether-office-final-name';
const NETHER_OFFICE_FINAL_DETAILED_TITLE_ID_PREFIX = 'rocco-nether-office-final-detailed-';
const NETHER_OFFICE_FINAL_MUSIC_ID = 'rocco-nether-office-final-music';
const NETHER_OFFICE_FINAL_MUSIC_VOLUME = 0.3825;
const NETHER_OFFICE_FINAL_DEDICATION_FONT_SIZE = 24;
const NETHER_OFFICE_FINAL_NAME_FONT_SIZE = 40;
const NETHER_OFFICE_FINAL_CREDIT_GAP = 18;
const NETHER_OFFICE_FINAL_CREDITS_SPEED = 32;
const NETHER_OFFICE_FINAL_DETAILED_CREDITS_SPEED = 64;
const NETHER_OFFICE_FINAL_DETAILED_ROLE_FONT_SIZE = 14;
const NETHER_OFFICE_FINAL_DETAILED_NAME_FONT_SIZE = 22;
const NETHER_OFFICE_FINAL_DETAILED_TITLE_FONT_SIZE = 30;
const NETHER_OFFICE_FINAL_DETAILED_MESSAGE_FONT_SIZE = 17;
const NETHER_OFFICE_FINAL_DETAILED_LINE_GAP = 8;
const NETHER_OFFICE_FINAL_DETAILED_BLOCK_GAP = 24;
const NETHER_OFFICE_FINAL_DETAILED_TOP_PADDING = 30;
const NETHER_OFFICE_FINAL_INPUT_OWNER_ID = 'rocco-nether-office-final-screen';

const NETHER_OFFICE_FINAL_TITLE_STYLE = {
  fill: '#d7e6c5',
  fontFamily: 'Cascadia Mono, Lucida Console, monospace',
  align: 'center' as const,
};

interface CreditTitleOptions {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: 'normal' | '700';
  visible?: boolean;
}

type FinalScreenInputLease = ReturnType<CartridgeSdkV1Runtime['acquireInputLease']>;

const finalScreenInputState: { lease?: FinalScreenInputLease } = {};

function releaseFinalScreenInputLease(): void {
  finalScreenInputState.lease?.dispose();
  finalScreenInputState.lease = undefined;
}

function blockFinalScreenInput(engine: CartridgeSdkV1Runtime): void {
  releaseFinalScreenInputLease();
  finalScreenInputState.lease = engine.acquireInputLease(
    NETHER_OFFICE_FINAL_INPUT_OWNER_ID,
    'blocked',
  );
}

function removeFinalTitles(engine: CartridgeSdkV1Runtime): void {
  for (const title of engine.video.titles.listTitles()) {
    if (title.id.startsWith(NETHER_OFFICE_FINAL_TITLE_ID_PREFIX)) {
      engine.video.titles.removeTitle(title.id);
    }
  }
}

function showBlackScreen(engine: CartridgeSdkV1Runtime): void {
  releaseFinalScreenInputLease();
  engine.video.actionMenus.closeMenu();
  engine.video.gridMenus.closeMenu();
  engine.video.messages.clearMessages();
  removeFinalTitles(engine);
  const backdropPlane = engine.video.planes.resolvePlane(
    ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
    NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID,
  );
  if (backdropPlane) {
    engine.video.planes.updatePlane(
      ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
      NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID,
      { visible: true },
    );
    engine.video.primitives.removePrimitive(NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID);
    return;
  }
  engine.video.primitives.addPrimitive({
    id: NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID,
    kind: 'rect',
    renderLayer: 'overlay.primitives',
    zIndex: 10_000,
    color: ROCCO_BACKGROUND_COLOR,
    alpha: 1,
    visible: true,
    x: 0,
    y: 0,
    width: ROCCO_DESIGN_WIDTH,
    height: ROCCO_DESIGN_HEIGHT,
    fill: true,
  });
}

function showCreditTitle(engine: CartridgeSdkV1Runtime, options: CreditTitleOptions): void {
  engine.video.titles.addTitle({
    id: options.id,
    text: options.text,
    renderLayer: 'overlay.titles',
    zIndex: 10_001,
    x: options.x,
    y: options.y,
    anchor: { x: 0.5, y: 0.5 },
    style: {
      ...NETHER_OFFICE_FINAL_TITLE_STYLE,
      fontSize: options.fontSize,
      fontWeight: options.fontWeight,
    },
    visible: options.visible ?? true,
  });
}

function moveCreditTitle(engine: CartridgeSdkV1Runtime, id: string, deltaY: number): void {
  const title = engine.video.titles.getTitle(id);
  if (!title) return;
  engine.video.titles.addTitle({ ...title, y: title.y - deltaY });
}

function measureMessageHeight(lines: string[], fontSize: number): number {
  return Math.max(lines.length, 1) * fontSize * 1.2;
}

function addDetailedCreditColumns(
  engine: CartridgeSdkV1Runtime,
  entryIdPrefix: string,
  columns: RoccoFinalCreditColumn[],
  cursorY: number,
): number {
  const columnWidth = ROCCO_DESIGN_WIDTH / columns.length;
  const roleY = cursorY + NETHER_OFFICE_FINAL_DETAILED_ROLE_FONT_SIZE / 2;
  const nameY =
    roleY +
    NETHER_OFFICE_FINAL_DETAILED_ROLE_FONT_SIZE / 2 +
    NETHER_OFFICE_FINAL_DETAILED_LINE_GAP +
    NETHER_OFFICE_FINAL_DETAILED_NAME_FONT_SIZE / 2;
  for (const [columnIndex, column] of columns.entries()) {
    const columnX = columnWidth * (columnIndex + 0.5);
    showCreditTitle(engine, {
      id: `${entryIdPrefix}-role-${columnIndex}`,
      text: column.role,
      x: columnX,
      y: roleY,
      fontSize: NETHER_OFFICE_FINAL_DETAILED_ROLE_FONT_SIZE,
      fontWeight: 'normal',
      visible: false,
    });
    showCreditTitle(engine, {
      id: `${entryIdPrefix}-name-${columnIndex}`,
      text: column.name,
      x: columnX,
      y: nameY,
      fontSize: NETHER_OFFICE_FINAL_DETAILED_NAME_FONT_SIZE,
      fontWeight: '700',
      visible: false,
    });
  }
  return nameY + NETHER_OFFICE_FINAL_DETAILED_NAME_FONT_SIZE / 2;
}

function addDetailedCreditEntry(
  engine: CartridgeSdkV1Runtime,
  entry: RoccoFinalCreditEntry,
  entryIndex: number,
  cursorY: number,
): number {
  const speedSuffix = entry.speed === 'slow' ? '-slow' : '-fast';
  const entryIdPrefix = `${NETHER_OFFICE_FINAL_DETAILED_TITLE_ID_PREFIX}${entryIndex}${speedSuffix}`;
  if (entry.kind === 'title') {
    showCreditTitle(engine, {
      id: `${entryIdPrefix}-title`,
      text: entry.text,
      x: ROCCO_DESIGN_WIDTH / 2,
      y: cursorY + NETHER_OFFICE_FINAL_DETAILED_TITLE_FONT_SIZE / 2,
      fontSize: NETHER_OFFICE_FINAL_DETAILED_TITLE_FONT_SIZE,
      fontWeight: '700',
      visible: false,
    });
    return cursorY + NETHER_OFFICE_FINAL_DETAILED_TITLE_FONT_SIZE;
  }
  if (entry.kind === 'message') {
    const messageHeight = measureMessageHeight(
      entry.lines,
      NETHER_OFFICE_FINAL_DETAILED_MESSAGE_FONT_SIZE,
    );
    showCreditTitle(engine, {
      id: `${entryIdPrefix}-message`,
      text: entry.lines.join('\n'),
      x: ROCCO_DESIGN_WIDTH / 2,
      y: cursorY + messageHeight / 2,
      fontSize: NETHER_OFFICE_FINAL_DETAILED_MESSAGE_FONT_SIZE,
      fontWeight: 'normal',
      visible: false,
    });
    return cursorY + messageHeight;
  }
  return addDetailedCreditColumns(engine, entryIdPrefix, entry.columns, cursorY);
}

function addDetailedCreditTitles(
  engine: CartridgeSdkV1Runtime,
  entries: RoccoFinalCreditEntry[],
): void {
  let cursorY = ROCCO_DESIGN_HEIGHT + NETHER_OFFICE_FINAL_DETAILED_TOP_PADDING;
  for (const [entryIndex, entry] of entries.entries()) {
    cursorY =
      addDetailedCreditEntry(engine, entry, entryIndex, cursorY) +
      NETHER_OFFICE_FINAL_DETAILED_BLOCK_GAP;
  }
}

function activateFastDetailedCreditTitles(engine: CartridgeSdkV1Runtime): void {
  for (const title of engine.video.titles.listTitles()) {
    if (
      title.id.startsWith(NETHER_OFFICE_FINAL_DETAILED_TITLE_ID_PREFIX) &&
      title.id.includes('-fast-')
    ) {
      engine.video.titles.addTitle({ ...title, visible: true });
    }
  }
}

function resolveDetailedTitleHeight(title: {
  text: string;
  style?: { fontSize?: number };
}): number {
  const fontSize = title.style?.fontSize ?? 28;
  return Math.max(title.text.split('\n').length, 1) * fontSize * 1.2;
}

function areFastDetailedCreditTitlesComplete(engine: CartridgeSdkV1Runtime): boolean {
  const fastTitles = engine.video.titles
    .listTitles()
    .filter(
      (title) =>
        title.id.startsWith(NETHER_OFFICE_FINAL_DETAILED_TITLE_ID_PREFIX) &&
        title.id.includes('-fast-') &&
        title.visible,
    );
  return (
    fastTitles.length > 0 &&
    fastTitles.every((title) => title.y <= -resolveDetailedTitleHeight(title) / 2)
  );
}

function startSlowDetailedCreditTitles(engine: CartridgeSdkV1Runtime): void {
  const slowTitles = engine.video.titles
    .listTitles()
    .filter((title) => title.id.includes('-slow-'));
  const firstSlowTitle = slowTitles[0];
  if (!firstSlowTitle) return;
  const targetY =
    ROCCO_DESIGN_HEIGHT +
    NETHER_OFFICE_FINAL_DETAILED_TOP_PADDING +
    resolveDetailedTitleHeight(firstSlowTitle) / 2;
  const offsetY = targetY - firstSlowTitle.y;
  for (const title of slowTitles) {
    engine.video.titles.addTitle({ ...title, y: title.y + offsetY, visible: true });
  }
}

function moveDetailedCreditTitles(
  engine: CartridgeSdkV1Runtime,
  deltaMs: number,
  speed: 'fast' | 'slow',
): void {
  const velocity =
    speed === 'slow'
      ? NETHER_OFFICE_FINAL_CREDITS_SPEED
      : NETHER_OFFICE_FINAL_DETAILED_CREDITS_SPEED;
  const deltaY = (deltaMs / 1000) * velocity;
  for (const title of engine.video.titles.listTitles()) {
    if (!title.id.includes(`-${speed}-`) || !title.visible) {
      continue;
    }
    engine.video.titles.addTitle({ ...title, y: title.y - deltaY });
  }
}

function startNetherOfficeFinalMusic(engine: CartridgeSdkV1Runtime): void {
  engine.jukebox.stopPlaylist();
  engine.audio.unregisterSound(NETHER_OFFICE_FINAL_MUSIC_ID);
  engine.audio.registerSound({
    id: NETHER_OFFICE_FINAL_MUSIC_ID,
    uri: netherOfficeFinalMusicUri,
    volume: NETHER_OFFICE_FINAL_MUSIC_VOLUME,
  });
  engine.audio.playSound(NETHER_OFFICE_FINAL_MUSIC_ID, {
    volume: NETHER_OFFICE_FINAL_MUSIC_VOLUME,
    restart: true,
  });
}

export function showNetherOfficeBlackScreen(engine: CartridgeSdkV1Runtime): void {
  showBlackScreen(engine);
}

export function showNetherOfficeFinalScreen(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization,
): void {
  showBlackScreen(engine);
  const dedicationY = ROCCO_DESIGN_HEIGHT + NETHER_OFFICE_FINAL_DEDICATION_FONT_SIZE;
  const nameY =
    dedicationY +
    NETHER_OFFICE_FINAL_DEDICATION_FONT_SIZE / 2 +
    NETHER_OFFICE_FINAL_CREDIT_GAP +
    NETHER_OFFICE_FINAL_NAME_FONT_SIZE / 2;
  showCreditTitle(engine, {
    id: NETHER_OFFICE_FINAL_DEDICATION_TITLE_ID,
    text: localization.text.nether.officeReading.finalDedicationLine,
    x: ROCCO_DESIGN_WIDTH / 2,
    y: dedicationY,
    fontSize: NETHER_OFFICE_FINAL_DEDICATION_FONT_SIZE,
    fontWeight: '700',
  });
  showCreditTitle(engine, {
    id: NETHER_OFFICE_FINAL_NAME_TITLE_ID,
    text: localization.text.nether.officeReading.finalDedicationName,
    x: ROCCO_DESIGN_WIDTH / 2,
    y: nameY,
    fontSize: NETHER_OFFICE_FINAL_NAME_FONT_SIZE,
    fontWeight: '700',
  });
  addDetailedCreditTitles(engine, localization.text.nether.officeReading.finalCredits);
  blockFinalScreenInput(engine);
  startNetherOfficeFinalMusic(engine);
}

export function updateNetherOfficeFinalScreen(
  engine: CartridgeSdkV1Runtime,
  deltaMs: number,
): void {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
  const nameTitle = engine.video.titles.getTitle(NETHER_OFFICE_FINAL_NAME_TITLE_ID);
  if (!nameTitle) return;
  if (nameTitle.y > -NETHER_OFFICE_FINAL_NAME_FONT_SIZE / 2) {
    const deltaY = (deltaMs / 1000) * NETHER_OFFICE_FINAL_CREDITS_SPEED;
    moveCreditTitle(engine, NETHER_OFFICE_FINAL_DEDICATION_TITLE_ID, deltaY);
    moveCreditTitle(engine, NETHER_OFFICE_FINAL_NAME_TITLE_ID, deltaY);
    return;
  }

  const areSlowTitlesActive = engine.video.titles
    .listTitles()
    .some((title) => title.id.includes('-slow-') && title.visible);
  if (areSlowTitlesActive) {
    moveDetailedCreditTitles(engine, deltaMs, 'slow');
    return;
  }
  activateFastDetailedCreditTitles(engine);
  moveDetailedCreditTitles(engine, deltaMs, 'fast');
  if (areFastDetailedCreditTitlesComplete(engine)) {
    startSlowDetailedCreditTitles(engine);
  }
}

export function clearNetherOfficeFinalScreen(engine: CartridgeSdkV1Runtime): void {
  releaseFinalScreenInputLease();
  engine.audio.unregisterSound(NETHER_OFFICE_FINAL_MUSIC_ID);
  if (
    engine.video.planes.resolvePlane(
      ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
      NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID,
    )
  ) {
    engine.video.planes.updatePlane(
      ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
      NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID,
      { visible: false },
    );
  }
  engine.video.primitives.removePrimitive(NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID);
  removeFinalTitles(engine);
}
