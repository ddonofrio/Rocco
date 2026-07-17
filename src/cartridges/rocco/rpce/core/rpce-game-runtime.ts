import type {
  CartridgeActionDisposition,
  CartridgeActionContext,
  RoccoCartridgeAction,
} from '../../../../console/cartridges';
import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RpceAssetPreloader } from './rpce-asset-preloader';
import type { RpceGameDefinition } from './rpce-map';

export interface RpceGameRuntimeController<TMountResult = unknown> {
  mount(engine: RoccoEngine, preloader?: RpceAssetPreloader): Promise<TMountResult>;
  unmount(): void;
  update(deltaMs: number): void;
  handleAction(action: RoccoCartridgeAction, context?: CartridgeActionContext): CartridgeActionDisposition | void;
  getActiveLevelId?(): string | undefined;
}

export interface RpceGameRuntimeOptions<
  TControllerOptions,
  TMountResult = unknown,
> {
  game: RpceGameDefinition<TControllerOptions, TMountResult>;
  controllerOptions: TControllerOptions;
}

export class RpceGameRuntime<TControllerOptions, TMountResult = unknown>
  implements RpceGameRuntimeController<TMountResult>
{
  private readonly game: RpceGameDefinition<TControllerOptions, TMountResult>;
  private readonly controller: RpceGameRuntimeController<TMountResult>;

  constructor(options: RpceGameRuntimeOptions<TControllerOptions, TMountResult>) {
    this.game = options.game;
    this.controller = options.game.createRuntimeController(options.controllerOptions);
  }

  get definition(): RpceGameDefinition<TControllerOptions, TMountResult> {
    return this.game;
  }

  async mount(engine: RoccoEngine, preloader?: RpceAssetPreloader): Promise<TMountResult> {
    this.game.hooks?.beforeMount?.();
    const result = await this.controller.mount(engine, preloader);
    this.game.hooks?.afterMount?.();
    return result;
  }

  unmount(): void {
    this.game.hooks?.beforeUnmount?.();
    this.controller.unmount();
  }

  update(deltaMs: number): void {
    this.controller.update(deltaMs);
  }

  handleAction(action: RoccoCartridgeAction, context?: CartridgeActionContext): CartridgeActionDisposition | void {
    return this.controller.handleAction(action, context);
  }

  getActiveLevelId(): string | undefined {
    return this.controller.getActiveLevelId?.();
  }
}
