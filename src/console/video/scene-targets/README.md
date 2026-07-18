# Scene Targets

The scene target system adds console-owned interactive hotspots that are not backed by a rendered sprite. They behave like virtual scene objects for hover labels, clicks, and action-menu targeting.

## Key Files

- `types.ts` - Scene target definitions, hit results, and SDK contract.
- `system.ts` - `RoccoSceneTargetSystemSDK`, the in-memory target registry and hit-testing implementation.
- `index.ts` - Barrel export.

## What A Scene Target Is

- A target has a stable `instanceId` plus a reusable `definitionId`.
- A target shape uses the same `RoccoCollisionShape` union as sprites, so cartridges can define `rect`, `circle`, or `polygon` hotspots.
- Targets are invisible. They do not render or animate.
- Targets can still expose `visibleDescription` text, which the input handler shows through the shared hover-title system.
- Targets can optionally set `renderLayer` directly or point at a scene plane with `renderPlaneId` so hover and click occlusion follows the same visual layer as painted foreground or background art.

## Usage

Register targets while a level or scene is mounted:

```ts
sdk.video.sceneTargets?.registerTarget({
  instanceId: 'bait-shop-cash-register-target',
  definitionId: 'cash-register',
  renderPlaneId: 'rocco-bait-shop-foreground',
  shape: {
    kind: 'rect',
    x: 351,
    y: 164,
    width: 88,
    height: 86,
  },
  priority: 23,
  visibleDescription: {
    enabled: true,
    text: 'Cash register',
  },
});
```

Unregister them when the owning scene unmounts:

```ts
sdk.video.sceneTargets?.unregisterTarget('bait-shop-shell-city-sign-target');
```

## Behavior Notes

- `hitTest()` returns interactive targets only, ordered by descending `priority`.
- `hitTestVisible()` returns enabled targets with visible descriptions, also ordered by descending `priority`.
- A target can be look-only by setting `interactive: false` while keeping `visibleDescription.enabled`.
- `suppressDefaultPlayerMove: true` prevents the runtime from issuing the default player click-to-walk when this target is clicked, which is useful for menu opens, cutscenes, or other click handlers that should resolve in place.
- `renderPlaneId` mirrors the resolved render layer of a plane after depth-mode evaluation, which is useful for hotspots that belong to painted props inside a foreground plane.
- `RoccoInputHandler` merges sprite hits and scene-target hits so cartridges receive the same `scene-click` shape regardless of whether the target is rendered.
