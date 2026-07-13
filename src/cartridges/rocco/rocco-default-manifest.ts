import type { RoccoCartridgeManifest } from '../../console/cartridges/types';
import { CONSOLE_SUPPORTED_CAPABILITIES } from '../../console/cartridges/sdk-v1';
import { roccoSpanishText } from './localization';

export const roccoDefaultCartridgeManifest: RoccoCartridgeManifest = {
  id: 'rocco-default',
  title: 'ROCCO',
  version: '0.1.0',
  description: 'A 90s-style adventure',
  author: 'Rocco Studio',
  publisher: "Diego D'Onofrio",
  releaseYear: 2026,
  genre: 'Adventure',
  players: '1',
  tags: ['builtin', 'default', 'demo', 'rocco'],
  localizations: {
    es: roccoSpanishText.manifest,
  },
  runtime: {
    sdk: '^1.0.0',
    capabilities: CONSOLE_SUPPORTED_CAPABILITIES,
  },
};
