import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoActionMenuActivation } from '../../../../engine/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../engine/video/grid-menu';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  installDefaultBaitShopDoor,
  type RoccoBaitShopDoorController,
  type RoccoBaitShopDoorState,
} from './pier-bait-shop-door';
import {
  installDefaultStan,
  type RoccoStanPersistentState,
} from './pier-stan';
import type { RoccoPierSideAmbientController } from './pier-side-level';

export interface RoccoPierBeginningAmbientPersistentState {
  stan: RoccoStanPersistentState;
  door: RoccoBaitShopDoorState;
}

class RoccoPierBeginningAmbientController implements RoccoPierSideAmbientController {
  private readonly stan: RoccoPierSideAmbientController;
  private readonly door: RoccoBaitShopDoorController;

  constructor(
    stan: RoccoPierSideAmbientController,
    door: RoccoBaitShopDoorController,
  ) {
    this.stan = stan;
    this.door = door;
  }

  update(deltaMs: number): void {
    this.door.update(deltaMs);
    this.stan.update(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    this.stan.handleAction?.(activation);
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    this.stan.handleGridMenu?.(activation);
  }

  handleSceneClick(activation: RoccoSceneClickAction): void {
    this.stan.handleSceneClick?.(activation);
  }

  unmount(engine: RoccoEngine): void {
    this.stan.unmount(engine);
    this.door.unmount(engine);
  }
}

export async function installPierBeginningAmbient(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
  persistentState: RoccoPierBeginningAmbientPersistentState = {
    stan: { isIdentified: false },
    door: { revealed: true },
  },
): Promise<RoccoPierSideAmbientController> {
  persistentState.door.revealed = true;
  const door = await installDefaultBaitShopDoor(engine, {
    localization,
    initialState: persistentState.door,
  });
  const stan = await installDefaultStan(engine, localization, persistentState.stan);

  return new RoccoPierBeginningAmbientController(stan, door);
}
