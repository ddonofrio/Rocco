export interface RoccoKeyLockedDoorLineOptions {
  hasMatchingKey: boolean;
  withKeyLines: readonly string[];
  withoutKeyLines: readonly string[];
}

export function resolveKeyLockedDoorLines(
  options: RoccoKeyLockedDoorLineOptions,
): readonly string[] {
  return options.hasMatchingKey ? options.withKeyLines : options.withoutKeyLines;
}
