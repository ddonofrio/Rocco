import { describe, expect, it } from 'vitest';

import { RoccoGraphicPlaneSDK } from './sdk';
import type { RoccoGraphicPlane } from './types';

function makeSolidPlane(id: string): RoccoGraphicPlane {
  return {
    id,
    enabled: true,
    source: { kind: 'solid', color: '#223322' },
    colorModel: { kind: 'native' },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    scroll: { x: 0, y: 0 },
    wrap: { x: false, y: false },
    opacity: 1,
    priority: 0,
    visible: true,
  };
}

describe('RoccoGraphicPlaneSDK', () => {
  it('creates and mutates a scene', () => {
    const sdk = new RoccoGraphicPlaneSDK();
    sdk.createScene('scene-1');
    sdk.addPlane('scene-1', makeSolidPlane('plane-a'));
    sdk.updatePlane('scene-1', 'plane-a', { opacity: 0.5, priority: 3 });

    const snapshot = sdk.serializeScene('scene-1');
    expect(snapshot.planes).toHaveLength(1);
    expect(snapshot.planes[0]?.opacity).toBe(0.5);
    expect(snapshot.planes[0]?.priority).toBe(3);
  });

  it('sets and gets tiles on tilemap source', () => {
    const sdk = new RoccoGraphicPlaneSDK();
    sdk.createScene('scene-2');
    sdk.addPlane('scene-2', {
      ...makeSolidPlane('tile-plane'),
      source: {
        kind: 'tilemap',
        tilemapId: 'map-01',
        tilesetId: 'set-01',
        width: 3,
        height: 2,
        tileWidth: 16,
        tileHeight: 16,
        cells: [],
      },
    });

    sdk.setTile('scene-2', 'map-01', 2, 1, {
      tileId: 'grass',
      rotate: 90,
      priority: 2,
    });
    const cell = sdk.getTile('scene-2', 'map-01', 2, 1);
    expect(cell?.tileId).toBe('grass');
    expect(cell?.rotate).toBe(90);
  });
});

