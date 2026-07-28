import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH, ROCCO_BACKGROUND_COLOR } from '../../game-design';
import type { RoccoLocalization } from '../../localization';
import {
  NETHER_RESET_OFFICE_DEFEAT_FADE_DURATION_MS,
  NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID,
  NETHER_RESET_OFFICE_DEFEAT_TITLE_ID,
} from './nether-reset-office-scene';

export function beginNetherOfficeDefeatFade(engine: CartridgeSdkV1Runtime): void {
  engine.video.primitives.addPrimitive({
    id: NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID,
    kind: 'rect',
    renderLayer: 'overlay.primitives',
    zIndex: 5000,
    color: ROCCO_BACKGROUND_COLOR,
    alpha: 0,
    visible: true,
    x: 0,
    y: 0,
    width: ROCCO_DESIGN_WIDTH,
    height: ROCCO_DESIGN_HEIGHT,
    fill: true,
  });
}

export function isNetherOfficeDefeatFadeComplete(
  engine: CartridgeSdkV1Runtime,
  elapsedMs: number,
): boolean {
  const alpha = Math.min(1, elapsedMs / NETHER_RESET_OFFICE_DEFEAT_FADE_DURATION_MS);
  engine.video.primitives.addPrimitive({
    id: NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID,
    kind: 'rect',
    renderLayer: 'overlay.primitives',
    zIndex: 5000,
    color: ROCCO_BACKGROUND_COLOR,
    alpha,
    visible: true,
    x: 0,
    y: 0,
    width: ROCCO_DESIGN_WIDTH,
    height: ROCCO_DESIGN_HEIGHT,
    fill: true,
  });
  return elapsedMs >= NETHER_RESET_OFFICE_DEFEAT_FADE_DURATION_MS;
}

export function showNetherOfficeDefeatTitle(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization,
): void {
  engine.video.titles.addTitle({
    id: NETHER_RESET_OFFICE_DEFEAT_TITLE_ID,
    text: localization.text.keys.defeatTitle,
    renderLayer: 'overlay.titles',
    zIndex: 5000,
    x: ROCCO_DESIGN_WIDTH / 2,
    y: ROCCO_DESIGN_HEIGHT / 2,
    anchor: { x: 0.5, y: 0.5 },
    style: {
      fill: '#cbd6c0',
      fontFamily: 'Cascadia Mono, Lucida Console, monospace',
      fontSize: 42,
      fontWeight: '700',
      align: 'center',
      stroke: {
        color: '#1f2a20',
        width: 6,
        alpha: 0.95,
      },
    },
    visible: true,
  });
}
