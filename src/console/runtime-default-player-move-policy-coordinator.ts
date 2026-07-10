import type { RoccoCartridgeActionResult } from './cartridges';
import type { RoccoSceneTargetDefinition } from './video/scene-targets';
import type { RoccoRuntimeResolvedSceneTarget } from './video/runtime-system';

interface RoccoRuntimeDefaultPlayerMovePolicyCoordinatorOptions {
  getSceneTarget: (instanceId: string) => RoccoSceneTargetDefinition | undefined;
}

interface ResolveDefaultPlayerMoveSuppressionOptions {
  target: RoccoRuntimeResolvedSceneTarget | undefined;
  cartridgeActionResult: Promise<void> | RoccoCartridgeActionResult | void;
}

function isPromiseLike(
  value: Promise<void> | RoccoCartridgeActionResult | void,
): value is Promise<void> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

export class RoccoRuntimeDefaultPlayerMovePolicyCoordinator {
  private readonly getSceneTarget: (instanceId: string) => RoccoSceneTargetDefinition | undefined;

  constructor(options: RoccoRuntimeDefaultPlayerMovePolicyCoordinatorOptions) {
    this.getSceneTarget = options.getSceneTarget;
  }

  shouldSuppressDefaultPlayerMove(
    options: ResolveDefaultPlayerMoveSuppressionOptions,
  ): boolean {
    return (
      this.shouldSuppressFromSceneTarget(options.target) ||
      this.shouldSuppressFromCartridgeActionResult(options.cartridgeActionResult)
    );
  }

  private shouldSuppressFromSceneTarget(
    target: RoccoRuntimeResolvedSceneTarget | undefined,
  ): boolean {
    if (!target || target.kind !== 'scene-target') {
      return false;
    }

    return this.getSceneTarget(target.instanceId)?.suppressDefaultPlayerMove === true;
  }

  private shouldSuppressFromCartridgeActionResult(
    result: Promise<void> | RoccoCartridgeActionResult | void,
  ): boolean {
    if (isPromiseLike(result)) {
      return false;
    }

    return result?.suppressDefaultPlayerMove === true;
  }
}
