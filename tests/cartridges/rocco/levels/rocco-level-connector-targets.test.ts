import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  installRoccoLevelConnectorTargets,
  uninstallRoccoLevelConnectorTargets,
} from '../../../../src/cartridges/rocco/levels/rocco-level-connector-targets';
import type { RoccoLevelConnector } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';

describe('Rocco level connector targets', () => {
  it('registers localized look-only targets with the connector exit areas', () => {
    const registerTarget = vi.fn();
    const unregisterTarget = vi.fn();
    const engine = {
      video: {
        sceneTargets: { registerTarget, unregisterTarget },
      },
    } as unknown as CartridgeSdkV1Runtime;
    const connectors: readonly RoccoLevelConnector[] = [
      {
        id: 'south',
        exitArea: { x: 0, y: 510, width: 960, height: 30 },
        exitDescriptionKey: 'otherShopPart',
        entryPoint: { x: 250, y: 220 },
        entryFacing: 'up',
      },
      {
        id: 'portal',
        entryPoint: { x: 480, y: 270 },
        entryFacing: 'up',
      },
    ];

    installRoccoLevelConnectorTargets(
      engine,
      'bait-shop',
      connectors,
      createRoccoLocalization('en'),
    );

    expect(registerTarget).toHaveBeenCalledTimes(1);
    expect(registerTarget).toHaveBeenCalledWith({
      instanceId: 'rocco-level-connector:bait-shop:south',
      definitionId: 'rocco-level-connector-hover',
      shape: { kind: 'rect', x: 0, y: 510, width: 960, height: 30 },
      renderLayer: 'background.main',
      interactive: false,
      priority: 1,
      metadata: { roccoLevelConnectorHover: true },
      visibleDescription: {
        enabled: true,
        text: 'Go to the other part of the shop',
        textKey: 'otherShopPart',
      },
    });

    uninstallRoccoLevelConnectorTargets(engine, 'bait-shop', connectors);

    expect(unregisterTarget).toHaveBeenCalledWith('rocco-level-connector:bait-shop:south');
  });
});
