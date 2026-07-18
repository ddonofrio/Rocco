# Composition Service

This directory owns the composable, nestable loading-overlay sessions. Each session owns the overlay it opens, so only its owner can close it.

## Sessions

```ts
const session = kernel.beginCompositionSession('level-transition', {
  message: 'LOADING 0%',
});
session.report({ completed: 30, total: 100, message: 'LOADING 30%' });
session.fail(error);
session.dispose(); // only the owner can close its overlay
```

- `beginCompositionSession({ ownerId, mode?, message? })` returns a
  `CompositionSession` capability.
- Only the returned session may `report`, `fail`, or `dispose` its own overlay.
  A cross-owner call throws `CompositionOwnershipError`.
- `getActiveMessage()` returns the message of the most-recently-begun still-open
  session, or `null` when none is open. `RuntimeCompositionPresenter` renders (or
  hides) the overlay from this value via an `onChange` subscription.
- `getActiveStatus()` / `listSessions()` expose diagnostics.
- IDs are a monotonic `composition-<n>` counter, so tests are deterministic.

Because each overlay is owned by its session, two nested compositions do not
close each other, and an overlay only disappears when its owner disposes it.
A failed transition disposes the session without ever displaying `100%`.

## Wiring

`GameRuntime` owns one `CompositionServiceImpl` and subscribes
`onChange(() => syncCompositionOverlay())`. `RuntimeCompositionPresenter` owns
the Pixi overlay nodes and renders them using the real screen dimensions
(`app.screen`) instead of a hardcoded background or text anchor.

## Files

- `composition-service.ts` — `CompositionSession`, `CompositionService`,
  `CompositionOwnershipError`, and the default implementation.
- `../runtime-composition-presenter.ts` — Pixi overlay presentation and cleanup.
- `index.ts` — public barrel.
