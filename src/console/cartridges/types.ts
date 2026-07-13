import type { RoccoConsoleFlags, RoccoEngine } from '../engine-sdk';
import type { RoccoActionMenuActivation } from '../video/action-menu';
import type { RoccoGridMenuActivation } from '../video/grid-menu';

export interface RoccoSceneClickAction {
  kind: 'scene-click';
  sceneX: number;
  sceneY: number;
  targetInstanceId?: string;
  targetDefinitionId?: string;
}

export type RoccoCartridgeAction =
  | RoccoActionMenuActivation
  | RoccoSceneClickAction
  | RoccoGridMenuActivation;

export interface CartridgeActionContext {
  readonly signal: AbortSignal;
  readonly actionId: string;
  readonly correlationId: string;
  readonly cartridgeId: string;
  readonly levelId: string | null;
}

/**
 * Synchronous decision returned by a cartridge for a single user action.
 *
 * The movement decision is resolved synchronously so the current frame never
 * depends on an `await`. Any asynchronous follow-up work belongs in `completion`,
 * which the dispatcher monitors, captures errors for, and cancels on unmount.
 */
export interface CartridgeActionDisposition {
  consumed: boolean;
  defaultPlayerMovement: 'allow' | 'suppress';
  completion?: Promise<void>;
}

/**
 * @deprecated Internal-only helper. Cartridges must return a
 * `CartridgeActionDisposition` from `handleAction`. Retained for the router and
 * inventory controllers that still normalise to a disposition internally.
 */
export interface RoccoCartridgeActionResult {
  suppressDefaultPlayerMove?: boolean;
}

export interface RoccoCartridgeManifest {
  id: string;
  title: string;
  version: string;
  description?: string;
  author?: string;
  publisher?: string;
  releaseYear?: number;
  genre?: string;
  players?: string;
  engineVersion?: string;
  tags?: string[];
  localizations?: Record<string, RoccoCartridgeLocalizedManifest>;
}

export type RoccoCartridgeLocalizedManifest = Partial<
  Pick<
    RoccoCartridgeManifest,
    'title' | 'description' | 'author' | 'publisher' | 'genre' | 'players' | 'tags'
  >
>;

export interface RoccoCartridgeContext {
  engine: RoccoEngine;
  locale?: string;
}

export interface RoccoCartridgeSetupConsole {
  getFlags(): RoccoConsoleFlags;
  setFlags(patch: Partial<RoccoConsoleFlags>): void;
}

export interface RoccoCartridgeBootSetting {
  id: string;
  label: string;
  description: string;
  statusLabel?: string;
  detailLabel?: string;
  getValueLabel(): string;
  activate?(): Promise<void> | void;
}

export interface RoccoCartridgeSetupContext {
  console: RoccoCartridgeSetupConsole;
}

export interface RoccoCartridgeSetupResult {
  consoleFlags?: Partial<RoccoConsoleFlags>;
  bootSettings?: readonly RoccoCartridgeBootSetting[];
}

export interface RoccoCartridge {
  manifest: RoccoCartridgeManifest;
  setup?(context: RoccoCartridgeSetupContext): Promise<RoccoCartridgeSetupResult | void> | RoccoCartridgeSetupResult | void;
  mount(context: RoccoCartridgeContext): Promise<void> | void;
  start?(): Promise<void> | void;
  update?(deltaMs: number): void;
  handleAction?(
    action: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): CartridgeActionDisposition | void;
  getActiveLevelId?(): string | null;
  stop?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}

export interface RoccoCartridgeRegistration {
  manifest: RoccoCartridgeManifest;
  createCartridge(): RoccoCartridge;
}

export interface RoccoCartridgeProvider {
  list(): Promise<RoccoCartridgeManifest[]>;
  load(id: string): Promise<RoccoCartridge | undefined>;
}

export interface RoccoCartridgeLoader {
  registerProvider(provider: RoccoCartridgeProvider): void;
  loadDefault(): Promise<RoccoCartridge>;
  loadById(id: string): Promise<RoccoCartridge | undefined>;
}
