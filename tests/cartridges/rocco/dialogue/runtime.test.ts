import { describe, expect, it } from 'vitest';

import type { RoccoEngine } from '../../../../src/console/engine-sdk';
import type {
  RoccoGridMenuActivation,
  RoccoGridMenuCarriedItem,
  RoccoGridMenuDefinition,
  RoccoGridMenuItem,
} from '../../../../src/console/video/grid-menu';
import type {
  RoccoSpriteMessageRequest,
  RoccoSpriteMessageText,
} from '../../../../src/console/video/messages';
import { RoccoDialogueSession } from '../../../../src/cartridges/rocco/rpce/dialogue/runtime';
import type { RoccoDialogueChoiceNode } from '../../../../src/cartridges/rocco/rpce/dialogue/types';

interface DialogueEngineMockState {
  inputEnabled: boolean;
  inputHistory: boolean[];
  openedMenus: RoccoGridMenuDefinition[];
  activeMenu: RoccoGridMenuDefinition | undefined;
  closedMenuCount: number;
  messages: string[];
  renderCalls: number;
}

function serializeMessageText(text: RoccoSpriteMessageText): string {
  return Array.isArray(text) ? text.join('|') : text;
}

function makeGridMenuActivation(
  definitionId: string,
  itemId: string,
  slotIndex = 0,
  items: RoccoGridMenuItem[] = [],
): RoccoGridMenuActivation {
  return {
    kind: 'grid-menu',
    definitionId,
    interaction: 'activate',
    itemId,
    slotIndex,
    items,
  };
}

function createEngineMock(state: DialogueEngineMockState): RoccoEngine {
  let legacyInputEnabled = state.inputEnabled;
  const activeInputLeases: Array<{
    ownerId: string;
    mode: 'interactive' | 'advance-only' | 'blocked';
  }> = [];

  const recomputeInputMode = (): 'interactive' | 'advance-only' | 'blocked' => {
    if (!legacyInputEnabled) {
      return 'blocked';
    }

    if (activeInputLeases.some((lease) => lease.mode === 'blocked')) {
      return 'blocked';
    }

    if (activeInputLeases.some((lease) => lease.mode === 'advance-only')) {
      return 'advance-only';
    }

    return 'interactive';
  };

  const syncLegacyInputState = (): void => {
    state.inputEnabled = recomputeInputMode() === 'interactive';
    state.inputHistory.push(state.inputEnabled);
  };

  return {
    video: {
      messages: {
        showMessage(message: RoccoSpriteMessageRequest) {
          state.messages.push(
            `${message.spriteInstanceId}:${message.mode}:${serializeMessageText(message.text)}`,
          );
        },
        say(spriteInstanceId: string, text: RoccoSpriteMessageText) {
          state.messages.push(`${spriteInstanceId}:say:${serializeMessageText(text)}`);
        },
        think(spriteInstanceId: string, text: RoccoSpriteMessageText) {
          state.messages.push(`${spriteInstanceId}:think:${serializeMessageText(text)}`);
        },
        removeMessage() {
          // noop
        },
        clearMessages() {
          state.messages.length = 0;
        },
        listMessages() {
          return [];
        },
        listRenderableMessages() {
          return [];
        },
        update() {
          // noop
        },
      },
      gridMenus: {
        openMenu(definition: RoccoGridMenuDefinition) {
          state.openedMenus.push(definition);
          state.activeMenu = definition;
        },
        toggleMenu(definition: RoccoGridMenuDefinition) {
          state.activeMenu = state.activeMenu?.id === definition.id ? undefined : definition;
        },
        closeMenu() {
          state.closedMenuCount += 1;
          state.activeMenu = undefined;
        },
        isOpen(definitionId?: string) {
          return definitionId
            ? state.activeMenu?.id === definitionId
            : state.activeMenu !== undefined;
        },
        setHoverAt() {
          return false;
        },
        getHoveredItem() {
          return undefined;
        },
        activateAt() {
          return undefined;
        },
        getCarriedItem() {
          return undefined as RoccoGridMenuCarriedItem | undefined;
        },
        clearCarriedItem() {
          // noop
        },
        getRenderableMenu() {
          return undefined;
        },
      },
      render() {
        state.renderCalls += 1;
      },
    },
    setInputEnabled(enabled: boolean) {
      legacyInputEnabled = enabled;
      syncLegacyInputState();
    },
    isInputEnabled() {
      return state.inputEnabled;
    },
    getInputMode: () => recomputeInputMode(),
    acquireInputLease(
      ownerId: string,
      mode: 'interactive' | 'advance-only' | 'blocked',
    ) {
      const lease = { ownerId, mode };
      activeInputLeases.push(lease);
      syncLegacyInputState();
      return {
        ownerId,
        mode,
        acquiredAt: 0,
        dispose() {
          const index = activeInputLeases.indexOf(lease);
          if (index >= 0) {
            activeInputLeases.splice(index, 1);
          }
          syncLegacyInputState();
        },
      };
    },
    beginCompositionSession: () => ({
      id: 'test',
      ownerId: 'test',
      message: null,
      status: 'active' as const,
      report() {},
      fail() {},
      dispose() {},
    }),
  } as unknown as RoccoEngine;
}

