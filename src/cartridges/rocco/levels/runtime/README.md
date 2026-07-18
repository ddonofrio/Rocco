# Rocco Level Runtime

This directory contains the cartridge-runtime coordination layer used by `RoccoLevelManager`.

`RoccoLevelManager` owns the active cartridge-level runtime state and delegates focused responsibilities to the controllers, coordinators, services, registries, and state objects in this directory.

The runtime layer connects:

- the compiled RPCE game graph;
- `rocco-default` map implementations;
- active-level lifecycle;
- transitions;
- interaction dispatch;
- inventory;
- dropped items;
- scripted sequences;
- checkpoints;
- developer tools;
- status presentation;
- shared world state.

## Responsibility split

- `RoccoLevelManager` is the cartridge-level facade. It retains the active SDK, active level, selected localization, player appearance, transition task, and high-level delegates.
- `rocco-game-composition-root.ts` builds the compiled game and wires the runtime controllers used by the manager.
- RPCE compiles maps and cross-map connections into the game graph.
- `games/rocco-default/maps/*` owns concrete map definitions, screen behavior, and map presentation.
- `interactions/` owns feature rule registration and interaction priority.
- `inventory/` owns inventory-domain models, storages, recipes, and menu definitions.
- Runtime controllers in this directory coordinate those domains with the mounted cartridge.
- `levels/pier`, `levels/bait-shop`, and `levels/nether` provide re-export paths to the map implementations.

`RoccoLevelManager` does not directly implement each lower-level concern. It delegates to the components below.

## Files

- `rocco-game-composition-root.ts` — compiles the `rocco-default` game graph and constructs the transition, inventory, dropped-item, scripted-sequence, developer, interaction, and level-runtime services used by `RoccoLevelManager`.
- `rocco-level-registry.ts` — stores level instances created from the compiled game graph and prepares map-level resets.
- `rocco-level-transition-controller.ts` — resolves compiled connector endpoints, tracks pending exit intent, handles scripted connector resolution, and owns transition cooldown state.
- `rocco-level-transition-service.ts` — executes prepared transitions through prepare, commit, publish, rollback, remount, and completion handling.
- `rocco-transition-plan-factory.ts` — constructs transition plans for direct level switches, connector traversal, and bait-shop entry.
- `rocco-checkpoint-coordinator.ts` — constructs and runs checkpoint restart plans, including transactional Nether map reset and rollback.
- `rocco-world-state.ts` — owns runtime mount state, player and transition snapshots, Nether entry snapshots, rollback restoration, and remount support.
- `rocco-runtime-lifecycle-coordinator.ts` — coordinates mount, unmount, shared asset and sound setup, per-frame runtime updates, transition polling, and top-level action delegation.
- `rocco-scene-action-router.ts` — builds interaction context, enforces blocking-sequence behavior, places exit-intent updates between registry stages, and delegates actions to the interaction registry.
- `rocco-game-interaction-coordinator.ts` — coordinates collected-item effects, restart requests, scripted connector transitions, Stan state queries, bait-shop door overlap, and bait-shop entry.
- `rocco-inventory-runtime-controller.ts` — owns the live inventory runtime, registered storages, transfer sessions, grid-menu routing, fusion coordination, carried-item routing, snapshots, and world-drop handoff.
- `rocco-inventory-scene-coordinator.ts` — coordinates inventory-dependent scene presentation and active-level dropped-item synchronization.
- `rocco-dropped-inventory-controller.ts` — owns per-level dropped-item state, presentation, pending pickup, collection, and runtime reset.
- `rocco-scripted-sequence-controller.ts` — owns blocking game sequences and their input lease, cancellation, progression, and reset.
- `rocco-developer-runtime-controller.ts` — owns developer menus, jump state, runtime event overrides, inventory seeding, and sprite preview state.
- `rocco-status-presenter.ts` — builds localized status text and the mount callbacks supplied to concrete levels.
- `rocco-level-capabilities.ts` — defines and narrows optional capabilities implemented by specific Rocco levels.
- `rocco-level-transition-run.ts` — transition run helpers: active-run tracking, cancellation, abort-reason normalization, and shared transition types.
- `rocco-level-transition-preloader.ts` — abort-aware asset, plane-scene, sprite, sound, and walk-map preloader used during transitions.
- `rocco-level-transition-presentation.ts` — owns the transition input lease and loading-composition presentation.
- `rocco-level-transition-rollback.ts` — coordinates transition rollback, previous-level remount, and fatal-transition escalation.

## Runtime composition

`createRoccoGameCompositionRoot()`:

1. creates the runtime controller bundle;
2. builds and compiles the `rocco-default` maps and cross-map connections;
3. creates the level registry and transition controller;
4. creates the interaction registry and scene-action router;
5. wires callbacks between inventory, maps, transitions, developer state, and active-level ownership;
6. returns the runtime services and compiled game consumed by `RoccoLevelManager`.

The composition root creates object relationships. It does not replace `RoccoLevelManager` as the owner of the active runtime.

## Lifecycle coordination

`RoccoRuntimeLifecycleCoordinator` coordinates:

### Mount

- retaining the SDK facade;
- preloading shared UI and inventory assets;
- registering and preloading shared sounds;
- resetting transient runtime state;
- selecting the compiled initial level;
- mounting the initial level;
- installing the player action menu;
- synchronizing dropped-item presentation;
- publishing status.

### Update

- blocking scripted-sequence progression;
- active-level update;
- pending dropped-item pickup;
- pending bait-shop door choreography;
- connector transition polling;
- transition dispatch.

### Unmount

- resetting developer state;
- unmounting the active level;
- uninstalling the player action menu;
- invalidating transition state;
- clearing runtime controllers;
- clearing menus and carried payloads;
- unregistering shared sound;
- releasing active SDK and level references.

## Transition model

Transition responsibilities are separated:

- `RoccoLevelTransitionController` resolves connector intent and cooldown.
- `RoccoTransitionPlanFactory` creates prepared transition plans.
- `RoccoLevelTransitionService` executes plans and owns the transition transaction.
- `RoccoWorldState` captures and restores the state required for rollback or remount.
- `RoccoCheckpointCoordinator` builds restart plans and coordinates map reset when required.

A transition may prepare a target, commit runtime cleanup, publish the target state, roll back on failure, and remount the prior level when recovery is possible.

## Interaction and inventory boundaries

`RoccoSceneActionRouter` does not contain all game feature logic. Feature behavior belongs to the interaction registry and active map implementations.

`RoccoInventoryRuntimeController` does not define every game-specific item result. It owns storage mechanics and delegates special carried-item target behavior through the interaction router.

`RoccoLevelManager` exposes high-level inventory and interaction operations by delegating to these runtime components.

## Current scope

The current runtime layer covers:

- compiled game composition;
- active-level lifecycle;
- connector resolution and cooldown;
- transactional transitions;
- checkpoint restart and rollback;
- mount-state and player snapshots;
- Nether entry snapshots and map resets;
- interaction-context assembly and staged dispatch;
- player inventory and storage transfer;
- item fusion and world drops;
- dropped-item presentation and pickup;
- blocking sequences;
- developer runtime state;
- status presentation;
- shared asset and sound lifecycle.
