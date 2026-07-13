# Console

This directory is the implementation tree for the ROCCO host runtime.

The console owns rendering, audio, input, effects, persistence, cartridge lifecycle, and the
console SDK surface exposed to cartridges.

`src/console/**` is the source of truth for console code and console documentation. The runtime
type exposed to cartridges still keeps the historical name `RoccoEngine`, but it is the
console-facing SDK surface.

The runtime lifecycle and resource ownership live in `src/console/lifecycle`
(see `src/console/lifecycle/README.md`). `GameRuntime` runs through the explicit
`new → initializing → ready → … → disposing → disposed` state machine and tears
down every subsystem through a hierarchical `ResourceScope` rooted at the
runtime scope with a `cartridge` child.
