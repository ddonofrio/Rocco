export interface RoccoVideoRenderer {
  mount(): void;
  unmount(): void;
  render(delta: number): void;
}

