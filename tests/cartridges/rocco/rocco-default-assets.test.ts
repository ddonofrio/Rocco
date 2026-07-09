import { describe, expect, it } from 'vitest';

import {
  roccoDefaultPickUpAssetUrl,
  resolveRoccoPlayerAppearanceAssetUrls,
} from '../../../src/cartridges/rocco/rocco-default-assets';

describe('resolveRoccoPlayerAppearanceAssetUrls', () => {
  it('returns the default rocco assets for the default appearance', () => {
    const urls = resolveRoccoPlayerAppearanceAssetUrls('default');

    expect(urls.runLeft[0]).toContain('characters/rocco/run-left-1.png');
    expect(urls.standing.down).toContain('characters/rocco/stand-down.png');
    expect(urls.runLeft[0]).not.toContain('lab-coat');
    expect(urls.pickUp).toBe(roccoDefaultPickUpAssetUrl);
  });

  it('falls back to the default assets when no appearance is provided', () => {
    const urls = resolveRoccoPlayerAppearanceAssetUrls();

    expect(urls.runLeft[0]).toContain('characters/rocco/run-left-1.png');
    expect(urls.standing.down).toContain('characters/rocco/stand-down.png');
    expect(urls.pickUp).toBe(roccoDefaultPickUpAssetUrl);
  });

  it('returns the lab-coat assets for the lab-coat appearance and reuses the shared pick-up asset', () => {
    const urls = resolveRoccoPlayerAppearanceAssetUrls('lab-coat');

    expect(urls.runLeft[0]).toContain('lab-coat/run-left-1.png');
    expect(urls.runRight[0]).toContain('lab-coat/run-right-1.png');
    expect(urls.standing.down).toContain('lab-coat/stand-down.png');
    expect(urls.pickUp).toBe(roccoDefaultPickUpAssetUrl);
  });
});
