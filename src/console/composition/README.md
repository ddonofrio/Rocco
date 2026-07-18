# Composition Service

This directory owns the composable, nestable loading-overlay sessions. Each session owns the overlay it opens, so only its owner can close it.

## Two API layers

The composition system exposes two distinct surfaces. The `ConsoleKernel`
facade is the narrowed kernel boundary; the internal `CompositionService` is the
owned implementation. Cartridges never receive `ConsoleKernel` and use the
capability-filtered SDK instead.

### ConsoleKernel facade

The kernel opens a composition session as a narrowed facade:

```ts
const session = kernel.beginCompositionSession('level-transition', {
  message: 'LOADING 0%',
});
session.report({ completed: 30, total: 100, message: 'LOADING 30%' });
session.fail(error);
session.dispose(); // only the owner can close its overlay
```

Documented kernel method:

```ts
beginCompositionSession(
  ownerId: string,
  options?: { message?: string },
): CompositionSession;
```

`ConsoleKernel.beginCompositionSession()` takes the owner id and an optional
`message`. It does not accept `mode`. `GameRuntime` implements this facade by
delegating to the owned `CompositionService` (`runtime.ts`:
`this.compositionService.begin({ ownerId, message: options.message })`).

### Internal service

Console-internal callers that hold the owned service use the options-object API,
which is where `mode` lives:

```ts
const session = composition.begin({
  ownerId: 'level-transition',
  mode: 'exclusive',
  message: 'LOADING 0%',
});
```

Documented service method:

```ts
begin(options: {
  ownerId: string;
  mode?: CompositionMode;
  message?: string;
}): CompositionSession;
```

See `composition-service.ts` for the authoritative interface and implementation.

- Only the returned session may `report`, `fail`, or `dispose` its own overlay.
  A cross-owner call throws `CompositionOwnershipError`.
- When several sessions are open, the most recently begun active session drives
  the visible overlay.
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
