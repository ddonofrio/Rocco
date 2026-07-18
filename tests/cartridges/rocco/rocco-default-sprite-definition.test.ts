import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from '../../../src/cartridges/rocco/localization';
import { DEFAULT_SPRITE_DEFINITION_ID } from '../../../src/cartridges/rocco/rocco-default-constants';
import { createDefaultSpriteDefinition } from '../../../src/cartridges/rocco/rocco-default-sprite-definition';

describe('createDefaultSpriteDefinition appearance', () => {
  it('builds the default rocco player sprite by default', () => {
    const definition = createDefaultSpriteDefinition(createRoccoLocalization('en'));

    expect(definition.id).toBe(DEFAULT_SPRITE_DEFINITION_ID);
    expect(definition.name).toBe('Rocco Player Sprite');
    expect(definition.metadata?.appearance).toBe('default');
    expect(definition.images.find((image) => image.id === 'rocco-stand-down')?.uri).toContain(
      'characters/rocco/stand-down.png',
    );
  });

  it('builds a lab-coat rocco player sprite when requested', () => {
    const definition = createDefaultSpriteDefinition(createRoccoLocalization('en'), {
      appearance: 'lab-coat',
    });

    expect(definition.name).toBe('Rocco Player Sprite (Lab Coat)');
    expect(definition.metadata?.appearance).toBe('lab-coat');
    expect(definition.images.find((image) => image.id === 'rocco-stand-down')?.uri).toContain(
      'characters/rocco/lab-coat/stand-down.png',
    );
    expect(definition.images.find((image) => image.id === 'rocco-run-left-1')?.uri).toContain(
      'characters/rocco/lab-coat/run-left-1.png',
    );
  });
});
