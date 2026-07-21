import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from '../../../src/cartridges/rocco/localization';
import {
  createRoccoPlayerSpriteDefinition,
  ROCCO_PLAYER_CONFIG,
} from '../../../src/cartridges/rocco/games/rocco-default/player';

describe('createRoccoPlayerSpriteDefinition appearance', () => {
  it('builds the default rocco player sprite by default', () => {
    const definition = createRoccoPlayerSpriteDefinition(createRoccoLocalization('en'));

    expect(definition.id).toBe(ROCCO_PLAYER_CONFIG.ids.definition);
    expect(definition.metadata?.appearance).toBe('default');
    expect(definition.images.find((image) => image.id === 'rocco-stand-down')?.uri).toContain(
      'player/assets/default/stand-down.png',
    );
  });

  it('builds a lab-coat rocco player sprite when requested', () => {
    const definition = createRoccoPlayerSpriteDefinition(createRoccoLocalization('en'), {
      appearance: 'lab-coat',
    });

    expect(definition.metadata?.appearance).toBe('lab-coat');
    expect(definition.images.find((image) => image.id === 'rocco-stand-down')?.uri).toContain(
      'player/assets/lab-coat/stand-down.png',
    );
    expect(definition.images.find((image) => image.id === 'rocco-run-left-1')?.uri).toContain(
      'player/assets/lab-coat/run-left-1.png',
    );
  });
});
