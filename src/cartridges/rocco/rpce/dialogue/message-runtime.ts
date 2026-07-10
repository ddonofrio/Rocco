import type { RoccoEngine } from '../../../../console/engine-sdk';
import type {
  RoccoSpriteMessageOptions,
  RoccoSpriteMessageRequest,
  RoccoSpriteMessageText,
} from '../../../../console/video/messages';
import {
  selectNonRepeatingLines,
  type RoccoNonRepeatingLineSelectionState,
} from './line-selection';

export interface RoccoCartridgeMessageLineSelection {
  count: number;
  historyKey?: string;
  avoidImmediateRepeat?: boolean;
  random?: () => number;
}

export class RoccoCartridgeMessageRuntime {
  private readonly selectionStateByHistoryKey = new Map<
    string,
    RoccoNonRepeatingLineSelectionState
  >();

  showMessage(
    engine: RoccoEngine,
    message: RoccoSpriteMessageRequest,
    selection?: RoccoCartridgeMessageLineSelection,
  ): void {
    engine.video.messages.showMessage({
      ...message,
      text: this.resolveText(message.text, message, selection),
    });
  }

  say(
    engine: RoccoEngine,
    spriteInstanceId: string,
    text: RoccoSpriteMessageText,
    options?: RoccoSpriteMessageOptions,
    selection?: RoccoCartridgeMessageLineSelection,
  ): void {
    this.showMessage(
      engine,
      {
        ...options,
        spriteInstanceId,
        mode: 'say',
        text,
      },
      selection,
    );
  }

  think(
    engine: RoccoEngine,
    spriteInstanceId: string,
    text: RoccoSpriteMessageText,
    options?: RoccoSpriteMessageOptions,
    selection?: RoccoCartridgeMessageLineSelection,
  ): void {
    this.showMessage(
      engine,
      {
        ...options,
        spriteInstanceId,
        mode: 'think',
        text,
      },
      selection,
    );
  }

  selectLines(
    lines: readonly string[],
    historyKey: string,
    selection: Omit<RoccoCartridgeMessageLineSelection, 'historyKey'>,
  ): string[] {
    const normalizedLines = normalizeLines([...lines]);
    if (normalizedLines.length <= 1) {
      return normalizedLines;
    }

    const selectionResult = selectNonRepeatingLines({
      lines: normalizedLines,
      count: selection.count,
      random: selection.random,
      state: this.selectionStateByHistoryKey.get(historyKey),
      avoidImmediateRepeat: selection.avoidImmediateRepeat,
    });
    this.selectionStateByHistoryKey.set(historyKey, selectionResult.state);
    return selectionResult.lines.length > 0 ? selectionResult.lines : normalizedLines;
  }

  private resolveText(
    text: RoccoSpriteMessageText,
    message: Pick<RoccoSpriteMessageRequest, 'spriteInstanceId' | 'mode'>,
    selection?: RoccoCartridgeMessageLineSelection,
  ): RoccoSpriteMessageText {
    if (!selection) {
      return text;
    }

    const lines = normalizeLines(text);
    if (lines.length <= 1) {
      return lines;
    }

    const historyKey =
      selection.historyKey ?? `${message.spriteInstanceId}:${message.mode}:${lines.join('\u001e')}`;
    const selected = this.selectLines(lines, historyKey, selection);
    return selected.length === 1 ? selected[0] ?? '' : selected;
  }
}

export const roccoCartridgeMessageRuntime = new RoccoCartridgeMessageRuntime();

function normalizeLines(text: RoccoSpriteMessageText): string[] {
  const values = Array.isArray(text) ? text : [text];
  return values.map((line) => line.trim()).filter((line) => line.length > 0);
}
