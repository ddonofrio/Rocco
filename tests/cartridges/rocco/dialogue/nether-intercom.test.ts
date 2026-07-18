import { describe, expect, it } from 'vitest';

import type { ConsoleKernel } from '../../../../src/console/console-kernel';
import { asRoccoTestSdk } from '../test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import type { RoccoGridMenuItem } from '../../../../src/console/video/grid-menu';
import type {
  RoccoSpriteMessageRequest,
  RoccoSpriteMessageText,
} from '../../../../src/console/video/messages';
import { RoccoDialogueSession } from '../../../../src/cartridges/rocco/rpce/dialogue/runtime';
import { spanishNetherText } from '../../../../src/cartridges/rocco/localization/es/nether';

interface IntercomEngineMockState {
  inputEnabled: boolean;
  messages: string[];
}

function serializeMessageText(text: RoccoSpriteMessageText): string {
  return Array.isArray(text) ? text.join('|') : text;
}

interface IntercomFixture {
  state: IntercomEngineMockState;
  session: RoccoDialogueSession;
}

function createEngineMock(state: IntercomEngineMockState): CartridgeSdkV1Runtime {
  return asRoccoTestSdk({
    video: {
      messages: {
        showMessage(message: RoccoSpriteMessageRequest) {
          state.messages.push(
            `${message.spriteInstanceId}:${message.mode}:${serializeMessageText(message.text)}`,
          );
        },
        say(spriteInstanceId: string, text: RoccoSpriteMessageText, _options?: unknown) {
          state.messages.push(`${spriteInstanceId}:say:${serializeMessageText(text)}`);
        },
        think(spriteInstanceId: string, text: RoccoSpriteMessageText, _options?: unknown) {
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
        openMenu() {},
        toggleMenu() {},
        closeMenu() {},
        isOpen() {
          return false;
        },
        setHoverAt() {
          return false;
        },
        getHoveredItem() {
          return;
        },
        activateAt() {},
        getCarriedItem() {
          return undefined as RoccoGridMenuItem | undefined;
        },
        clearCarriedItem() {},
        getRenderableMenu() {
          return;
        },
      },
      render() {},
    },
    setInputEnabled() {},
    isInputEnabled() {
      return state.inputEnabled;
    },
    getInputMode: () => 'interactive',
    acquireInputLease() {
      return {
        ownerId: 'test',
        mode: 'advance-only',
        acquiredAt: 0,
        dispose() {},
      };
    },
    beginCompositionSession: () => ({
      id: 'test',
      ownerId: 'test',
      message: undefined,
      status: 'active' as const,
      report() {},
      fail() {},
      dispose() {},
    }),
  } as unknown as ConsoleKernel);
}

const NETHER_INTERCOM_DIALOGUE_MENU_ID = 'nether-intercom-dialogue-menu';
const NETHER_INTERCOM_PLAYER_TTL_MS = 4800;
const NETHER_INTERCOM_REPLY_TTL_MS = 5200;
const NETHER_INTERCOM_THOUGHT_TTL_MS = 4800;

interface NetherIntercomChoice {
  id: string;
  playerLine: string | readonly string[];
  npcLine?: string | readonly string[];
  thoughtLine?: string | readonly string[];
  nextStage?: string;
  triggersDefeat?: boolean;
}

function createEmergencyIntercomChoices(): readonly NetherIntercomChoice[] {
  const intercom = spanishNetherText.intercom;
  return [
    {
      id: 'what-happened',
      playerLine: intercom.secondChoices.whatHappened,
      npcLine: intercom.secondReplyLines,
      thoughtLine: intercom.secondReplyThoughtLines,
      nextStage: 'after-reveal',
    },
    {
      id: 'what-emergency',
      playerLine: intercom.secondChoices.whatEmergency,
      npcLine: intercom.secondReplyLines,
      thoughtLine: intercom.secondReplyThoughtLines,
      nextStage: 'after-reveal',
    },
  ];
}

function createRevealIntercomChoices(): readonly NetherIntercomChoice[] {
  const intercom = spanishNetherText.intercom;
  return [
    {
      id: 'what-if-not-found',
      playerLine: intercom.thirdChoices.whatIfNotFound,
      npcLine: intercom.thirdReplyLines,
      nextStage: 'final-warning',
    },
  ];
}

function runIntercomChoice(choice: NetherIntercomChoice): IntercomFixture {
  const state: IntercomEngineMockState = { inputEnabled: true, messages: [] };
  const engine = createEngineMock(state);
  const session = new RoccoDialogueSession({
    id: NETHER_INTERCOM_DIALOGUE_MENU_ID,
    engine,
    playerSpriteInstanceId: 'rocco',
    npcSpriteInstanceId: 'intercom',
    playerLineTtlMs: NETHER_INTERCOM_PLAYER_TTL_MS,
    npcLineTtlMs: NETHER_INTERCOM_REPLY_TTL_MS,
  });

  session.beginLinearSequence({
    speaker: 'player',
    lines: [choice.playerLine],
    lineTtlMs: NETHER_INTERCOM_PLAYER_TTL_MS,
    onComplete: () => {
      if (choice.triggersDefeat) {
        return;
      }

      if (choice.npcLine === undefined) {
        return;
      }

      session.beginLinearSequence({
        speaker: 'npc',
        lines: [choice.npcLine],
        lineTtlMs: NETHER_INTERCOM_REPLY_TTL_MS,
        onComplete: () => {
          if (choice.thoughtLine === undefined) {
            return;
          }

          session.beginLinearSequence({
            speaker: 'player',
            lines: [choice.thoughtLine],
            lineTtlMs: NETHER_INTERCOM_THOUGHT_TTL_MS,
            messageKind: 'think',
            onComplete: () => {},
          });
        },
      });
    },
  });

  return { state, session };
}

function collectVisibleInOrder(fixture: IntercomFixture): string[] {
  const { state, session } = fixture;
  const seen: string[] = [];
  let guard = 0;
  while (session.isActive() && guard < 50) {
    guard += 1;
    const last = state.messages.at(-1);
    if (last !== undefined) {
      if (last.startsWith('intercom:say:')) {
        seen.push(last.slice('intercom:say:'.length));
      } else if (last.startsWith('rocco:think:')) {
        seen.push(last.slice('rocco:think:'.length));
      }
    }
    session.advance();
  }
  return seen;
}

describe('Nether intercom multi-line dialogue regression', () => {
  it('plays all secondReplyLines then both secondReplyThoughtLines in order', () => {
    const choice = createEmergencyIntercomChoices()[0];
    const fixture = runIntercomChoice(choice);

    const intercom = spanishNetherText.intercom;
    const expected: string[] = [...intercom.secondReplyLines, ...intercom.secondReplyThoughtLines];

    const seen = collectVisibleInOrder(fixture);

    expect(seen).toEqual(expected);
    expect(seen).toHaveLength(
      intercom.secondReplyLines.length + intercom.secondReplyThoughtLines.length,
    );
  });

  it('does not advance the turn past the final reply line until consumed', () => {
    const choice = createEmergencyIntercomChoices()[1];
    const fixture = runIntercomChoice(choice);
    const { state, session } = fixture;
    const intercom = spanishNetherText.intercom;

    const npcLines = intercom.secondReplyLines;
    session.advance();
    for (let index = 0; index < npcLines.length; index += 1) {
      expect(state.messages.at(-1)).toContain(npcLines[index]);
      expect(state.messages.at(-1)).not.toContain(':think:');
      if (index < npcLines.length - 1) {
        session.advance();
      }
    }

    expect(state.messages.at(-1)).toContain(npcLines.at(-1));
    expect(state.messages.at(-1)).not.toContain(':think:');

    session.advance();
    expect(state.messages.at(-1)).toContain(intercom.secondReplyThoughtLines[0]);

    while (session.isActive()) {
      session.advance();
    }

    expect(state.messages.at(-1)).toContain(intercom.secondReplyThoughtLines.at(-1));
  });

  it('plays all thirdReplyLines in order without skipping', () => {
    const choice = createRevealIntercomChoices()[0];
    const fixture = runIntercomChoice(choice);

    const intercom = spanishNetherText.intercom;
    const seen = collectVisibleInOrder(fixture);

    expect(seen).toEqual(intercom.thirdReplyLines);
  });
});
