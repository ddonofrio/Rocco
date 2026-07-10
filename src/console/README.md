# Console

This directory is the implementation tree for the ROCCO host runtime.

The console owns rendering, audio, input, effects, persistence, cartridge lifecycle, and the
console SDK surface exposed to cartridges.

`src/console/**` is the source of truth for console code and console documentation. The runtime
type exposed to cartridges still keeps the historical name `RoccoEngine`, but it is the
console-facing SDK surface.
