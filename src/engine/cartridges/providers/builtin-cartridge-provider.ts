import type {
  RoccoCartridge,
  RoccoCartridgeManifest,
  RoccoCartridgeProvider,
  RoccoCartridgeRegistration,
} from '../types';

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export class RoccoBuiltinCartridgeProvider implements RoccoCartridgeProvider {
  private readonly registrations = new Map<string, RoccoCartridgeRegistration>();

  constructor(registrations: RoccoCartridgeRegistration[]) {
    for (const registration of registrations) {
      this.registrations.set(registration.manifest.id, registration);
    }
  }

  list(): Promise<RoccoCartridgeManifest[]> {
    return Promise.resolve(
      [...this.registrations.values()].map((registration) => clone(registration.manifest)),
    );
  }

  load(id: string): Promise<RoccoCartridge | undefined> {
    return Promise.resolve(this.registrations.get(id)?.createCartridge());
  }
}
