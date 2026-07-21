import { describe, expect, it } from 'vitest';

import type { ConsoleKernel } from '../../../../src/console/console-kernel';
import { asRoccoTestSdk } from '../test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import { RoccoDialogueSession } from '../../../../src/cartridges/rocco/rpce/dialogue/runtime';
import { ROCCO_PLAYER_CONFIG } from '../../../../src/cartridges/rocco/games/rocco-default/player';
import { spanishNetherText } from '../../../../src/cartridges/rocco/localization/es/nether';

const NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-security-camera-instance';
const NETHER_SECURITY_CAMERA_BRIBE_DIALOGUE_ID = 'rocco-nether-security-camera-bribe-dialogue';
const NETHER_SECURITY_CAMERA_BRIBE_CAMERA_TTL_MS = 3000;
const NETHER_SECURITY_CAMERA_BRIBE_PLAYER_TTL_MS = 3600;
const NETHER_SECURITY_ALERT_MESSAGE_OFFSET = { x: -20, y: 0 } as const;
const NETHER_SECURITY_ALERT_MESSAGE_MAX_WIDTH = 220;
const NETHER_SECURITY_SPEECH_STYLE = {
  fill: '#1b4ea1',
  bubbleFill: '#e6eefb',
  bubbleStroke: '#1b4ea1',
  bubbleStrokeWidth: 2,
} as const;

interface NetherBribeEngineState {
  messages: string[];
}

function serializeMessageText(text: unknown): string {
  return Array.isArray(text) ? text.join('|') : String(text);
}

function createEngineMock(state: NetherBribeEngineState): CartridgeSdkV1Runtime {
  const kernel: ConsoleKernel = {
    video: {
      messages: {
        showMessage(message: { spriteInstanceId: string; mode: string; text: unknown }) {
          state.messages.push(
            `${message.spriteInstanceId}:${message.mode}:${serializeMessageText(message.text)}`,
          );
        },
        say(spriteInstanceId: string, text: unknown, _options?: unknown) {
          state.messages.push(`${spriteInstanceId}:say:${serializeMessageText(text)}`);
        },
        think(spriteInstanceId: string, text: unknown, _options?: unknown) {
          state.messages.push(`${spriteInstanceId}:think:${serializeMessageText(text)}`);
        },
        removeMessage() {},
        clearMessages() {
          state.messages.length = 0;
        },
        listMessages() {
          return [];
        },
        listRenderableMessages() {
          return [];
        },
        update() {},
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
          return;
        },
        clearCarriedItem() {},
        getRenderableMenu() {
          return;
        },
      },
    },
    setInputEnabled() {},
    isInputEnabled() {
      return true;
    },
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
  } as unknown as ConsoleKernel;

  return asRoccoTestSdk(kernel);
}

function runBribeSequence(advanceMode: 'manual' | 'auto'): NetherBribeEngineState {
  const state: NetherBribeEngineState = { messages: [] };
  const engine = createEngineMock(state);
  const session = new RoccoDialogueSession({
    id: NETHER_SECURITY_CAMERA_BRIBE_DIALOGUE_ID,
    engine,
    playerSpriteInstanceId: ROCCO_PLAYER_CONFIG.ids.instance,
    npcSpriteInstanceId: NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
    playerLineTtlMs: NETHER_SECURITY_CAMERA_BRIBE_PLAYER_TTL_MS,
    npcLineTtlMs: NETHER_SECURITY_CAMERA_BRIBE_CAMERA_TTL_MS,
  });

  const text = spanishNetherText.securityCameraBribe;
  session.beginLinearSequence({
    speaker: 'npc',
    lines: [text.thanksLine, text.securityLine],
    lineTtlMs: NETHER_SECURITY_CAMERA_BRIBE_CAMERA_TTL_MS,
    messageOptions: {
      side: 'left',
      offset: NETHER_SECURITY_ALERT_MESSAGE_OFFSET,
      maxWidth: NETHER_SECURITY_ALERT_MESSAGE_MAX_WIDTH,
      style: NETHER_SECURITY_SPEECH_STYLE,
    },
    onComplete: () => {
      session.beginLinearSequence({
        speaker: 'player',
        lines: [text.roccoReactionLine],
        lineTtlMs: NETHER_SECURITY_CAMERA_BRIBE_PLAYER_TTL_MS,
        onComplete: () => {},
      });
    },
  });

  if (advanceMode === 'manual') {
    let guard = 0;
    while (session.isActive() && guard < 20) {
      guard += 1;
      session.advance();
    }
  } else {
    let elapsed = 0;
    while (session.isActive() && elapsed < 10_000) {
      elapsed += 100;
      session.update(100);
    }
  }

  return state;
}

interface VisibleLine {
  speakerId: string;
  mode: string;
  text: string;
}

function collectVisibleLines(state: NetherBribeEngineState): VisibleLine[] {
  return state.messages
    .filter((entry) => entry.includes(':say:'))
    .map((entry) => {
      const [speakerId, mode, text] = entry.split(':');
      return { speakerId, mode, text };
    });
}

describe('Nether security camera bribe dialogue sequence', () => {
  it('plays the exact order Gracias, Seguridad then Rocco reacts by speaking', () => {
    const state = runBribeSequence('manual');
    const lines = collectVisibleLines(state);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({
      speakerId: NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      mode: 'say',
      text: spanishNetherText.securityCameraBribe.thanksLine,
    });
    expect(lines[1]).toEqual({
      speakerId: NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      mode: 'say',
      text: spanishNetherText.securityCameraBribe.securityLine,
    });
    expect(lines[2]).toEqual({
      speakerId: ROCCO_PLAYER_CONFIG.ids.instance,
      mode: 'say',
      text: spanishNetherText.securityCameraBribe.roccoReactionLine,
    });
  });

  it('does not repeat Seguridad', () => {
    const state = runBribeSequence('manual');
    const securityCount = collectVisibleLines(state).filter(
      (line) => line.text === spanishNetherText.securityCameraBribe.securityLine,
    ).length;
    expect(securityCount).toBe(1);
  });

  it('advances automatically through TTL in the same order', () => {
    const state = runBribeSequence('auto');
    const lines = collectVisibleLines(state);

    expect(lines).toHaveLength(3);
    expect(lines.map((line) => line.text)).toEqual([
      spanishNetherText.securityCameraBribe.thanksLine,
      spanishNetherText.securityCameraBribe.securityLine,
      spanishNetherText.securityCameraBribe.roccoReactionLine,
    ]);
    expect(lines[2].speakerId).toBe(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(lines[2].mode).toBe('say');
  });
});
