import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { ROCCO_BACKGROUND_COLOR, ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';

const NETHER_OFFICE_RETRY_BLACKOUT_ID = 'rocco-nether-office-retry-blackout';

export function showNetherOfficeRetryBlackout(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.closeMenu();
  engine.video.gridMenus.closeMenu();
  engine.video.messages.clearMessages();
  engine.video.primitives.addPrimitive({
    id: NETHER_OFFICE_RETRY_BLACKOUT_ID,
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

export function clearNetherOfficeRetryBlackout(engine: CartridgeSdkV1Runtime): void {
  engine.video.primitives.removePrimitive(NETHER_OFFICE_RETRY_BLACKOUT_ID);
}
