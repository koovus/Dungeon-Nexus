# ASCII MUD — Roguelike Dungeon Crawler

## Overview
A real-time multiplayer ASCII roguelike MUD where multiple players explore procedurally generated dungeons simultaneously via WebSocket connections. Features fog of war, combat, items, descending dungeon levels, AI bots, and a Dimension Rift system that periodically merges players' separate worlds.

## Architecture
- **Frontend**: React + Vite + Tailwind v4, CRT terminal aesthetic
- **Backend**: Express + WebSocket (ws) for real-time game state
- **No database** — game state is ephemeral/session-based

## Key Files
- `server/game.ts` — Core game logic: dungeon generation, per-player instances, rift system, FOV, combat
- `server/aiBot.ts` — AI bot that autonomously explores dungeons
- `server/routes.ts` — WebSocket server handling player connections, moves, rift broadcasts
- `client/src/pages/home.tsx` — Main game UI (join screen, game view, death screen, rift banners)
- `client/src/hooks/useWebSocket.ts` — WebSocket client hook
- `client/src/lib/gameLogic.ts` — Shared TypeScript types for game state
- `client/src/components/GameSettings.tsx` — Legacy settings component (unused)

## Game Features
- Procedurally generated room-based dungeons with corridors
- **Per-player dungeon instances** — each player explores their own private dungeon
- **Dimension Rift system** — periodic events that temporarily merge all players onto a shared map with 2x monsters and items. Rifts last 20-50 enemy ticks, with warning messages, countdown banners, and automatic return to private dungeons when the rift closes. Normal interval is 90-180s; once any player reaches depth 5+, rifts accelerate to every 30-70s. During rifts, injured players (HP < max) attract monsters aggressively: enemies act ~95% of ticks (vs 30% normally) and pathfind toward the closest injured player.
- **Lowercase monster HP drain aura** — lowercase-letter enemies (g, o, r, w) passively drain 1-3 HP from any player within 1-3 tile distance each enemy tick. This happens automatically without requiring the monster to move or attack.
- Fog of war with raycasting FOV
- Real-time multiplayer via WebSocket (visible during rifts)
- **Kill streak gold rain** — killing 5 monsters in a row (without taking damage) triggers a gold rain event: 3-6 Gold items spawn at random walkable positions on the map. Streak resets on reward or when the player takes combat damage.
- Combat system with enemy scaling by depth
- Items (potions heal, scrolls, gold, weapons)
- Stairs (`>`) to descend to deeper levels (disabled during rifts)
- AI bots that participate in rifts alongside human players
- Death respawns player at depth 1 with fresh dungeon

## Audio System
- `client/src/lib/audioEngine.ts` — Procedural audio engine using Web Audio API (no external audio files)
- **Dungeon music**: Low droning ambient loop (sawtooth+sine oscillators, LFO-modulated filter), fades in over 3-5s
- **Rift music**: Eerie space-like atmosphere (detuned beating oscillators, swept bandpass, high sine, filtered noise)
- **Music transitions**: Rift warning fades dungeon music out; rift active cuts to rift music; rift end fades dungeon music back in
- **SFX**: Metallic clang (bandpass noise + ring oscillator) for weapon/shield pickups; gentle blip for other items; monster growl (low sawtooth) on enemy attacks
- **Ambient sounds**: Randomly scheduled every 4-14s — footstep pairs, foot drag (optionally followed by distant growl), distant growl
- Mute button in game header, persisted in localStorage
- Audio initialized on join button click (browser autoplay policy)

## Style
- Monospace font (Fira Code), terminal green (#00FF00) on black
- CRT scanline + flicker effects
- Color coding: player=yellow, enemy=red, items=cyan, walls=grey
- Rift indicators: purple banners and borders during dimension rift events