function makeState(): DialogueEngineMockState {
  return {
    inputEnabled: true,
    inputHistory: [],
    openedMenus: [],
    activeMenu: undefined,
    closedMenuCount: 0,
    messages: [],
    renderCalls: 0,
  };
}

describe('RoccoDialogueSession', () => {
  it('progresses from root choices to nested choices and back to idle', () => {
    const state = makeState();
    const engine = createEngineMock(state);
    const rootChoices: readonly RoccoDialogueChoiceNode[] = [
      {
        id: 'introduce-self',
        playerLine: "Uhhh... excuse me sir, I'm Rocco",
        npcLine: 'I am Stan. What do you want?',
        choices: [
          {
            id: 'ask-owner',
            playerLine: 'Are you the owner of the shop?',
            npcLine: 'Of this shop, yes.',
          },
        ],
      },
    ];
    const session = new RoccoDialogueSession({
      id: 'stan-dialogue',
      engine,
      playerSpriteInstanceId: 'rocco',
      npcSpriteInstanceId: 'stan',
    });

    session.beginConversation({ choices: rootChoices });

    expect(state.messages).toEqual([]);
    expect(state.inputEnabled).toBe(true);
    expect(session.isActive()).toBe(true);
    expect(session.isAwaitingChoice()).toBe(true);
    expect(state.activeMenu?.items).toEqual([
      {
        id: 'introduce-self',
        label: "Uhhh... excuse me sir, I'm Rocco",
        slotIndex: 0,
      },
    ]);
    expect(state.inputEnabled).toBe(true);

    expect(
      session.handleGridMenu(makeGridMenuActivation('stan-dialogue', 'introduce-self')),
    ).toBe(true);
    expect(state.messages.at(-1)).toBe("rocco:say:Uhhh... excuse me sir, I'm Rocco");
    expect(state.inputEnabled).toBe(false);

    session.update(4799);

    expect(state.messages).not.toContain('stan:say:I am Stan. What do you want?');

    session.update(1);

    expect(state.messages.at(-1)).toBe('stan:say:I am Stan. What do you want?');

    session.update(5599);

    expect(session.isAwaitingChoice()).toBe(false);

    session.update(1);

    expect(session.isAwaitingChoice()).toBe(true);
    expect(state.activeMenu?.items).toEqual([
      {
        id: 'ask-owner',
        label: 'Are you the owner of the shop?',
        slotIndex: 0,
      },
    ]);

    expect(session.handleGridMenu(makeGridMenuActivation('stan-dialogue', 'ask-owner'))).toBe(true);
    expect(state.messages.at(-1)).toBe('rocco:say:Are you the owner of the shop?');

    session.update(4800);

    expect(state.messages.at(-1)).toBe('stan:say:Of this shop, yes.');

    session.update(5600);

    expect(session.isActive()).toBe(false);
    expect(session.isAwaitingChoice()).toBe(false);
    expect(state.inputEnabled).toBe(true);
  });

  it('keeps multi-line NPC replies active for one ttl per line', () => {
    const state = makeState();
    const engine = createEngineMock(state);
    const session = new RoccoDialogueSession({
      id: 'stan-dialogue',
      engine,
      playerSpriteInstanceId: 'rocco',
      npcSpriteInstanceId: 'stan',
    });

    session.beginConversation({
      choices: [
        {
          id: 'bathroom',
          playerLine: 'Then where can I find one?',
          npcLine: ['Across the street.', 'Where the pier begins.'],
        },
      ],
    });

    expect(session.isAwaitingChoice()).toBe(true);
    expect(
      session.handleGridMenu(makeGridMenuActivation('stan-dialogue', 'bathroom')),
    ).toBe(true);

    session.update(4800);

    expect(state.messages.at(-1)).toBe('stan:say:Across the street.|Where the pier begins.');
    expect(session.isActive()).toBe(true);

    session.update(11199);

    expect(session.isActive()).toBe(true);
    expect(state.inputEnabled).toBe(false);

    session.update(1);

    expect(session.isActive()).toBe(false);
    expect(state.inputEnabled).toBe(true);
  });
});
