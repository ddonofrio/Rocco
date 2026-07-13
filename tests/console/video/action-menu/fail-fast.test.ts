import { describe, expect, it } from 'vitest';

import { RoccoActionMenuSystemSDK } from '../../../../src/console/video/action-menu/system';

describe('RoccoActionMenuSystemSDK', () => {
  it('registers a menu', () => {
    const system = new RoccoActionMenuSystemSDK();
    system.registerMenu({
      id: 'menu-1',
      items: [{ id: 'item-1', actionId: 'look', imageUri: '/img.png' }],
    });

    expect(system.listMenus()).toHaveLength(1);
  });

  it('throws on duplicate menu id', () => {
    const system = new RoccoActionMenuSystemSDK();
    system.registerMenu({
      id: 'menu-1',
      items: [{ id: 'item-1', actionId: 'look', imageUri: '/img.png' }],
    });

    expect(() =>
      system.registerMenu({
        id: 'menu-1',
        items: [{ id: 'item-2', actionId: 'grab', imageUri: '/img2.png' }],
      }),
    ).toThrow("Duplicate action menu registration 'menu-1'.");
  });
});
