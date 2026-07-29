# Input Policy Stack

This directory owns the composable input-policy stack.

## Modes

```text
interactive  — full interaction allowed
advance-only — normal interaction off; advance/disabled routing only
blocked      — all interaction off
```

Effective mode = most restrictive of every active lease, priority
`blocked > advance-only > interactive`. With no lease held the mode is
`interactive`.

## Two API layers

The input policy exposes two distinct surfaces. The `ConsoleKernel` facade is
the narrowed kernel boundary; the internal `InputPolicyStack` service is the
owned implementation. Cartridges never receive `ConsoleKernel` and use the
capability-filtered SDK instead.

### ConsoleKernel facade

The kernel exposes input control as a leased facade:

```ts
const lease = kernel.acquireInputLease('level-transition', 'blocked');
try {
  // ...
} finally {
  lease.dispose();
}
```

Documented kernel methods:

```ts
acquireInputLease(ownerId: string, mode: InputMode): InputPolicyLease;
getInputMode(): InputMode;
```

`ConsoleKernel.acquireInputLease()` takes the owner id and mode as positional
arguments. It does not accept an options object. `GameRuntime` implements this
facade by delegating to the owned `InputPolicyStack` (`runtime.ts`:
`this.inputPolicy.acquire({ ownerId, mode })`).

### Internal service

Console-internal callers that hold the owned service use the options-object API:

```ts
const lease = inputPolicy.acquire({
  ownerId: 'level-transition',
  mode: 'blocked',
});
```

Documented service methods:

```ts
acquire(options: { ownerId: string; mode: InputMode }): InputPolicyLease;
releaseAll(ownerId: string): void;
getEffectiveMode(): InputMode;
isInteractive(): boolean;
listLeases(): readonly InputPolicyLeaseInfo[];
onChange(listener: (mode: InputMode) => void): Disposer;
```

See `input-policy-stack.ts` for the authoritative interface and implementation.

- Only the holder can release its own lease via `dispose()` (idempotent); lease
  disposal releases only that lease.
- `releaseAll(ownerId)` drops every lease owned by a scope on teardown.
- `getEffectiveMode()` / `isInteractive()` report the composed result, where the
  effective mode is the most restrictive active mode.
- `listLeases()` returns `{ ownerId, mode, acquiredAt, ageMs }` for diagnostics.
- `onChange(listener)` fires only when the effective mode actually changes.

Because every lock is a lease, releasing one lock never invalidates another
caller's lock; nested input policies remain independent.

## Wiring

`GameRuntime` owns one `InputPolicyStackImpl` and injects
`getInputMode: () => inputPolicy.getEffectiveMode()` into `RoccoInputHandler`.
The handler routes clicks as advance/disabled actions whenever the mode is not
`'interactive'`. Cursor movement also clears hover descriptions while a lease
holds a non-interactive mode.

## Files

- `input-policy-stack.ts` — `InputMode`, `InputPolicyLease`, `InputPolicyStack`
  and the default implementation.
- `index.ts` — public barrel.
