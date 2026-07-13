import type { RoccoPoint } from '../../../../console/video/sprites';
import type { RoccoInventoryItem } from '../../inventory';
import type { RoccoPlayerAppearance } from '../../rocco-player-appearance';
import type { RoccoLevel } from '../rocco-level-types';

/**
 * Optional capabilities of the bait shop toilet level, declared separately from
 * the base level type so `RoccoLevel` / `RpceLevel` stay generic (audit DOM-002).
 * The manager and dropped-inventory controller detect these via
 * {@link isRoccoToiletLevelCapability} instead of `instanceof` or casts.
 */
export interface RoccoToiletLevelCapability {
  isEscapeUrgencyActive(): boolean;
  startThrowCoralRelicSequence(
    relicItem: RoccoInventoryItem,
    onComplete: (groundPoint: RoccoPoint) => void,
  ): void;
  openCoralRelicWishMenu(groundPoint: RoccoPoint, consumeRelic: () => void): void;
  refreshDeveloperEventPresentation(): void;
  shouldLoseOnExit(connectorId: string): boolean;
  beginExitDefeat(): void;
}

export function isRoccoToiletLevelCapability(
  level: RoccoLevel,
): level is RoccoLevel & RoccoToiletLevelCapability {
  return (
    typeof (level as Partial<RoccoToiletLevelCapability>).isEscapeUrgencyActive === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).startThrowCoralRelicSequence === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).openCoralRelicWishMenu === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).refreshDeveloperEventPresentation === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).shouldLoseOnExit === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).beginExitDefeat === 'function'
  );
}

/**
 * Optional capability for a level that keeps its player appearance in sync at
 * runtime. Replaces the manager's cast that mutated `activeLevel.options`.
 */
export interface RoccoAppearanceCapability {
  applyRoccoAppearance(appearance: RoccoPlayerAppearance): void;
}

export function isRoccoAppearanceCapability(
  level: RoccoLevel,
): level is RoccoLevel & RoccoAppearanceCapability {
  return typeof (level as Partial<RoccoAppearanceCapability>).applyRoccoAppearance === 'function';
}
