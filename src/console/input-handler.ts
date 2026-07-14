import type { RoccoRuntimeVideoSystem } from './video';
import type { RoccoCursorActionEvent, RoccoCursorMoveEvent } from './video/cursor';
import type { RoccoViewportHost } from './video/viewport';
import type {
  RoccoCartridge,
  RoccoSceneClickAction,
  RoccoAdvanceSequenceAction,
  RoccoCarryUseAction,
} from './cartridges';
import type { RoccoRuntimeAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';
import { ActionDispatcher } from './action-dispatcher';
import type { InputMode } from './input/input-policy-stack';
import { RoccoRuntimeDefaultPlayerMovePolicyCoordinator } from './runtime-default-player-move-policy-coordinator';
import { RoccoRuntimeInputPresentationCoordinator } from './runtime-input-presentation-coordinator';

const PLAYER_IDLE_SETTLE_DELAY_MS = 650;
const MIN_MESSAGE_CANCEL_AGE_MS = 250;

type InputHandlerVideoSystem = Pick<RoccoRuntimeVideoSystem, 'render' | 'resolveSceneTargets'> & {
  readonly actionMenus: Pick<
    RoccoRuntimeVideoSystem['actionMenus'],
    'activateAt' | 'closeMenu' | 'getHoveredItem' | 'isOpen' | 'openMenuForTarget' | 'setHoverAt'
  >;
  readonly gridMenus: Pick<
    RoccoRuntimeVideoSystem['gridMenus'],
    'activateAt' | 'clearCarriedItem' | 'getCarriedItem' | 'getHoveredItem' | 'getRenderableMenu' | 'isOpen' | 'setHoverAt'
  >;
  readonly messages: Pick<RoccoRuntimeVideoSystem['messages'], 'listMessages' | 'removeMessage'>;
  readonly sceneTargets: Pick<RoccoRuntimeVideoSystem['sceneTargets'], 'getTarget'>;
  readonly sprites: Pick<RoccoRuntimeVideoSystem['sprites'], 'goTo'>;
  readonly titles: Pick<RoccoRuntimeVideoSystem['titles'], 'addTitle' | 'removeTitle'>;
};

interface InputHandlerOptions {
  videoSystem: InputHandlerVideoSystem;
  audioSystem: RoccoRuntimeAudioSystem;
  jukeboxSystem: RoccoJukeboxSystem;
  viewportHost?: RoccoViewportHost;
  getActiveCartridge: () => RoccoCartridge | null;
  getActivePlayerSpriteId: () => string | null;
  actionDispatcher?: ActionDispatcher;
  log: (channel: string, message: string) => void;
  /**
   * Returns the composed effective input mode. When `'interactive'`, full
   * interaction is allowed; otherwise clicks are routed as advance/disabled
   * actions. Sourced from the engine's `InputPolicyStack`.
   */
  getInputMode?: () => InputMode;
}

export class RoccoInputHandler {
  private readonly videoSystem: InputHandlerVideoSystem;
  private readonly audioSystem: RoccoRuntimeAudioSystem;
  private readonly jukeboxSystem: RoccoJukeboxSystem;
  private readonly viewportHost?: RoccoViewportHost;
  private readonly getActivePlayerSpriteId: () => string | null;
  private readonly actionDispatcher: ActionDispatcher;
  private readonly logFn: (channel: string, message: string) => void;
  private readonly defaultPlayerMovePolicy: RoccoRuntimeDefaultPlayerMovePolicyCoordinator;
  private readonly inputPresentation: RoccoRuntimeInputPresentationCoordinator;
  private readonly getInputMode: () => InputMode;

  constructor(options: InputHandlerOptions) {
    this.videoSystem = options.videoSystem;
    this.audioSystem = options.audioSystem;
    this.jukeboxSystem = options.jukeboxSystem;
    this.viewportHost = options.viewportHost;
    this.getActivePlayerSpriteId = options.getActivePlayerSpriteId;
    this.actionDispatcher = options.actionDispatcher ?? new ActionDispatcher({
      getActiveCartridge: options.getActiveCartridge,
      getActiveLevelId: () => null,
      log: options.log,
    });
    this.logFn = options.log;
    this.getInputMode = options.getInputMode ?? (() => 'interactive');
    this.defaultPlayerMovePolicy = new RoccoRuntimeDefaultPlayerMovePolicyCoordinator({
      getSceneTarget: (instanceId) => this.videoSystem.sceneTargets.getTarget(instanceId),
    });
    this.inputPresentation = new RoccoRuntimeInputPresentationCoordinator({
      videoSystem: this.videoSystem,
      viewportHost: this.viewportHost,
    });
  }

  mount(): void {
    this.viewportHost?.setCursorActionHandler(this.handleCursorAction);
    this.viewportHost?.setCursorMoveHandler(this.handleCursorMove);
    this.viewportHost?.setCursorLeaveHandler(this.handleCursorLeave);
  }

  unmount(): void {
    this.viewportHost?.setCursorActionHandler(undefined);
    this.viewportHost?.setCursorMoveHandler(undefined);
    this.viewportHost?.  setCursorLeaveHandler(undefined);
    this.inputPresentation.unmount();
    this.actionDispatcher.dispose();
  }

  private readonly handleCursorAction = (event: RoccoCursorActionEvent): void => {
    const x = Math.round(event.sceneX);
    const y = Math.round(event.sceneY);

    const inputMode = this.getInputMode();

    if (inputMode === 'blocked') {
      return;
    }

    if (inputMode === 'advance-only') {
      this.handleAdvanceOnlyCursorAction(event, x, y);
      return;
    }

    if (this.hasProtectedForegroundMessages()) {
      this.logFn('Cursor', `IGNORE dialogue dismiss at (${x}, ${y}) while dialogue is still protected.`);
      return;
    }

    if (this.clearForegroundMessages()) {
      this.inputPresentation.setHoverDescription(undefined);
      this.videoSystem.render(0);
      this.logFn('Cursor', `DISMISS dialogue at (${x}, ${y}).`);
      return;
    }

    if (this.handleGridMenuCursorAction(event)) {
      return;
    }

    if (this.handleActionMenuCursorAction(event)) {
      return;
    }

    this.audioSystem.unlock();
    this.jukeboxSystem.unlock();

    if (this.handleCarriedItemCursorAction(event, x, y)) {
      return;
    }

    this.handleSceneCursorAction(event, x, y);
  };

  private handleAdvanceOnlyCursorAction(
    _event: RoccoCursorActionEvent,
    roundedX: number,
    roundedY: number,
  ): void {
    const advanceAction: RoccoAdvanceSequenceAction = {
      kind: 'advance-sequence',
    };

    this.actionDispatcher.dispatch(advanceAction, { owner: 'advance-only' });
    this.logFn('Cursor', `ADVANCE click at (${roundedX}, ${roundedY}).`);
  }

  private readonly handleCursorMove = (event: RoccoCursorMoveEvent): void => {
    if (this.getInputMode() !== 'interactive') {
      return;
    }

    if (this.videoSystem.gridMenus.isOpen()) {
      if (this.videoSystem.gridMenus.setHoverAt(event.sceneX, event.sceneY)) {
        this.videoSystem.render(0);
      }
      const activeGridMenu = this.videoSystem.gridMenus.getRenderableMenu();
      const hoveredItem = this.videoSystem.gridMenus.getHoveredItem();
      this.inputPresentation.setHoverDescription(
        activeGridMenu?.definition.layout === 'text-list' ? undefined : hoveredItem?.label,
      );
      return;
    }

    if (this.videoSystem.actionMenus.isOpen()) {
      if (this.videoSystem.actionMenus.setHoverAt(event.sceneX, event.sceneY)) {
        this.videoSystem.render(0);
      }
      const hoveredItem = this.videoSystem.actionMenus.getHoveredItem();
      this.inputPresentation.setHoverDescription(hoveredItem?.label ?? hoveredItem?.actionId);
      return;
    }

    const targets = this.videoSystem.resolveSceneTargets(event.sceneX, event.sceneY);
    this.inputPresentation.setHoverDescription(targets.visibleTarget?.text);
  };

  private readonly handleCursorLeave = (): void => {
    if (this.getInputMode() !== 'interactive') {
      return;
    }

    if (this.videoSystem.gridMenus.isOpen()) {
      const activation = this.videoSystem.gridMenus.activateAt(-1, -1);
      if (activation) {
        this.actionDispatcher.dispatch(activation, { owner: 'grid-menu-leave' });
      }
      this.videoSystem.gridMenus.clearCarriedItem();
      this.inputPresentation.syncCarriedCursorAttachment();
      this.videoSystem.render(0);
    }
    if (this.videoSystem.actionMenus.isOpen()) {
      this.videoSystem.actionMenus.closeMenu();
      this.videoSystem.render(0);
    }
    this.inputPresentation.setHoverDescription(undefined);
  };

  private handleGridMenuCursorAction(event: RoccoCursorActionEvent): boolean {
    if (!this.videoSystem.gridMenus.isOpen()) {
      return false;
    }

    const activation = this.videoSystem.gridMenus.activateAt(event.sceneX, event.sceneY);
    this.inputPresentation.setHoverDescription(undefined);
    if (activation) {
      if (activation.interaction === 'carry') {
        const carriedItem = this.videoSystem.gridMenus.getCarriedItem();
        const targets = this.videoSystem.resolveSceneTargets(event.sceneX, event.sceneY);
        const actionTarget = targets.visibleTarget ?? targets.target;
        if (carriedItem && actionTarget) {
          const sceneClickAction: RoccoSceneClickAction = {
            kind: 'scene-click',
            sceneX: event.sceneX,
            sceneY: event.sceneY,
            targetInstanceId: actionTarget.instanceId,
            targetDefinitionId: actionTarget.definitionId,
          };
          const carryUseAction: RoccoCarryUseAction = {
            kind: 'carry-use',
            gridMenuActivation: activation,
            sceneClick: sceneClickAction,
            carriedItem,
          };
          this.actionDispatcher.dispatch(carryUseAction, { owner: 'grid-menu-carry-use' });
          this.logFn(
            'GridMenu',
            `USE carried grid item '${carriedItem.item.id}' on ${actionTarget.kind} '${actionTarget.instanceId}' directly from grid menu.`,
          );
          this.inputPresentation.syncCarriedCursorAttachment();
          this.videoSystem.render(0);
          return true;
        }
      }

      this.actionDispatcher.dispatch(activation, { owner: 'grid-menu' });
      this.logFn(
        'GridMenu',
        `ACTION '${activation.interaction}'${activation.itemId ? ` for '${activation.itemId}'` : ''} on grid menu '${activation.definitionId}'.`,
      );
    }
    this.inputPresentation.syncCarriedCursorAttachment();
    this.videoSystem.render(0);
    return true;
  }

  private handleActionMenuCursorAction(event: RoccoCursorActionEvent): boolean {
    if (!this.videoSystem.actionMenus.isOpen()) {
      return false;
    }

    const activation = this.videoSystem.actionMenus.activateAt(event.sceneX, event.sceneY);
    this.inputPresentation.setHoverDescription(undefined);
    this.videoSystem.render(0);
    if (activation) {
      this.actionDispatcher.dispatch(activation, { owner: 'action-menu' });
      this.logFn(
        'ActionMenu',
        `ACTION '${activation.actionId}' on target '${activation.targetInstanceId}'.`,
      );
    }

    return true;
  }

  private handleCarriedItemCursorAction(
    event: RoccoCursorActionEvent,
    roundedX: number,
    roundedY: number,
  ): boolean {
    const carriedItem = this.videoSystem.gridMenus.getCarriedItem();
    if (!carriedItem) {
      return false;
    }

    const targets = this.videoSystem.resolveSceneTargets(event.sceneX, event.sceneY);
    const actionTarget = targets.visibleTarget ?? targets.target;
    if (actionTarget) {
      const activation: RoccoSceneClickAction = {
        kind: 'scene-click',
        sceneX: event.sceneX,
        sceneY: event.sceneY,
        targetInstanceId: actionTarget.instanceId,
        targetDefinitionId: actionTarget.definitionId,
      };
      this.inputPresentation.setHoverDescription(undefined);
      this.actionDispatcher.dispatch(activation, { owner: 'carried-item' });
      this.logFn(
        'GridMenu',
        `USE carried grid item '${carriedItem.item.id}' on ${actionTarget.kind} '${actionTarget.instanceId}'.`,
      );
      this.inputPresentation.syncCarriedCursorAttachment();
      this.videoSystem.render(0);
      return true;
    }

    this.videoSystem.gridMenus.clearCarriedItem();
    this.inputPresentation.syncCarriedCursorAttachment();
    this.inputPresentation.setHoverDescription(undefined);
    this.videoSystem.render(0);
    this.logFn('GridMenu', `CLEAR carried grid item at (${roundedX}, ${roundedY}).`);
    return true;
  }

  private handleSceneCursorAction(
    event: RoccoCursorActionEvent,
    roundedX: number,
    roundedY: number,
  ): void {
    const targets = this.videoSystem.resolveSceneTargets(event.sceneX, event.sceneY);
    const { visibleTarget, target } = targets;
    const playerSpriteId = this.getActivePlayerSpriteId();
    const actionTarget = visibleTarget ?? target;
    const actionTargetId = actionTarget?.instanceId;
    const sceneClickAction: RoccoSceneClickAction = {
      kind: 'scene-click',
      sceneX: event.sceneX,
      sceneY: event.sceneY,
      targetInstanceId: actionTargetId,
      targetDefinitionId: actionTarget?.definitionId,
    };

    const cartridgeActionResult = this.actionDispatcher.dispatch(sceneClickAction, {
      owner: 'scene-click',
    });
    const sceneClickConsumed = cartridgeActionResult.consumed === true;
    const suppressDefaultPlayerMove = this.defaultPlayerMovePolicy.shouldSuppressDefaultPlayerMove({
      target: actionTarget,
      cartridgeDisposition: cartridgeActionResult,
    });

    if (
      !sceneClickConsumed &&
      visibleTarget &&
      this.videoSystem.actionMenus.openMenuForTarget(
        visibleTarget.instanceId,
        visibleTarget.definitionId,
        event.sceneX,
        event.sceneY,
      )
    ) {
      if (
        playerSpriteId &&
        visibleTarget.instanceId !== playerSpriteId &&
        !suppressDefaultPlayerMove
      ) {
        this.videoSystem.sprites.goTo(playerSpriteId, event.sceneX, event.sceneY, {
          idleSettleDelayMs: PLAYER_IDLE_SETTLE_DELAY_MS,
          idleSettleFacing: 'diagonal-from-facing',
          targetInstanceId:
            visibleTarget.kind === 'sprite' && visibleTarget.instanceId !== playerSpriteId
              ? visibleTarget.instanceId
              : undefined,
        });
      }
      this.inputPresentation.setHoverDescription(undefined);
      this.videoSystem.render(0);
      this.logFn(
        'ActionMenu',
        `OPEN for ${visibleTarget.kind} '${visibleTarget.instanceId}' at (${roundedX}, ${roundedY}).`,
      );
      return;
    }

    if (playerSpriteId && !suppressDefaultPlayerMove) {
      this.videoSystem.sprites.goTo(playerSpriteId, event.sceneX, event.sceneY, {
        idleSettleDelayMs: PLAYER_IDLE_SETTLE_DELAY_MS,
        idleSettleFacing: 'diagonal-from-facing',
        targetInstanceId:
          actionTarget?.kind === 'sprite' && actionTargetId && actionTargetId !== playerSpriteId
            ? actionTargetId
            : undefined,
      });
    }

    if (visibleTarget) {
      this.logFn(
        'Cursor',
        `CLICK ${visibleTarget.kind} '${visibleTarget.instanceId}' at (${roundedX}, ${roundedY}).`,
      );
      return;
    }

    if (target) {
      this.logFn('Cursor', `CLICK ${target.kind} '${target.instanceId}' at (${roundedX}, ${roundedY}).`);
      return;
    }

    this.logFn('Cursor', `CLICK at (${roundedX}, ${roundedY}).`);
  }

  private clearForegroundMessages(): boolean {
    const foregroundMessages = this.videoSystem.messages
      .listMessages()
      .filter((message) => message.background !== true);
    if (foregroundMessages.length === 0) {
      return false;
    }

    for (const message of foregroundMessages) {
      this.videoSystem.messages.removeMessage(message.id);
    }

    return true;
  }

  private hasProtectedForegroundMessages(): boolean {
    return this.videoSystem.messages
      .listMessages()
      .some(
        (message) =>
          message.background !== true &&
          this.resolveCurrentMessageVisibleAgeMs(message.durationMs, message.ttlMs) <
            MIN_MESSAGE_CANCEL_AGE_MS,
      );
  }

  private resolveCurrentMessageVisibleAgeMs(durationMs: number, ttlMs: number): number {
    if (!Number.isFinite(durationMs) || !Number.isFinite(ttlMs)) {
      return MIN_MESSAGE_CANCEL_AGE_MS;
    }

    return Math.max(0, durationMs - ttlMs);
  }
}
