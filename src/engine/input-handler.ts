import type { RoccoRuntimeVideoSystem } from './video';
import type { RoccoCursorActionEvent, RoccoCursorMoveEvent } from './video/cursor';
import type { RoccoViewportHost } from './video/viewport';
import type { RoccoSpriteMessageRequest } from './video/messages';
import type { RoccoCartridge, RoccoSceneClickAction } from './cartridges';
import type { RoccoSpriteHit, RoccoSpriteVisiblePixelHit } from './video/sprites';
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

interface ResolvedSceneTargets {
  visibleTarget: RoccoSpriteVisiblePixelHit | undefined;
  target: RoccoSpriteHit | undefined;
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

    // Block input only when a runtime sequence explicitly disables it.
    if (!this.inputEnabled) {
      return;
    }

    this.videoSystem.messages.clearMessages();

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

  private readonly handleCursorMove = (event: RoccoCursorMoveEvent): void => {
    if (this.videoSystem.gridMenus.isOpen()) {
      if (this.videoSystem.gridMenus.setHoverAt(event.sceneX, event.sceneY)) {
        this.videoSystem.render(0);
      }
      const hoveredItem = this.videoSystem.gridMenus.getHoveredItem();
      this.setHoverDescription(hoveredItem?.label);
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

    const hit = this.videoSystem.sprites.hitTestVisiblePixel(event.sceneX, event.sceneY)[0];
    this.setHoverDescription(hit?.text);
  };

  private readonly handleCursorLeave = (): void => {
    if (this.videoSystem.gridMenus.isOpen()) {
      this.videoSystem.gridMenus.closeMenu();
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
        `ACTION '${activation.actionId}' on sprite '${activation.targetInstanceId}'.`,
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
        `USE carried grid item '${carriedItem.item.id}' on sprite '${actionTarget.instanceId}'.`,
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
    const actionTargetId = visibleTarget?.instanceId ?? target?.instanceId;
    const sceneClickAction: RoccoSceneClickAction = {
      kind: 'scene-click',
      sceneX: event.sceneX,
      sceneY: event.sceneY,
      targetInstanceId: actionTargetId,
      targetDefinitionId: visibleTarget?.definitionId ?? target?.definitionId,
    };

    void this.getActiveCartridge()?.handleAction?.(sceneClickAction);

    if (
      visibleTarget &&
      this.videoSystem.actionMenus.openMenuForTarget(
        visibleTarget.instanceId,
        visibleTarget.definitionId,
        event.sceneX,
        event.sceneY,
      )
    ) {
      if (playerSpriteId && visibleTarget.instanceId !== playerSpriteId) {
        this.videoSystem.sprites.goTo(playerSpriteId, event.sceneX, event.sceneY, {
          idleSettleDelayMs: PLAYER_IDLE_SETTLE_DELAY_MS,
          idleSettleFacing: 'diagonal-from-facing',
          targetInstanceId:
            visibleTarget.instanceId !== playerSpriteId
              ? visibleTarget.instanceId
              : undefined,
        });
      }
      this.setHoverDescription(undefined);
      this.videoSystem.render(0);
      this.logFn('ActionMenu', `OPEN for sprite '${visibleTarget.instanceId}' at (${roundedX}, ${roundedY}).`);
      return;
    }

    if (playerSpriteId) {
      this.videoSystem.sprites.goTo(playerSpriteId, event.sceneX, event.sceneY, {
        idleSettleDelayMs: PLAYER_IDLE_SETTLE_DELAY_MS,
        idleSettleFacing: 'diagonal-from-facing',
        targetInstanceId: actionTargetId && actionTargetId !== playerSpriteId ? actionTargetId : undefined,
      });
    }

    if (visibleTarget) {
      this.logFn('Cursor', `CLICK sprite '${visibleTarget.instanceId}' at (${roundedX}, ${roundedY}).`);
      return;
    }

    if (target) {
      this.logFn('Cursor', `CLICK sprite '${target.instanceId}' at (${roundedX}, ${roundedY}).`);
      return;
    }

    this.logFn('Cursor', `CLICK at (${roundedX}, ${roundedY}).`);
  }

  private resolveSceneTargets(sceneX: number, sceneY: number): ResolvedSceneTargets {
    const visibleHits = this.videoSystem.sprites.hitTestVisiblePixel(sceneX, sceneY);
    const hits = visibleHits.length > 0 ? [] : this.videoSystem.sprites.hitTest(sceneX, sceneY);
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
