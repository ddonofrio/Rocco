# Final Screen Map

The final map owns the independent ROCCO credits level. The level mounts its own full-screen
background and image planes, owns the credit sequence and blocked input lease, and completes by
geometry when the copyright entry leaves the viewport.

The map has no connectors. Runtime requests enter it with an invocation session that records the
developer-preview, superpowers, or missing-cartridge continuation. End images are declared by
`final-screen-assets.ts`, preloaded with the final scene, positioned deterministically inside the
design viewport, and presented one at a time after an initial ten-second delay. Each image fades in,
remains visible for 20 seconds, fades out, and is replaced by the next image.
