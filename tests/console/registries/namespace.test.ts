import { describe, expect, it } from 'vitest';

import { parseQualifiedId, qualifyId, validateQualifiedId } from '../../../src/console/registries/namespace';

describe('namespace', () => {
  it('qualifies an id', () => {
    expect(qualifyId('rocco-default', 'sound', 'police-whistle')).toBe(
      'rocco-default:sound:police-whistle',
    );
  });

  it('throws on empty cartridgeId', () => {
    expect(() => qualifyId('', 'sound', 'police-whistle')).toThrow(
      "Invalid cartridgeId ''",
    );
  });

  it('throws on colon in parts', () => {
    expect(() => qualifyId('rocco:default', 'sound', 'police-whistle')).toThrow(
      "Invalid cartridgeId 'rocco:default'",
    );
  });

  it('parses a qualified id', () => {
    expect(parseQualifiedId('rocco-default:sound:police-whistle')).toEqual({
      cartridgeId: 'rocco-default',
      resourceType: 'sound',
      localId: 'police-whistle',
    });
  });

  it('throws on invalid qualified id', () => {
    expect(() => parseQualifiedId('invalid')).toThrow(
      "Invalid qualified id 'invalid'",
    );
  });

  it('validates a qualified id', () => {
    expect(() => validateQualifiedId('rocco-default:sound:police-whistle')).not.toThrow();
    expect(() => validateQualifiedId('invalid')).toThrow();
  });
});
