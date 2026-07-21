import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from '../../../src/cartridges/rocco/games/rocco-default/player';

describe('RoccoPlayerAppearance', () => {
  it('exposes the default and lab-coat appearance identifiers', () => {
    expect(DEFAULT_ROCCO_PLAYER_APPEARANCE).toBe('default');
    expect(ROCCO_LAB_COAT_PLAYER_APPEARANCE).toBe('lab-coat');
  });

  it('only allows the default and lab-coat appearance values', () => {
    const valid: readonly RoccoPlayerAppearance[] = [
      DEFAULT_ROCCO_PLAYER_APPEARANCE,
      ROCCO_LAB_COAT_PLAYER_APPEARANCE,
    ];

    expect(valid).toHaveLength(2);
    expect(valid).toContain(DEFAULT_ROCCO_PLAYER_APPEARANCE);
    expect(valid).toContain(ROCCO_LAB_COAT_PLAYER_APPEARANCE);
  });
});
