import { describe, expect, it, vi } from 'vitest';

import { ActionDispatcher } from '../../src/console/action-dispatcher';
import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridge,
  RoccoCartridgeAction,
} from '../../src/console/cartridges';

function makeCartridge(
  handleAction: (
    action: RoccoCartridgeAction,
    context: CartridgeActionContext,
  ) => CartridgeActionDisposition | void,
): RoccoCartridge {
  return {
    manifest: { id: 'test-cartridge', title: 'Test', version: '1.0.0' },
    mount() {},
    handleAction,
  };
}

function flush(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('ActionDispatcher', () => {
  it('returns the synchronous disposition from the cartridge', () => {
    const cartridge = makeCartridge(() => ({
      consumed: true,
      defaultPlayerMovement: 'suppress',
    }));

    const dispatcher = new ActionDispatcher({
      getActiveCartridge: () => cartridge,
      getActiveLevelId: () => 'level-1',
      log: () => {},
    });

    const disposition = dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 });

    expect(disposition).toEqual({ consumed: true, defaultPlayerMovement: 'suppress' });
  });

  it('treats an undefined result as not consumed and allows movement', () => {
    const cartridge = makeCartridge(() => undefined);

    const dispatcher = new ActionDispatcher({
      getActiveCartridge: () => cartridge,
      getActiveLevelId: () => 'level-1',
      log: () => {},
    });

    expect(dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 })).toEqual({
      consumed: false,
      defaultPlayerMovement: 'allow',
    });
  });

  it('captures and logs completion errors with context', async () => {
    const log = vi.fn();
    const cartridge = makeCartridge(() => ({
      consumed: true,
      defaultPlayerMovement: 'allow',
      completion: Promise.reject(new Error('boom')),
    }));

    const dispatcher = new ActionDispatcher({
      getActiveCartridge: () => cartridge,
      getActiveLevelId: () => 'level-1',
      log,
    });

    dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 });
    await flush();

    expect(log).toHaveBeenCalledWith(
      'ActionDispatcher',
      expect.stringContaining('boom'),
    );
  });

  it('auto-cancels in-flight actions when the active level changes', () => {
    const handledSignals: AbortSignal[] = [];
    let levelId = 'level-1';

    const cartridge = makeCartridge((_action, context) => {
      handledSignals.push(context.signal);
      return {
        consumed: true,
        defaultPlayerMovement: 'allow',
        completion: new Promise<void>(() => {}),
      };
    });

    const dispatcher = new ActionDispatcher({
      getActiveCartridge: () => cartridge,
      getActiveLevelId: () => levelId,
      log: () => {},
    });

    dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 });
    expect(handledSignals).toHaveLength(1);
    expect(handledSignals[0].aborted).toBe(false);

    levelId = 'level-2';
    dispatcher.dispatch({ kind: 'scene-click', sceneX: 1, sceneY: 1 });

    expect(handledSignals).toHaveLength(2);
    expect(handledSignals[0].aborted).toBe(true);
  });

  it('drops a second exclusive action while one is still in flight (double-click semantics)', () => {
    const handledActions: unknown[] = [];
    const cartridge = makeCartridge((action) => {
      handledActions.push(action);
      return {
        consumed: true,
        defaultPlayerMovement: 'allow',
        completion: new Promise<void>(() => {}),
      };
    });

    const dispatcher = new ActionDispatcher({
      getActiveCartridge: () => cartridge,
      getActiveLevelId: () => 'level-1',
      log: () => {},
    });

    dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 });
    dispatcher.dispatch({ kind: 'scene-click', sceneX: 1, sceneY: 1 });

    expect(handledActions).toHaveLength(1);
  });

  it('cancels all in-flight actions on dispose', () => {
    let captured: AbortSignal | undefined;
    const cartridge = makeCartridge((_action, context) => {
      captured = context.signal;
      return {
        consumed: true,
        defaultPlayerMovement: 'allow',
        completion: new Promise<void>(() => {}),
      };
    });

    const dispatcher = new ActionDispatcher({
      getActiveCartridge: () => cartridge,
      getActiveLevelId: () => 'level-1',
      log: () => {},
    });

    dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 });
    expect(captured?.aborted).toBe(false);

    dispatcher.dispose();
    expect(captured?.aborted).toBe(true);
    expect(dispatcher.dispatch({ kind: 'scene-click', sceneX: 0, sceneY: 0 })).toEqual({
      consumed: false,
      defaultPlayerMovement: 'allow',
    });
  });
});
