import { describe, expect, it } from 'vitest';

import { resolveRoccoPlayerAppearanceAssetUrls } from '../../../src/cartridges/rocco/games/rocco-default/player';

describe('resolveRoccoPlayerAppearanceAssetUrls', () => {
  it('returns the default rocco assets for the default appearance', () => {
    const urls = resolveRoccoPlayerAppearanceAssetUrls('default');

    expect(urls.runLeft[0]).toContain('player/assets/default/run-left-1.png');
    expect(urls.standing.down).toContain('player/assets/default/stand-down.png');
    expect(urls.runLeft[0]).not.toContain('lab-coat');
    expect(urls.pickUp).toContain('pick-up.png');
  });

  it('falls back to the default assets when no appearance is provided', () => {
    const urls = resolveRoccoPlayerAppearanceAssetUrls();

    expect(urls.runLeft[0]).toContain('player/assets/default/run-left-1.png');
    expect(urls.standing.down).toContain('player/assets/default/stand-down.png');
    expect(urls.pickUp).toContain('pick-up.png');
  });

  it('returns the lab-coat assets for the lab-coat appearance and reuses the shared pick-up asset', () => {
    const urls = resolveRoccoPlayerAppearanceAssetUrls('lab-coat');

    expect(urls.runLeft[0]).toContain('lab-coat/run-left-1.png');
    expect(urls.runRight[0]).toContain('lab-coat/run-right-1.png');
    expect(urls.standing.down).toContain('lab-coat/stand-down.png');
    expect(urls.pickUp).toContain('pick-up.png');
  });
});
