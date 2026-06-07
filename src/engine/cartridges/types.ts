import type { RoccoEngine } from '../engine-api';
import type { RoccoActionMenuActivation } from '../video/action-menu';
import type { RoccoGridMenuActivation, RoccoGridMenuItemUseActivation } from '../video/grid-menu';

export type RoccoCartridgeAction =
  | RoccoActionMenuActivation
  | RoccoGridMenuActivation
  | RoccoGridMenuItemUseActivation;

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

export interface RoccoCartridge {
  manifest: RoccoCartridgeManifest;
  mount(context: RoccoCartridgeContext): Promise<void> | void;
  start?(): Promise<void> | void;
  update?(deltaMs: number): void;
  handleAction?(activation: RoccoCartridgeAction): Promise<void> | void;
  stop?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}

export interface RoccoCartridgeProvider {
  list(): Promise<RoccoCartridgeManifest[]>;
  load(id: string): Promise<RoccoCartridge | undefined>;
}

export interface RoccoCartridgeLoader {
  registerProvider(provider: RoccoCartridgeProvider): void;
  loadDefault(): Promise<RoccoCartridge>;
  loadById(id: string): Promise<RoccoCartridge | undefined>;
  boot(): Promise<RoccoCartridge>;
}
