export interface RoccoNonRepeatingLineSelectionState {
  signature: string;
  remainingIndexes: number[];
  lastSelectedIndex?: number;
}

export interface RoccoNonRepeatingLineSelectionResult {
  lines: string[];
  indexes: number[];
  state: RoccoNonRepeatingLineSelectionState;
}

export interface RoccoNonRepeatingLineSelectionOptions {
  lines: readonly string[];
  count: number;
  random?: () => number;
  state?: RoccoNonRepeatingLineSelectionState;
  avoidImmediateRepeat?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createSignature(lines: readonly string[]): string {
  return lines.map((line, index) => `${index}:${line}`).join('\u{1F}');
}

function normalizeIndexes(indexes: readonly number[], maxExclusive: number): number[] {
  const seen = new Set<number>();
  const normalized: number[] = [];

  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 0 || index >= maxExclusive || seen.has(index)) {
      continue;
    }

    seen.add(index);
    normalized.push(index);
  }

  return normalized;
}

function refillIndexes(
  totalCount: number,
  usedIndexes: readonly number[],
  lastSelectedIndex: number | undefined,
  avoidImmediateRepeat: boolean,
): number[] {
  let indexes = Array.from({ length: totalCount }, (_, index) => index).filter(
    (index) => !usedIndexes.includes(index),
  );

  if (avoidImmediateRepeat && lastSelectedIndex !== undefined && indexes.length > 1) {
    const filtered = indexes.filter((index) => index !== lastSelectedIndex);
    if (filtered.length > 0) {
      indexes = filtered;
    }
  }

  return indexes;
}

export function selectNonRepeatingLines(
  options: RoccoNonRepeatingLineSelectionOptions,
): RoccoNonRepeatingLineSelectionResult {
  const totalCount = options.lines.length;
  const safeCount = Number.isFinite(options.count) ? Math.floor(options.count) : 1;
  const requestedCount = clamp(safeCount, 1, Math.max(1, totalCount));
  const signature = createSignature(options.lines);
  const priorState = options.state?.signature === signature ? options.state : undefined;
  let remainingIndexes = normalizeIndexes(priorState?.remainingIndexes ?? [], totalCount);
  const priorLastSelectedIndex =
    priorState?.lastSelectedIndex !== undefined &&
    priorState.lastSelectedIndex >= 0 &&
    priorState.lastSelectedIndex < totalCount
      ? priorState.lastSelectedIndex
      : undefined;
  const pickedIndexes: number[] = [];
  const random = options.random ?? Math.random;
  const isAvoidImmediateRepeat = options.avoidImmediateRepeat ?? true;

  while (pickedIndexes.length < requestedCount && totalCount > 0) {
    if (remainingIndexes.length === 0) {
      remainingIndexes = refillIndexes(
        totalCount,
        pickedIndexes,
        pickedIndexes.length > 0
          ? pickedIndexes.at(-1)
          : priorLastSelectedIndex,
        isAvoidImmediateRepeat && pickedIndexes.length === 0,
      );
      if (remainingIndexes.length === 0) {
        break;
      }
    }

    const poolIndex = Math.floor(random() * remainingIndexes.length);
    const [pickedIndex] = remainingIndexes.splice(poolIndex, 1);
    if (pickedIndex === undefined) {
      break;
    }

    pickedIndexes.push(pickedIndex);
  }

  const lastSelectedIndex = pickedIndexes.at(-1) ?? priorLastSelectedIndex;

  return {
    lines: pickedIndexes.map((index) => options.lines[index] ?? ''),
    indexes: pickedIndexes,
    state: {
      signature,
      remainingIndexes,
      lastSelectedIndex,
    },
  };
}
