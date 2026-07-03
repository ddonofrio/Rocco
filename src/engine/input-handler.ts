import type { RoccoRuntimeVideoSystem } from './video';
import type { RoccoCursorActionEvent, RoccoCursorMoveEvent } from './video/cursor';
import type { RoccoViewportHost } from './video/viewport';
import type { RoccoSpriteMessageRequest } from './video/messages';
import type { RoccoCartridge, RoccoCartridgeActionResult, RoccoSceneClickAction } from './cartridges';
import type { RoccoRuntimeAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';

const HOVER_DESCRIPTION_TITLE_ID = 'rocco-hover-visible-description';
const PLAYER_IDLE_SETTLE_DELAY_MS = 650;

interface InputHandlerOptions {
  videoSystem: RoccoRuntimeVideoSystem;
  audioSystem: RoccoRuntimeAudioSystem;
  jukeboxSystem: RoccoJukeboxSystem;
  viewportHost?: RoccoViewportHost;
  getActiveCartridge: () => RoccoCartridge | null;
  getActivePlayerSpriteId: () => string | null;
  showSpriteMessage: (message: RoccoSpriteMessageRequest) => void;
  log: (channel: string, message: string) => void;
}

type ResolvedSceneTargetKind = 'sprite' | 'scene-target';

interface ResolvedSceneTarget {
  kind: ResolvedSceneTargetKind;
  instanceId: string;
  definitionId: string;
}

interface ResolvedSceneVisibleTarget extends ResolvedSceneTarget {
  text: string;
  textKey?: string;
}

interface ResolvedSceneTargets {
  visibleTarget: ResolvedSceneVisibleTarget | undefined;
  target: ResolvedSceneTarget | undefined;
}

function isPromiseLike<T>(value: Promise<T> | T | void): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

export class RoccoInputHandler {
  private readonly videoSystem: RoccoRuntimeVideoSystem;
  private readonly audioSystem: RoccoRuntimeAudioSystem;
  private readonly jukeboxSystem: RoccoJukeboxSystem;
  private readonly viewportHost?: RoccoViewportHost;
  private readonly getActiveCartridge: () => RoccoCartridge | null;
  private readonly getActivePlayerSpriteId: () => string | null;
  private readonly showSpriteMessage: (message: RoccoSpriteMessageRequest) => void;
  private readonly logFn: (channel: string, message: string) => void;
  private activeHoverDescription: string | null = null;
  private inputEnabled = true;

  constructor(options: InputHandlerOptions) {
    this.videoSystem = options.videoSystem;
    this.audioSystem = options.audioSystem;
    this.jukeboxSystem = options.jukeboxSystem;
    this.viewportHost = options.viewportHost;
    this.getActiveCartridge = options.getActiveCartridge;
    this.getActivePlayerSpriteId = options.getActivePlayerSpriteId;
    this.showSpriteMessage = options.showSpriteMessage;
    this.logFn = options.log;
  }

  mount(): void {
    this.viewportHost?.setCursorActionHandler(this.handleCursorAction);
    this.viewportHost?.setCursorMoveHandler(this.handleCursorMove);
    this.viewportHost?.setCursorLeaveHandler(this.handleCursorLeave);
  }

  unmount(): void {
    this.viewportHost?.setCursorActionHandler(undefined);
    this.viewportHost?.setCursorMoveHandler(undefined);
    this.viewportHost?.setCursorLeaveHandler(undefined);
    this.viewportHost?.setCursorAttachment(undefined);
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  isInputEnabled(): boolean {
    return this.inputEnabled;
  }

  private readonly handleCursorAction = (event: RoccoCursorActionEvent): void => {
    const x = Math.round(event.sceneX);
    const y = Math.round(event.sceneY);

    // Runtime sequences can still consume clicks as "advance" inputs while normal interaction is disabled.
    if (!this.inputEnabled) {
      this.handleDisabledCursorAction(event, x, y);
      return;
    }

    if (this.clearForegroundMessages()) {
      this.setHoverDescription(undefined);
      this.videoSystem.render(0);
      this.logFn('Cursor', `DISMISS dialogue at (${x}, ${y}).`);
      return;
    }

    this.clearForegroundMessages();

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

  private handleDisabledCursorAction(
    event: RoccoCursorActionEvent,
    roundedX: number,
    roundedY: number,
  ): void {
    const targets = this.resolveSceneTargets(event.sceneX, event.sceneY);
    const sceneClickAction: RoccoSceneClickAction = {
      kind: 'scene-click',
      sceneX: event.sceneX,
      sceneY: event.sceneY,
      targetInstanceId: targets.visibleTarget?.instanceId ?? targets.target?.instanceId,
      targetDefinitionId: targets.visibleTarget?.definitionId ?? targets.target?.definitionId,
    };

    void this.getActiveCartridge()?.handleAction?.(sceneClickAction);

    if (targets.visibleTarget) {
      this.logFn(
        'Cursor',
        `ADVANCE click on ${targets.visibleTarget.kind} '${targets.visibleTarget.instanceId}' at (${roundedX}, ${roundedY}) while input is disabled.`,
      );
      return;
    }

    if (targets.target) {
      this.logFn(
        'Cursor',
        `ADVANCE click on ${targets.target.kind} '${targets.target.instanceId}' at (${roundedX}, ${roundedY}) while input is disabled.`,
      );
      return;
    }

    this.logFn('Cursor', `ADVANCE click at (${roundedX}, ${roundedY}) while input is disabled.`);
  }

  private readonly handleCursorMove = (event: RoccoCursorMoveEvent): void => {
    if (this.videoSystem.gridMenus.isOpen()) {
      if (this.videoSystem.gridMenus.setHoverAt(event.sceneX, event.sceneY)) {
        this.videoSystem.render(0);
      }
      const activeGridMenu = this.videoSystem.gridMenus.getRenderableMenu();
      const hoveredItem = this.videoSystem.gridMenus.getHoveredItem();
      this.setHoverDescription(
        activeGridMenu?.definition.layout === 'text-list' ? undefined : hoveredItem?.label,
      );
      return;
    }

    if (this.videoSystem.actionMenus.isOpen()) {
      if (this.videoSystem.actionMenus.setHoverAt(event.sceneX, event.sceneY)) {
        this.videoSystem.render(0);
      }
      const hoveredItem = this.videoSystem.actionMenus.getHoveredItem();
      this.setHoverDescription(hoveredItem?.label ?? hoveredItem?.actionId);
      return;
    }

    const targets = this.resolveSceneTargets(event.sceneX, event.sceneY);
    this.setHoverDescription(targets.visibleTarget?.text);
  };

  private readonly handleCursorLeave = (): void => {
    if (this.videoSystem.gridMenus.isOpen()) {
      const activation = this.videoSystem.gridMenus.activateAt(-1, -1);
      if (activation) {
        void this.getActiveCartridge()?.handleAction?.(activation);
      }
      this.videoSystem.gridMenus.clearCarriedItem();
      this.syncCursorAttachment();
      this.videoSystem.render(0);
    }
    if (this.videoSystem.actionMenus.isOpen()) {
      this.videoSystem.actionMenus.closeMenu();
      this.videoSystem.render(0);
    }
    this.setHoverDescription(undefined);
  };

  private handleGridMenuCursorAction(event: RoccoCursorActionEvent): boolean {
    if (!this.videoSystem.gridMenus.isOpen()) {
      return false;
    }

    const activation = this.videoSystem.gridMenus.activateAt(event.sceneX, event.sceneY);
    this.setHoverDescription(undefined);
    if (activation) {
      void this.getActiveCartridge()?.handleAction?.(activation);
      this.logFn(
        'GridMenu',
        `ACTION '${activation.interaction}'${activation.itemId ? ` for '${activation.itemId}'` : ''} on grid menu '${activation.definitionId}'.`,
      );
    }
    this.syncCursorAttachment();
    this.videoSystem.render(0);
    return true;
  }

  private handleActionMenuCursorAction(event: RoccoCursorActionEvent): boolean {
    if (!this.videoSystem.actionMenus.isOpen()) {
      return false;
    }

    const activation = this.videoSystem.actionMenus.activateAt(event.sceneX, event.sceneY);
    this.setHoverDescription(undefined);
    this.videoSystem.render(0);
    if (activation) {
      if (activation.result?.kind === 'sprite-message') {
        this.showSpriteMessage(activation.result.message);
      }
      void this.getActiveCartridge()?.handleAction?.(activation);
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

    const targets = this.resolveSceneTargets(event.sceneX, event.sceneY);
    const actionTarget = targets.visibleTarget ?? targets.target;
    if (actionTarget) {
      const activation: RoccoSceneClickAction = {
        kind: 'scene-click',
        sceneX: event.sceneX,
        sceneY: event.sceneY,
        targetInstanceId: actionTarget.instanceId,
        targetDefinitionId: actionTarget.definitionId,
      };
      this.setHoverDescription(undefined);
      void this.getActiveCartridge()?.handleAction?.(activation);
      this.logFn(
        'GridMenu',
        `USE carried grid item '${carriedItem.item.id}' on ${actionTarget.kind} '${actionTarget.instanceId}'.`,
      );
      this.syncCursorAttachment();
      this.videoSystem.render(0);
      return true;
    }

    this.videoSystem.gridMenus.clearCarriedItem();
    this.syncCursorAttachment();
    this.setHoverDescription(undefined);
    this.videoSystem.render(0);
    this.logFn('GridMenu', `CLEAR carried grid item at (${roundedX}, ${roundedY}).`);
    return true;
  }

  private handleSceneCursorAction(
    event: RoccoCursorActionEvent,
    roundedX: number,
    roundedY: number,
  ): void {
    const targets = this.resolveSceneTargets(event.sceneX, event.sceneY);
    const { visibleTarget, target } = targets;
    const playerSpriteId = this.getActivePlayerSpriteId();
    const actionTarget = visibleTarget ?? target;
    const actionTargetId = actionTarget?.instanceId;
    const suppressDefaultPlayerMoveByTarget = this.shouldSuppressDefaultPlayerMove(actionTarget);
    const sceneClickAction: RoccoSceneClickAction = {
      kind: 'scene-click',
      sceneX: event.sceneX,
      sceneY: event.sceneY,
      targetInstanceId: actionTargetId,
      targetDefinitionId: actionTarget?.definitionId,
    };

    const cartridgeActionResult = this.getActiveCartridge()?.handleAction?.(sceneClickAction);
    const suppressDefaultPlayerMoveByCartridge = isPromiseLike<RoccoCartridgeActionResult | void>(
      cartridgeActionResult,
    )
      ? false
      : cartridgeActionResult?.suppressDefaultPlayerMove === true;
    const suppressDefaultPlayerMove =
      suppressDefaultPlayerMoveByTarget || suppressDefaultPlayerMoveByCartridge;

    if (
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
      this.setHoverDescription(undefined);
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

  private shouldSuppressDefaultPlayerMove(
    target: ResolvedSceneTarget | undefined,
  ): boolean {
    if (!target || target.kind !== 'scene-target') {
      return false;
    }

    return (
      this.videoSystem.sceneTargets?.getTarget(target.instanceId)
        ?.suppressDefaultPlayerMove === true
    );
  }

  private resolveSceneTargets(sceneX: number, sceneY: number): ResolvedSceneTargets {
    const resolvedByVideoSystem = this.videoSystem.resolveSceneTargets?.(sceneX, sceneY);
    if (resolvedByVideoSystem) {
      return {
        visibleTarget: resolvedByVideoSystem.visibleTarget,
        target: resolvedByVideoSystem.target,
      };
    }

    const visibleHits = [
      ...this.videoSystem.sprites.hitTestVisiblePixel(sceneX, sceneY).map((hit) => ({
        kind: 'sprite' as const,
        instanceId: hit.instanceId,
        definitionId: hit.definitionId,
        text: hit.text,
        textKey: hit.textKey,
      })),
      ...(this.videoSystem.sceneTargets?.hitTestVisible(sceneX, sceneY).map((hit) => ({
        kind: 'scene-target' as const,
        instanceId: hit.instanceId,
        definitionId: hit.definitionId,
        text: hit.text,
        textKey: hit.textKey,
      })) ?? []),
    ];
    const hits =
      visibleHits.length > 0
        ? []
        : [
            ...this.videoSystem.sprites.hitTest(sceneX, sceneY).map((hit) => ({
              kind: 'sprite' as const,
              instanceId: hit.instanceId,
              definitionId: hit.definitionId,
            })),
            ...(this.videoSystem.sceneTargets?.hitTest(sceneX, sceneY).map((hit) => ({
              kind: 'scene-target' as const,
              instanceId: hit.instanceId,
              definitionId: hit.definitionId,
            })) ?? []),
          ];
    return {
      visibleTarget: visibleHits[0],
      target: hits[0],
    };
  }

  private setHoverDescription(text: string | undefined): void {
    const normalizedText = text?.trim() || undefined;
    if ((this.activeHoverDescription ?? undefined) === normalizedText) {
      return;
    }

    this.activeHoverDescription = normalizedText ?? null;
    if (!normalizedText) {
      this.videoSystem.titles.removeTitle(HOVER_DESCRIPTION_TITLE_ID);
      this.videoSystem.render(0);
      return;
    }

    const metrics = this.viewportHost?.getMetrics();
    const designWidth = metrics?.designWidth ?? 960;
    const designHeight = metrics?.designHeight ?? 540;
    this.videoSystem.titles.addTitle({
      id: HOVER_DESCRIPTION_TITLE_ID,
      text: normalizedText,
      renderLayer: 'overlay.titles',
      zIndex: 1000,
      x: designWidth / 2,
      y: designHeight - 42,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 22,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#3b433c',
          width: 4,
          alpha: 0.9,
        },
      },
      visible: true,
    });
    this.videoSystem.render(0);
  }

  private syncCursorAttachment(): void {
    const carriedItem = this.videoSystem.gridMenus.getCarriedItem();
    this.viewportHost?.setCursorAttachment(
      carriedItem?.item.imageUri
        ? {
            imageUri: carriedItem.item.imageUri,
            label: carriedItem.item.label,
            size: 46,
          }
        : undefined,
    );
  }
}
