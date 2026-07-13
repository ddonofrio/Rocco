# Composition Service

This directory owns the owned, nestable loading-overlay primitive introduced for
ROCCO-010 (CompositionSession), implementing the `CompositionSession`
cross-cutting contract from audit §6.5. It replaces the previous single global
`compositionOverlay` field (CMP-001), which any caller could close regardless of
who opened it.

## Sessions

```ts
const session = engine.beginCompositionSession('level-transition', {
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
  session, or `null` when none is open. The engine renders (or hides) the overlay
  from this value via an `onChange` subscription.
- `getActiveStatus()` / `listSessions()` expose diagnostics.
- IDs are a monotonic `composition-<n>` counter, so tests are deterministic.

Because each overlay is owned by its session, two nested compositions do not
close each other, and an overlay only disappears when its owner disposes it
(CMP-001 fix). The engine shows `100%` only after the success path reports it; a
failed transition disposes the session without ever displaying `100%`.

## Wiring

`GameRuntime` owns one `CompositionServiceImpl` and subscribes
`onChange(() => syncCompositionOverlay())`. Overlay rendering uses the real
screen dimensions (`app.screen`) instead of the previous hardcoded
`10000×10000` background and `480,270` text anchor.

## Legacy compatibility

`RoccoEngine.beginComposition` / `endComposition` / `setCompositionText` are
retained as `@deprecated` shims delegating to a single tracked
`'legacy-composition'` session. New code must use `beginCompositionSession`.

## Files

- `composition-service.ts` — `CompositionSession`, `CompositionService`,
  `CompositionOwnershipError`, and the default implementation.
- `index.ts` — public barrel.
