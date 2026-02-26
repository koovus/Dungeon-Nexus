# ASCII MUD — Roguelike Dungeon Crawler

## Overview
A real-time multiplayer ASCII roguelike MUD where multiple players explore procedurally generated dungeons simultaneously via WebSocket connections. Features fog of war, combat, items, descending dungeon levels, and an AI bot observe mode.

## Architecture
- **Frontend**: React + Vite + Tailwind v4, CRT terminal aesthetic
- **Backend**: Express + WebSocket (ws) for real-time game state
- **No database** — game state is ephemeral/session-based

## Key Files
- `server/game.ts` — Core game logic: dungeon generation, player management, FOV, combat
- `server/aiBot.ts` — AI bot that autonomously explores dungeons
- `server/routes.ts` — WebSocket server handling player connections, moves, observe mode
- `client/src/pages/home.tsx` — Main game UI (join screen + game view)
- `client/src/hooks/useWebSocket.ts` — WebSocket client hook
- `client/src/lib/gameLogic.ts` — Shared TypeScript types for game state
- `client/src/components/GameSettings.tsx` — Legacy settings component (unused)

## Game Features
- Procedurally generated room-based dungeons with corridors
- Fog of war with raycasting FOV
- Real-time multiplayer via WebSocket
- Combat system with enemy scaling by depth
- Items (potions heal, scrolls, gold, weapons)
- Stairs (`>`) to descend to deeper levels
- AI bot observe mode — watch an AI play the game
- Death respawns player at depth 1

## Style
- Monospace font (Fira Code), terminal green (#00FF00) on black
- CRT scanline + flicker effects
- Color coding: player=yellow, enemy=red, items=cyan, walls=grey
