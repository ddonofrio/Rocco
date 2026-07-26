import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoLocalization } from '../../localization';

export function syncNetherPrinterReadingPresentation(
  engine: CartridgeSdkV1Runtime,
  sceneId: string,
  readingPlaneId: string,
  targetIds: readonly string[],
  targetDefinitionId: string,
  isReadingVisible: boolean,
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number,
  targetStepY: number,
  localization: RoccoLocalization,
): void {
  const readingPlane = engine.video.planes?.resolvePlane?.(sceneId, readingPlaneId);
  if (readingPlane) {
    engine.video.planes.updatePlane(sceneId, readingPlaneId, {
      visible: isReadingVisible,
    });
  }

  for (const targetId of targetIds) {
    engine.video.sceneTargets?.unregisterTarget(targetId);
  }

  if (!isReadingVisible) {
    return;
  }

  for (const [index, targetId] of targetIds.entries()) {
    const messageNumber = index + 1;
    engine.video.sceneTargets?.registerTarget({
      instanceId: targetId,
      definitionId: targetDefinitionId,
      renderPlaneId: readingPlaneId,
      shape: {
        kind: 'rect',
        x: targetX,
        y: targetY + index * targetStepY,
        width: targetWidth,
        height: targetHeight,
      },
      priority: 130,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text:
          localization.locale === 'es'
            ? `Leer mensaje ${messageNumber}`
            : `Read message ${messageNumber}`,
      },
    });
  }
}
