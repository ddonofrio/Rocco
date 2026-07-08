import { describe, expect, it } from 'vitest';

import { RoccoGridMenuSystemSDK } from '../../../../src/engine/video/grid-menu/system';

describe('RoccoGridMenuSystemSDK', () => {
  it('opens a centered grid menu and exposes a renderable copy', () => {
    const system = new RoccoGridMenuSystemSDK();

    system.openMenu({
      id: 'inventory',
      title: 'Inventory',
      items: [{ id: 'keys', label: 'Keys', imageUri: '/keys.png' }],
    });

    const renderable = system.getRenderableMenu();
    expect(system.isOpen('inventory')).toBe(true);
    expect(renderable?.definition.columns).toBe(3);
    expect(renderable?.definition.rows).toBe(3);
    expect(renderable?.definition.items[0]?.id).toBe('keys');
  });

  it('activates an enabled item by slot position', () => {
    const system = new RoccoGridMenuSystemSDK();
    system.openMenu({
      id: 'inventory',
      x: 100,
      y: 100,
      slotSize: 50,
      padding: 10,
      gap: 5,
      items: [{ id: 'keys', label: 'Keys' }],
    });

    const activation = system.activateAt(120, 120);

    expect(activation).toEqual({
      kind: 'grid-menu',
      definitionId: 'inventory',
      interaction: 'activate',
      itemId: 'keys',
      slotIndex: 0,
      items: [{ id: 'keys', label: 'Keys' }],
    });
    expect(system.isOpen()).toBe(true);
  });

  it('picks, places, and swaps reorderable items', () => {
    const system = new RoccoGridMenuSystemSDK();
    system.openMenu({
      id: 'inventory',
      x: 100,
      y: 100,
      slotSize: 50,
      padding: 10,
      gap: 5,
      reorderable: true,
      items: [
        { id: 'keys', label: 'Keys', slotIndex: 0 },
        { id: 'money', label: 'Money', slotIndex: 1 },
      ],
    });

    expect(system.activateAt(120, 120)).toMatchObject({
      interaction: 'pick',
      itemId: 'keys',
      carriedItem: { id: 'keys' },
    });
    expect(system.getCarriedItem()?.item.id).toBe('keys');
    expect(system.getRenderableMenu()?.definition.items.map((item) => item.id)).toEqual(['money']);

    expect(system.activateAt(175, 120)).toMatchObject({
      interaction: 'swap',
      itemId: 'keys',
      carriedItem: { id: 'money' },
    });
    expect(system.getCarriedItem()?.item.id).toBe('money');

    expect(system.activateAt(120, 175)).toMatchObject({
      interaction: 'place',
      itemId: 'money',
      slotIndex: 3,
    });
    expect(system.getCarriedItem()).toBeUndefined();
    expect(system.getRenderableMenu()?.definition.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'keys', slotIndex: 1 }),
        expect.objectContaining({ id: 'money', slotIndex: 3 }),
      ]),
    );
  });

  it('carries a picked item outside the menu as a generic payload', () => {
    const system = new RoccoGridMenuSystemSDK();
    system.openMenu({
      id: 'inventory',
      x: 100,
      y: 100,
      slotSize: 50,
      padding: 10,
      reorderable: true,
      items: [{ id: 'keys', label: 'Keys', imageUri: '/keys.png', slotIndex: 0 }],
    });

    system.activateAt(120, 120);
    expect(system.activateAt(1, 1)).toMatchObject({
      interaction: 'carry',
      itemId: 'keys',
      carriedItem: { id: 'keys', slotIndex: 0 },
    });

    expect(system.isOpen()).toBe(false);
    expect(system.getCarriedItem()).toMatchObject({
      definitionId: 'inventory',
      item: { id: 'keys', imageUri: '/keys.png' },
    });
  });

  it('tracks hover and closes when clicking outside the panel', () => {
    const system = new RoccoGridMenuSystemSDK();
    system.openMenu({
      id: 'inventory',
      x: 100,
      y: 100,
      slotSize: 50,
      padding: 10,
      items: [{ id: 'keys', label: 'Keys' }],
    });

    expect(system.setHoverAt(120, 120)).toBe(true);
    expect(system.getHoveredItem()?.id).toBe('keys');
    expect(system.activateAt(1, 1)).toEqual({
      kind: 'grid-menu',
      definitionId: 'inventory',
      interaction: 'close',
      items: [{ id: 'keys', label: 'Keys' }],
    });
    expect(system.isOpen()).toBe(false);
  });

  it('activates text-list items inside rectangular slots', () => {
    const system = new RoccoGridMenuSystemSDK();
    system.openMenu({
      id: 'dialogue',
      layout: 'text-list',
      x: 100,
      y: 200,
      columns: 1,
      rows: 2,
      slotWidth: 320,
      slotHeight: 40,
      padding: 12,
      gap: 8,
      closeOnActivate: true,
      items: [{ id: 'hello', label: 'Hello there.', slotIndex: 0 }],
    });

    expect(system.activateAt(140, 230)).toEqual({
      kind: 'grid-menu',
      definitionId: 'dialogue',
      interaction: 'activate',
      itemId: 'hello',
      slotIndex: 0,
      items: [{ id: 'hello', label: 'Hello there.', slotIndex: 0 }],
    });
    expect(system.isOpen()).toBe(false);
  });
});
