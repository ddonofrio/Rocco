import type { CartridgeSdkV1Runtime } from '../../../console/cartridges/sdk-v1';
import type { RoccoLocalization } from '../games/rocco-default/localization';
import type { RoccoLevelConnector } from './rocco-level-types';

export const ROCCO_LEVEL_CONNECTOR_TARGET_DEFINITION_ID = 'rocco-level-connector-hover';

function getConnectorTargetInstanceId(levelId: string, connectorId: string): string {
  return `rocco-level-connector:${levelId}:${connectorId}`;
}

export function isRoccoLevelConnectorHoverTarget(
  target: { definitionId?: string } | undefined,
): boolean {
  return target?.definitionId === ROCCO_LEVEL_CONNECTOR_TARGET_DEFINITION_ID;
}

export function installRoccoLevelConnectorTargets(
  engine: CartridgeSdkV1Runtime,
  levelId: string,
  connectors: readonly RoccoLevelConnector[],
  localization: RoccoLocalization,
): void {
  for (const connector of connectors) {
    if (!connector.exitArea || !connector.exitDescriptionKey) {
      continue;
    }

    engine.video.sceneTargets?.registerTarget({
      instanceId: getConnectorTargetInstanceId(levelId, connector.id),
      definitionId: ROCCO_LEVEL_CONNECTOR_TARGET_DEFINITION_ID,
      shape: {
        kind: 'rect',
        ...connector.exitArea,
      },
      renderLayer: 'background.main',
      interactive: false,
      priority: 1,
      metadata: { roccoLevelConnectorHover: true },
      visibleDescription: {
        enabled: true,
        text: localization.text.descriptions[connector.exitDescriptionKey],
        textKey: connector.exitDescriptionKey,
      },
    });
  }
}

export function uninstallRoccoLevelConnectorTargets(
  engine: CartridgeSdkV1Runtime,
  levelId: string,
  connectors: readonly RoccoLevelConnector[],
): void {
  for (const connector of connectors) {
    if (!connector.exitArea || !connector.exitDescriptionKey) {
      continue;
    }

    engine.video.sceneTargets?.unregisterTarget(
      getConnectorTargetInstanceId(levelId, connector.id),
    );
  }
}
