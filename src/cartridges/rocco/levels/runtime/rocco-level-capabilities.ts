import type { RoccoPoint } from '../../../../console/video/sprites';
import type { RoccoInventoryItem } from '../../inventory';
import type { RoccoPlayerAppearance } from '../../games/rocco-default/player';
import type { RoccoLevel } from '../rocco-level-types';

/**
 * Optional capabilities of the bait shop toilet level, declared separately from
 * the base level type so `RoccoLevel` / `RpceLevel` stay generic.
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
    typeof (level as Partial<RoccoToiletLevelCapability>).startThrowCoralRelicSequence ===
      'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).openCoralRelicWishMenu === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).refreshDeveloperEventPresentation ===
      'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).shouldLoseOnExit === 'function' &&
    typeof (level as Partial<RoccoToiletLevelCapability>).beginExitDefeat === 'function'
  );
}

/**
 * Optional capability for a level that keeps its player appearance in sync at
 * runtime.
 */
export interface RoccoAppearanceCapability {
  applyRoccoAppearance(appearance: RoccoPlayerAppearance): void;
}

export function isRoccoAppearanceCapability(
  level: RoccoLevel,
): level is RoccoLevel & RoccoAppearanceCapability {
  return typeof (level as Partial<RoccoAppearanceCapability>).applyRoccoAppearance === 'function';
}

/**
 * Optional capability of Nether 1, declared separately from the base level type
 * so the interaction registry and the registration router do not import the
 * internal security-camera scene target ids. The camera bribe rule detects this
 * capability via {@link isRoccoNetherSecurityCameraCapability} instead of casts.
 */
export interface RoccoNetherSecurityCameraCapability {
  isSecurityCameraTarget(targetInstanceId: string | undefined): boolean;
  beginSecurityCameraBribeSequence(): boolean;
}

export function isRoccoNetherSecurityCameraCapability(
  level: RoccoLevel,
): level is RoccoLevel & RoccoNetherSecurityCameraCapability {
  return (
    typeof (level as Partial<RoccoNetherSecurityCameraCapability>).isSecurityCameraTarget ===
      'function' &&
    typeof (level as Partial<RoccoNetherSecurityCameraCapability>)
      .beginSecurityCameraBribeSequence === 'function'
  );
}

export interface RoccoNetherOfficeArrivalCapability {
  beginNetherOfficeBellArrival(): void;
}

export function isRoccoNetherOfficeArrivalCapability(
  level: RoccoLevel,
): level is RoccoLevel & RoccoNetherOfficeArrivalCapability {
  return (
    typeof (level as Partial<RoccoNetherOfficeArrivalCapability>).beginNetherOfficeBellArrival ===
    'function'
  );
}
