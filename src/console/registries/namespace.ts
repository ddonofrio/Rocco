const QUALIFIED_ID_PATTERN = /^[^:]+:[^:]+:[^:]+$/;

export interface QualifiedId {
  readonly cartridgeId: string;
  readonly resourceType: string;
  readonly localId: string;
}

export function qualifyId(cartridgeId: string, resourceType: string, localId: string): string {
  if (!cartridgeId || cartridgeId.includes(':')) {
    throw new Error(`Invalid cartridgeId '${cartridgeId}': must be non-empty and contain no colons.`);
  }
  if (!resourceType || resourceType.includes(':')) {
    throw new Error(`Invalid resourceType '${resourceType}': must be non-empty and contain no colons.`);
  }
  if (!localId || localId.includes(':')) {
    throw new Error(`Invalid localId '${localId}': must be non-empty and contain no colons.`);
  }

  return `${cartridgeId}:${resourceType}:${localId}`;
}

export function parseQualifiedId(qualifiedId: string): QualifiedId {
  if (!QUALIFIED_ID_PATTERN.test(qualifiedId)) {
    throw new Error(
      `Invalid qualified id '${qualifiedId}'. Expected format '<cartridgeId>:<resourceType>:<localId>'.`,
    );
  }

  const [cartridgeId, resourceType, localId] = qualifiedId.split(':');
  return { cartridgeId, resourceType, localId };
}

export function validateQualifiedId(qualifiedId: string): void {
  if (!QUALIFIED_ID_PATTERN.test(qualifiedId)) {
    throw new Error(
      `Invalid qualified id '${qualifiedId}'. Expected format '<cartridgeId>:<resourceType>:<localId>'.`,
    );
  }
}
