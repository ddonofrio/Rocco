# Input Policy Stack

This directory owns the composable input-locking primitive introduced for
ROCCO-009 (InputPolicyStack), implementing the `InputPolicyLease` cross-cutting
contract from audit §6.4. It replaces the previous single global
`inputEnabled` boolean (INP-001).

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
const lease = engine.acquireInputLease('level-transition', 'blocked');
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
caller's lock — fixing the INP-001 nested-lock bug where any
`setInputEnabled(true)` re-enabled input globally.

## Wiring

`GameRuntime` owns one `InputPolicyStackImpl` and injects
`getInputMode: () => inputPolicy.getEffectiveMode()` into `RoccoInputHandler`.
The handler routes clicks as advance/disabled actions whenever the mode is not
`'interactive'`.

## Legacy compatibility

`RoccoEngine.setInputEnabled` / `isInputEnabled` are retained as `@deprecated`
shims backed by a ref-counted `'legacy-input'` lease. They are used by the large
per-level content files and will be removed during audit Phase 4 (level
decomposition). New code must use `acquireInputLease`.

## Files

- `input-policy-stack.ts` — `InputMode`, `InputPolicyLease`, `InputPolicyStack`
  and the default implementation.
- `index.ts` — public barrel.
