export function wrapValue(value: number, size: number): number {
  if (size <= 0 || !Number.isFinite(size)) {
    return value;
  }
  return ((value % size) + size) % size;
}
