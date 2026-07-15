import type {
  RoccoCartridge,
  RoccoCartridgeManifest,
  RoccoCartridgeProvider,
  RoccoCartridgeRegistration,
} from '../types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class RoccoBuiltinCartridgeProvider implements RoccoCartridgeProvider {
  private readonly registrations = new Map<string, RoccoCartridgeRegistration>();

  constructor(registrations: RoccoCartridgeRegistration[]) {
    for (const registration of registrations) {
      this.register(registration);
    }
  }

  private register(registration: RoccoCartridgeRegistration): void {
    const id = registration.manifest.id;
    if (this.registrations.has(id)) {
      throw new Error(`Duplicate cartridge registration '${id}'.`);
    }
    this.registrations.set(id, registration);
  }

  list(): Promise<RoccoCartridgeManifest[]> {
    return Promise.resolve(
      // `Array.from` would trip unicorn/prefer-spread; the Iterator helper
      // form needs the ES2024 lib which this project does not target.
      // eslint-disable-next-line unicorn/prefer-iterator-to-array
      [...this.registrations.values()].map((registration) => clone(registration.manifest)),
    );
  }

  load(id: string): Promise<RoccoCartridge | undefined> {
    return Promise.resolve(this.registrations.get(id)?.createCartridge());
  }
}
