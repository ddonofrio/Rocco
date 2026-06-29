import type { RoccoCartridgeManifest } from '../../engine/cartridges/types';
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
};
