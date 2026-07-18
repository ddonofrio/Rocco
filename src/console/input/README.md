# Input Policy Stack

This directory owns the composable input-locking primitive, which supersedes the previous single global `inputEnabled` boolean.

## Modes

```text
interactive  — full interaction allowed
advance-only — normal interaction off; advance/disabled routing only
blocked      — all interaction off
```

Effective mode = most restrictive of every active lease, priority
`blocked > advance-only > interactive`. With no lease held the mode is
`interactive`.

## Leases

```ts
const lease = kernel.acquireInputLease('level-transition', 'blocked');
try {
  // ...
} finally {
  lease.dispose();
}
```

- `acquire({ ownerId, mode })` returns an `InputPolicyLease` capability.
- Only the holder can release its own lease via `dispose()` (idempotent).
- `releaseAll(ownerId)` drops every lease owned by a scope on teardown.
- `getEffectiveMode()` / `isInteractive()` report the composed result.
- `listLeases()` returns `{ ownerId, mode, acquiredAt, ageMs }` for diagnostics.
- `onChange(listener)` fires only when the effective mode actually changes.

Because every lock is a lease, releasing one lock never invalidates another
caller's lock; nested input policies remain independent.

## Wiring

`GameRuntime` owns one `InputPolicyStackImpl` and injects
`getInputMode: () => inputPolicy.getEffectiveMode()` into `RoccoInputHandler`.
The handler routes clicks as advance/disabled actions whenever the mode is not
`'interactive'`.

## Files

- `input-policy-stack.ts` — `InputMode`, `InputPolicyLease`, `InputPolicyStack`
  and the default implementation.
- `index.ts` — public barrel.
