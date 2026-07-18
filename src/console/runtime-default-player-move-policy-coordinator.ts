import type { CartridgeActionDisposition } from './cartridges';
import type { RoccoSceneTargetDefinition } from './video/scene-targets';
import type { RoccoRuntimeResolvedSceneTarget } from './video/runtime-system';

interface RoccoRuntimeDefaultPlayerMovePolicyCoordinatorOptions {
  getSceneTarget: (instanceId: string) => RoccoSceneTargetDefinition | undefined;
}

interface ResolveDefaultPlayerMoveSuppressionOptions {
  target: RoccoRuntimeResolvedSceneTarget | undefined;
  cartridgeDisposition: CartridgeActionDisposition | undefined;
}

export class RoccoRuntimeDefaultPlayerMovePolicyCoordinator {
  private readonly getSceneTarget: (instanceId: string) => RoccoSceneTargetDefinition | undefined;

  constructor(options: RoccoRuntimeDefaultPlayerMovePolicyCoordinatorOptions) {
    this.getSceneTarget = options.getSceneTarget;
  }

  private shouldSuppressFromSceneTarget(
    target: RoccoRuntimeResolvedSceneTarget | undefined,
  ): boolean {
    if (!target || target.kind !== 'scene-target') {
      return false;
    }

    return this.getSceneTarget(target.instanceId)?.suppressDefaultPlayerMove === true;
  }

  private shouldSuppressFromCartridgeDisposition(
    disposition: CartridgeActionDisposition | undefined,
  ): boolean {
    return disposition?.defaultPlayerMovement === 'suppress';
  }

  shouldSuppressDefaultPlayerMove(options: ResolveDefaultPlayerMoveSuppressionOptions): boolean {
    return (
      this.shouldSuppressFromSceneTarget(options.target) ||
      this.shouldSuppressFromCartridgeDisposition(options.cartridgeDisposition)
    );
  }
}
