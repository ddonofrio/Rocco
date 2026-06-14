# Grid Menu

The grid menu system is a generic console UI capability for slot-based panels. It does not model inventory, equipment, or game state; cartridges provide those meanings.

## Files

- `types.ts` - Grid menu definitions, items, state, renderables, activations, and system interface.
- `system.ts` - Pure SDK state for opening, toggling, hovering, activating, reordering, and carrying grid items.
- `pixi-renderer.ts` - PixiJS renderer for panels, slots, labels, and item icons.
- `system.test.ts` - Unit tests for the SDK behavior.
- `index.ts` - Barrel export.

## Concepts

- A grid menu definition describes rows, columns, slots, render layer, and visual item data.
- A grid item contains `id`, optional `imageUri`, optional `label`, optional `slotIndex`, and optional `enabled`.
- The system keeps one active grid menu at a time.
- Non-reorderable menus return an `activate` interaction when an enabled item is clicked.
- Reorderable menus support `pick`, `place`, `swap`, and `carry` interactions.
- Clicking outside a reorderable panel while carrying an item closes the panel and keeps a generic carried payload with the source menu id and item data for cursor use.

The console owns those generic interactions. A cartridge decides whether a carried payload represents inventory, crafting ingredients, puzzle tokens, or anything else, and it interprets target use through its own `scene-click` handling plus `engine.video.gridMenus.getCarriedItem()`.

## Cartridge Usage

Cartridges use the grid menu through `engine.video.gridMenus`.

```typescript
engine.video.gridMenus.toggleMenu({
  id: 'my-cartridge-bag',
  title: 'Bag',
  columns: 3,
  rows: 3,
  reorderable: true,
  items: [
    {
      id: 'keys',
      label: 'Keys',
      imageUri: '/cartridges/my-game/keys.png',
      slotIndex: 0,
    },
  ],
});
```

The engine renders the panel, moves items between slots, carries generic item payloads, and routes generic activations. The cartridge owns the meaning of each item and persists any game state implied by the activation or by a later scene click while something is being carried.
