import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoLocalization } from '../../localization';

const NETHER_OFFICE_PATIENCE_TITLE_ID = 'rocco-nether-office-patience-title';
const NETHER_OFFICE_PATIENCE_TRACK_ID = 'rocco-nether-office-patience-track';
const NETHER_OFFICE_PATIENCE_FILL_ID = 'rocco-nether-office-patience-fill';
const NETHER_OFFICE_PATIENCE_MAX_VALUE = 100;
const NETHER_OFFICE_PATIENCE_BAR_X = 704;
const NETHER_OFFICE_PATIENCE_BAR_Y = 35;
const NETHER_OFFICE_PATIENCE_BAR_WIDTH = 240;
const NETHER_OFFICE_PATIENCE_BAR_HEIGHT = 16;
const NETHER_OFFICE_PATIENCE_FILL_INSET = 2;
const NETHER_OFFICE_PATIENCE_LABEL_X = 948;
const NETHER_OFFICE_PATIENCE_LABEL_Y = 14;

export function renderNetherOfficePatienceHud(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization,
  patience: number,
): void {
  const fillWidth =
    ((NETHER_OFFICE_PATIENCE_BAR_WIDTH - NETHER_OFFICE_PATIENCE_FILL_INSET * 2) * patience) /
    NETHER_OFFICE_PATIENCE_MAX_VALUE;
  engine.video.primitives.addPrimitive({
    id: NETHER_OFFICE_PATIENCE_TRACK_ID,
    kind: 'rect',
    renderLayer: 'overlay.primitives',
    zIndex: 800,
    color: '#d7e6c5',
    alpha: 0.95,
    visible: true,
    x: NETHER_OFFICE_PATIENCE_BAR_X,
    y: NETHER_OFFICE_PATIENCE_BAR_Y,
    width: NETHER_OFFICE_PATIENCE_BAR_WIDTH,
    height: NETHER_OFFICE_PATIENCE_BAR_HEIGHT,
    strokeWidth: 2,
    fill: false,
  });
  engine.video.primitives.addPrimitive({
    id: NETHER_OFFICE_PATIENCE_FILL_ID,
    kind: 'rect',
    renderLayer: 'overlay.primitives',
    zIndex: 801,
    color: patience <= 20 ? '#c85b4b' : '#8ccf67',
    alpha: 1,
    visible: true,
    x: NETHER_OFFICE_PATIENCE_BAR_X + NETHER_OFFICE_PATIENCE_FILL_INSET,
    y: NETHER_OFFICE_PATIENCE_BAR_Y + NETHER_OFFICE_PATIENCE_FILL_INSET,
    width: fillWidth,
    height: NETHER_OFFICE_PATIENCE_BAR_HEIGHT - NETHER_OFFICE_PATIENCE_FILL_INSET * 2,
    fill: true,
  });
  engine.video.titles.addTitle({
    id: NETHER_OFFICE_PATIENCE_TITLE_ID,
    text: `${localization.text.nether.officeReading.patienceLabel}: ${patience}%`,
    renderLayer: 'overlay.titles',
    zIndex: 800,
    x: NETHER_OFFICE_PATIENCE_LABEL_X,
    y: NETHER_OFFICE_PATIENCE_LABEL_Y,
    anchor: { x: 1, y: 0 },
    style: {
      fill: '#d7e6c5',
      fontFamily: 'Cascadia Mono, Lucida Console, monospace',
      fontSize: 16,
      fontWeight: '700',
      align: 'right',
    },
    visible: true,
  });
}

export function removeNetherOfficePatienceHud(engine: CartridgeSdkV1Runtime): void {
  engine.video.primitives.removePrimitive(NETHER_OFFICE_PATIENCE_TRACK_ID);
  engine.video.primitives.removePrimitive(NETHER_OFFICE_PATIENCE_FILL_ID);
  engine.video.titles.removeTitle(NETHER_OFFICE_PATIENCE_TITLE_ID);
}
