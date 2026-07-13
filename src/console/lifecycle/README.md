# Console Lifecycle and Resource Scopes

This directory owns the runtime lifecycle state machine and the hierarchical
`ResourceScope` primitives introduced for ROCCO-007 (Runtime lifecycle FSM) and
ROCCO-008 (Hierarchical ResourceScope).

They implement the cross-cutting `Lifecycle` (audit §6.1) and `ResourceScope`
(§6.2) contracts and back the `GameRuntime` teardown ordering described in
LIF-001.

## Lifecycle states

```text
new → initializing → ready → stopping → stopped → disposing → disposed
                                             ↘ failed
```

`GameRuntime` owns one `LifecycleStateMachine` (`lifecycle.ts`). `init()` and
`dispose()` are idempotent, a failed `init()` rolls back partial resources and
leaves the runtime in `failed`, and a `disposed` runtime is terminal (construct
a new instance to run again). The render tick is skipped unless the state is
`ready`, so no update runs after disposal begins.

## ResourceScope

A `ResourceScope` owns a set of disposable resources and bare disposers:

- `add(resource)` registers a `DisposableResource` and returns it for chaining.
- `defer(disposer)` registers a bare disposer.
- `createChild(id)` creates a child scope owned by this scope.
- `dispose()` is idempotent, runs disposers in LIFO order, aborts its own
  `AbortSignal`, aggregates every failure into a `ResourceScopeDisposalError`,
  and refuses new registrations after it is closed.

### Scope hierarchy

```text
RuntimeScope
  └─ CartridgeScope
      └─ GameScope
          └─ LevelScope
              └─ SequenceScope
```

`GameRuntime` builds the root `RuntimeScope` and the first child
`CartridgeScope` and registers every subsystem disposer in reverse of the
required stop order, so LIFO disposal matches the LIF-001 stop sequence:

```text
1. stop ticker + remove resize listener
2. deactivate / unmount cartridge  (CartridgeScope)
3. unmount input
4. destroy video
5. destroy jukebox
6. destroy audio
7. destroy Pixi app + DOM
```

`GameScope`, `LevelScope`, and `SequenceScope` are added by later work
(transition service, level decomposition) as further children of
`CartridgeScope`.

## Fitness-function alignment

- Every resource is registered under an owner scope (no orphan resources).
- Cleanup is idempotent and aggregates errors instead of stopping early.
- Async operations receive cancellation through the scope `AbortSignal`.

## Files

- `lifecycle.ts` — `LifecycleState`, `Lifecycle`, `DisposableResource`,
  `ResourceScope`, and `LifecycleStateMachine`.
- `resource-scope.ts` — `ResourceScopeImpl`, `createResourceScope`, and the
  scope error types.
- `index.ts` — public barrel.
