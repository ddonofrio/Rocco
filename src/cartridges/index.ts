import type { RoccoCartridgeRegistration } from '../engine/cartridges';
import { roccoDefaultCartridgeManifest } from './rocco/rocco-default-manifest';
import { RoccoDefaultCartridge } from './rocco/rocco-default-cartridge';
import { terminalWorkInProgressCartridgeManifest } from './terminal/terminal-work-in-progress-manifest';
import { RoccoTerminalWorkInProgressCartridge } from './terminal/terminal-work-in-progress-cartridge';

export interface RoccoBuiltinCartridgeConfig extends RoccoCartridgeRegistration {
  preferredLocaleStorageKey?: string;
  defaultLocale?: string;
}

interface RoccoLocalCartridgeModule {
  localCartridgeConfigs?: readonly RoccoCartridgeRegistration[];
}

export const defaultBuiltinCartridgeId = roccoDefaultCartridgeManifest.id;

const baseBuiltinCartridgeConfigs: RoccoBuiltinCartridgeConfig[] = [
  {
    manifest: roccoDefaultCartridgeManifest,
    createCartridge: () => new RoccoDefaultCartridge(),
    preferredLocaleStorageKey: 'rocco.default.locale',
    defaultLocale: 'en',
  },
  {
    manifest: terminalWorkInProgressCartridgeManifest,
    createCartridge: () => new RoccoTerminalWorkInProgressCartridge(),
  },
];

const localCartridgeModules = import.meta.glob<RoccoLocalCartridgeModule>(
  './local/**/*.local-cartridge.ts',
  { eager: true },
);

const localBuiltinCartridgeConfigs = Object.values(localCartridgeModules).flatMap(
  (module) => module.localCartridgeConfigs ?? [],
);

export const builtinCartridgeConfigs: RoccoBuiltinCartridgeConfig[] = [
  ...baseBuiltinCartridgeConfigs,
  ...localBuiltinCartridgeConfigs,
];
