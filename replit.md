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
- **Dimension Rift system** — periodic events (every 90-180s) that temporarily merge all players onto a shared map with 2x monsters and items. Rifts last 20-50 enemy ticks, with warning messages, countdown banners, and automatic return to private dungeons when the rift closes.
- Fog of war with raycasting FOV
- Real-time multiplayer via WebSocket (visible during rifts)
- Combat system with enemy scaling by depth
- Items (potions heal, scrolls, gold, weapons)
- Stairs (`>`) to descend to deeper levels (disabled during rifts)
- AI bots that participate in rifts alongside human players
- Death respawns player at depth 1 with fresh dungeon

## Style
- Monospace font (Fira Code), terminal green (#00FF00) on black
- CRT scanline + flicker effects
- Color coding: player=yellow, enemy=red, items=cyan, walls=grey
- Rift indicators: purple banners and borders during dimension rift events
