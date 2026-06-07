import { describe, expect, it } from 'vitest';

import { executeVerb, isVerb } from './verbs';

describe('verbs', () => {
  it('recognizes supported verbs', () => {
    expect(isVerb('look')).toBe(true);
    expect(isVerb('fly')).toBe(false);
  });

  it('executes default interaction text', () => {
    expect(executeVerb('use', 'lever')).toContain('lever');
  });
});
