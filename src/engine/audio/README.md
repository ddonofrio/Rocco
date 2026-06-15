# Audio

The audio system provides Web Audio sound registration, preloading, playback, and stopping through `engine.audio`.

## Files

- `types.ts` - Sound definition, playback options, and audio SDK types.
- `runtime-audio-system.ts` - `RoccoRuntimeAudioSystem`, which owns the audio context, buffer cache, and active sources.
- `index.ts` - Barrel export.

## Cartridge Usage

```typescript
engine.audio.registerSound({ id: 'footstep', uri: '/sounds/footstep.mp3', volume: 0.8 });
await engine.audio.preloadSound('footstep');
engine.audio.playSound('footstep');
engine.audio.stopSound('footstep');
```

## Notes

- Browser audio requires a user gesture before playback unlocks.
- The engine unlocks audio on the first pointer action in the viewport.
- Sounds are loaded and cached as `AudioBuffer`.
- Multiple simultaneous instances of the same sound are supported.
- `restart: true` stops active instances before starting the next one.
