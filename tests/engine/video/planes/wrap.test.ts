import { describe, expect, it } from 'vitest';

import { wrapValue } from '../../../../src/engine/video/planes/wrap';

describe('wrapValue', () => {
  it('keeps values inside [0, size) with positive modulo', () => {
    expect(wrapValue(27, 10)).toBe(7);
    expect(wrapValue(-3, 10)).toBe(7);
    expect(wrapValue(0, 10)).toBe(0);
  });

  it('returns original value when span is invalid', () => {
    expect(wrapValue(12, 0)).toBe(12);
    expect(wrapValue(-8, -10)).toBe(-8);
  });
});
