# Music Assets

This directory contains the game music assets for ROCCO.

## Files

- `end-music.mp3` — Victory screen music (plays when a player wins)
- `game-music-1.mp3` — Main theme track 1
- `game-music-2.mp3` — Main theme track 2

## Usage

### Game Music (Main Theme)

The two main theme tracks (`game-music-1.mp3` and `game-music-2.mp3`) are managed by the **jukebox** system. The jukebox is a background music manager that handles continuous playlist playback with automatic crossfading between tracks. It analyzes each track to find non-silent segments, skips short gaps, and smoothly transitions between usable portions of the music.

The main theme playlist plays automatically when the game starts and continues throughout gameplay. This creates an ambient soundtrack that persists across level transitions.

### Victory Music (End Screen)

`end-music.mp3` is used for the victory screen shown after a player wins. When the winning condition is met, the game displays a black screen with "HAS GANADO" text and plays this track directly through the audio system (not via jukebox). This allows immediate playback without waiting for playlist transitions.

## How It Works

The ROCCO engine separates music into two systems:

1. **Jukebox** — Manages background music that continues playing across scenes. Tracks are registered in playlists with auto-mix enabled, which finds the best segments to play and crossfades between them.

2. **Direct Audio** — Used for one-time sounds like victory music, sound effects, and ambient noises. These play immediately when triggered without playlist coordination.
