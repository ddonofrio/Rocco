# Rocco Interaction Registry

This directory contains the interaction rules for the `rocco-default` cartridge.

`RoccoSceneActionRouter` owns action-flow coordination. It builds the shared interaction context, applies blocking-sequence behavior, cancels pending bait-shop door use when appropriate, updates exit intent at the required point in scene-click dispatch, and delegates feature behavior to the interaction registry.

The registry owns rule registration, action-kind and stage filtering, priority ordering, duplicate validation, and rule execution.

Feature rules live in focused registration modules rather than inside the router.

## Files

- `interaction-types.ts` — action-kind and stage types, the shared read-only `InteractionContext`, rule contracts, action narrowing helpers, duplicate-rule errors, and disposition normalization.
- `interaction-registry.ts` — rule registration, staged dispatch, descending-priority ordering, detailed dispatch results, special inventory-scene-click dispatch, and duplicate validation.
- `register-core-interactions.ts` — Rocco self actions, inventory opening, developer actions, sequence advancement, and other cartridge-wide rules.
- `register-inventory-interactions.ts` — carried-item scene-click routing and player-inventory grid-menu rules.
- `register-dropped-inventory-interactions.ts` — dropped-item pickup and dropped-world-item action rules.
- `register-level-interactions.ts` — lowest-priority delegation into the currently active level.
- `register-pier-interactions.ts` — Pier-specific action-menu rules and special carried-item interactions involving Stan, the bait-shop door, money, keys, and player appearance.
- `index.ts` — public exports and `createRoccoInteractionRegistry()`.

## Action kinds

The registry dispatches five interaction kinds:

- `scene-click`
- `action-menu`
- `grid-menu`
- `advance-sequence`
- `carry-use`

`resolveInteractionKind()` maps every `RoccoCartridgeAction` to one of these kinds.

## Rule contract

```ts
interface InteractionRule {
  readonly id: string;
  readonly ownerId: string;
  readonly priority: number;
  readonly kind: InteractionKind;
  readonly stage?: InteractionStage;

  matches(context: InteractionContext): boolean;

  execute(context: InteractionContext, signal: AbortSignal): CartridgeActionDisposition | undefined;
}
```

`matches()` is a side-effect-free predicate.

`execute()` performs the behavior.

Returning `undefined` means that the rule did not consume the action.

Executed rules return a synchronous `CartridgeActionDisposition`.

Optional asynchronous behavior belongs in `CartridgeActionDisposition.completion`.

The cancellation signal supplied by the host is passed into rule execution.

Movement suppression must be decided synchronously through `defaultPlayerMovement`.

Higher numerical priority runs first within the same action kind and stage.

Duplicate rule IDs are rejected during registry validation.

`{ suppressDefaultPlayerMove?: boolean }` exists only as an input accepted by internal normalization for remaining level-return compatibility. It is not part of the public rule result.

## Interaction context

`InteractionContext` exposes the following read-only domains:

- current action and optional cartridge action context;
- current SDK facade;
- active level;
- player inventory;
- localization;
- Rocco appearance accessors;
- Stan state accessors;
- inventory runtime controller;
- dropped-inventory controller;
- developer runtime controller;
- scripted-sequence controller;
- transition controller.

The context is a read-only interaction context passed to rules.

## Scene-click dispatch

Scene clicks use two registry stages with exit-intent processing between them:

1. Dispatch `scene-click` rules registered for `before-exit-intent`.
2. If one of those rules matches, return its disposition immediately.
3. Otherwise update pending exit intent through `RoccoLevelTransitionController`.
4. Dispatch the default `scene-click` rules.

The `before-exit-intent` stage currently supports behavior that must take precedence over connector intent, including developer overrides and dropped-item pickup.

The default stage handles carried inventory use and active-level fallback behavior.

## Special carried-item scene clicks

Some interactions combine a scene click with the grid-menu item currently carried by the cursor.

`RoccoInventoryRuntimeController` detects carried items owned by the Rocco inventory or an active storage-transfer menu. It delegates game-specific target resolution through `RoccoSceneActionRouter.handleSpecialInventorySceneClick()`.

The router then uses the registry's dedicated special-inventory dispatch. These rules are separate from ordinary `InteractionRule` entries because their match and execution contracts also receive the carried grid item.

## Registry composition

`createRoccoInteractionRegistry()` registers:

1. core rules;
2. Pier action-menu rules;
3. inventory rules;
4. dropped-inventory rules;
5. active-level fallback rules;
6. Pier special carried-item rules.

The completed registry is validated before use.

The numerical registration order is not execution priority. Execution order is determined by action kind, stage, and descending rule priority.
