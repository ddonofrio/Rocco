import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import type { RoccoPierSideAmbientController } from './pier-side-level';
import type { RoccoLocalization } from '../../localization';
import {
  installDefaultBaitShopDoor,
  type RoccoBaitShopDoorController,
  type RoccoBaitShopDoorState,
} from './pier-bait-shop-door';
import {
  installDefaultStan,
  type RoccoStanPersistentState,
} from './pier-stan';

export interface RoccoPierBeginningAmbientPersistentState {
  stan: RoccoStanPersistentState;
  door: RoccoBaitShopDoorState;
}

type RoccoSceneClickResult = {
  suppressDefaultPlayerMove?: boolean;
};

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

  handleSceneClick(activation: RoccoSceneClickAction): RoccoSceneClickResult | void {
    return this.stan.handleSceneClick?.(activation);
  }

  unmount(engine: RoccoEngine): void {
    this.stan.unmount(engine);
    this.door.unmount(engine);
  }
}

export async function installPierBeginningAmbient(
  engine: RoccoEngine,
  localization: RoccoLocalization,
  persistentState: RoccoPierBeginningAmbientPersistentState,
  preloader?: RoccoAssetPreloader,
  entryConnectorId?: string,
): Promise<RoccoPierSideAmbientController> {
  persistentState.door.revealed = true;
  const door = await installDefaultBaitShopDoor(engine, {
    localization,
    initialState: persistentState.door,
  }, preloader);
  const stan = await installDefaultStan(
    engine,
    localization,
    persistentState.stan,
    {
      justExitedShop: entryConnectorId === 'shop-exit',
    },
    preloader,
  );

  return new RoccoPierBeginningAmbientController(stan, door);
}
