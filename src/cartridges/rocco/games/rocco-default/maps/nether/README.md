# Nether Map

The Nether map owns the current Nether path and the Reset Office branch:

- `nether-console-hardware-spawn`
- `nether-end-of-hallway-door`
- `nether-reset-office`
- `nether-reset-office-second`

The Reset Office pair remains a separate branch in current gameplay flow, but it is modeled as
part of the Nether map for structural ownership, reset behavior, and developer-menu grouping.
Both Reset Office screens expose localized hover guidance over their shared return edge.

This folder also owns the current concrete Nether and Reset Office implementations plus the local
Nether assets. Pressing the doorbell on the Nether hallway screen transitions to the first Reset
Office screen and runs its arrival sequence. The sequence opens the office door overlay, places
Rocco and Guysprite at their authored ground points, renders Guysprite at 1.65 times its base scale,
makes Guysprite face Rocco as he moves and while the player controls him, blocks
player input, branches on Rocco's lab coat appearance, and closes the door after the welcomed Rocco
walks into the room and stops facing left. The non-cancelable dialogue starts 250 ms after the door
closes. With the lab coat, it presents the player's truncated replies and Guysprite's advanceable
lines through the coffee question, followed by the machine-beep message and three separate lines
that direct Rocco to the other office screen. Control then returns to the player and a 10-second
reminder sequence warns Rocco before the security defeat presentation. Without the lab coat,
Guysprite alerts the police and the defeat presentation respawns Rocco at the Nether entry checkpoint.
During the departure window, Guysprite exposes `See` and `Talk` actions. `Talk` makes him urge
Rocco to hurry, while `See` selects one of five non-repeating observations. The same interaction
is available in the second Reset Office screen. On the first arrival in that screen, the desk chair
is shown at its authored position, Rocco remains at the connector entry, and Guysprite walks in from
the right at 1.5 times his normal movement speed, while keeping the current running animation
playback, before stopping in front of the chair. After a 250 ms pause, the chair and walking sprite
are replaced by the 1:1 typing sprite at `(523, 179)`, which randomly changes between its three
typing images at random intervals between one and five seconds while the second office remains
active. Control returns after Guysprite reaches that point and the typing sprite is in place. Leaving
and returning from the first Reset Office preserves Guysprite seated at the console; the developer
arrival event explicitly restarts the entrance sequence when requested.

`src/cartridges/rocco/levels/nether/**` re-exports the game-owned implementations from this folder.
