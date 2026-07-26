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
reminder sequence warns Rocco before the security defeat presentation. The Nether security camera
detects Rocco on the exposed left side regardless of whether he wears the lab coat. Without the lab
coat, Guysprite alerts the police and the defeat presentation respawns Rocco at the Nether entry
checkpoint.
During the departure window, Guysprite exposes `See` and `Talk` actions. `Talk` makes him urge
Rocco to hurry, while `See` selects one of five non-repeating observations. The same interaction
is available in the second Reset Office screen. The second office creates Rocco before starting its
Guysprite arrival sequence so the screen can lock player input during the entrance. On defeat, the
checkpoint restores the Nether-entry
inventory snapshot and resets Rocco to his default appearance before mounting the entry screen. On
the first arrival in that screen, the desk chair
is shown at its authored position, Rocco remains at the connector entry, and Guysprite walks in from
the right at 1.5 times his normal movement speed, while keeping the current running animation
playback, before stopping in front of the chair. After a 250 ms pause, the chair and walking sprite
are replaced by the 1:1 typing sprite at `(523, 179)`, which randomly changes between its three
typing images at random intervals between one and five seconds while the second office remains
active. Control returns after Guysprite reaches that point and the typing sprite is in place. Leaving
and returning from the first Reset Office preserves Guysprite seated at the console; the developer
arrival event explicitly restarts the entrance sequence when requested. The second office also exposes
a background printer target at `(24, 207)` with size `236 × 295`. Its action menu offers localized
Read, Kick, and Grab actions; Kick and Grab select non-repeating Rocco thoughts. Read walks Rocco to
`(260, 492)`, faces him up-left, waits 250 ms, and displays the printer image as an in-scene reading
overlay. The overlay registers fifteen message placeholders at `x = 234`, `y = 0, 35, …, 490`,
each with size `492 × 34`; clicking outside those placeholders closes the overlay and restores the
office scene. Clicking an authored message opens a dark detail presentation with a light bar covering
the two message areas immediately below the first two message positions, that message's text, and a
two-choice dialogue-style menu. Messages 1, 2, 3, and 4 are authored; the remaining placeholders consume
clicks without opening a detail presentation. `Read more messages` returns to the fifteen-message
overlay. `Reply to Guysprite` opens three Rocco response choices. The first makes Rocco say the
message in two shorter pages joined with ellipses, the second makes him say that message's awkward
opposite, and
the third makes him say that the message is unreadable before returning to the message overlay.

`src/cartridges/rocco/levels/nether/**` re-exports the game-owned implementations from this folder.
