# Dungeon MUD

A real-time multiplayer ASCII roguelike dungeon crawler built with WebSockets. Explore procedurally generated dungeons, fight monsters, collect loot, and encounter other players through Dimension Rifts — all rendered in classic terminal-style ASCII art.

```
 ██████╗ ██╗   ██╗███╗   ██╗ ██████╗ ███████╗ ██████╗ ███╗   ██╗
 ██╔══██╗██║   ██║████╗  ██║██╔════╝ ██╔════╝██╔═══██╗████╗  ██║
 ██║  ██║██║   ██║██╔██╗ ██║██║  ███╗█████╗  ██║   ██║██╔██╗ ██║
 ██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══╝  ██║   ██║██║╚██╗██║
 ██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝███████╗╚██████╔╝██║ ╚████║
 ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
                       M U D
```

## Features

### Per-Player Dungeon Instances
- Each player explores their own private, procedurally generated dungeon
- Room-and-corridor dungeon layout generated fresh for each player and each depth
- Infinite descending levels with increasing difficulty
- Stairs (`>`) connect levels — descend deeper for tougher monsters and better loot

### Dimension Rift System
- Every 90-180 seconds, a **Dimension Rift** event triggers across all players
- A warning phase announces the incoming rift with purple UI banners and system log messages
- After a brief countdown, all living players are merged onto a single shared map
- The rift level spawns **2x the normal amount of monsters and items**
- Players can see and interact with each other during the rift
- A countdown shows how many turns remain before the rift closes (20-50 enemy ticks)
- Warning messages appear at 10 turns and 3 turns remaining
- When the rift closes, every player returns to their own private dungeon exactly where they left off
- Stairs are disabled during rifts to keep everyone on the shared map
- Edge cases handled: player death during rift, disconnection during rift, respawn during rift

### Combat System
- Bump-to-attack melee combat against monsters
- Damage scales with dungeon depth
- Every kill grants **+2 max HP**, rewarding aggressive play
- Death screen shows full run statistics before respawning
- HP and max HP fully reset on respawn for a fresh start

### Roaming Monsters
- **Lowercase monsters** (goblins `g`, orcs `o`, rats `r`, wolves `w`) — stationary, waiting to ambush
- **Uppercase monsters** (Trolls `T`, Dragons `D`, Skeletons `S`, Zombies `Z`) — actively roam the dungeon and will hunt you down
- Monster HP scales with depth

### Items & Healing
| Symbol | Item | Effect |
|--------|------|--------|
| `!` | Health Potion | Restores 5 HP |
| `%` | Food | Restores 3 HP |
| `"` | Healing Herb | Restores 8 HP |
| `?` | Magic Scroll | Collectible |
| `$` | Gold | Collectible |
| `)` | Sword | Collectible |
| `[` | Shield | Collectible |
| `/` | Wand | Collectible |

### Fog of War
- Line-of-sight raycasting limits visibility to a radius around the player
- Explored tiles remain dimly visible on the map
- Unexplored areas are completely hidden

### AI Bot Players
- 4 AI-controlled players roam their own private dungeons
- Bots use BFS pathfinding to navigate, explore, pick up items, and fight
- Intentionally weaker (12 HP) and passive — they won't steal all the monsters
- Bots participate in Dimension Rifts alongside human players
- Auto-respawn on death

### Death & Stats
When you die, a full death screen displays your run statistics:
- Deepest depth reached
- Monsters slain
- Damage dealt / taken
- Items collected
- Steps walked
- What killed you

Press Enter or click to respawn and try again.

### Visual Style
- Retro CRT terminal aesthetic with scanline and flicker effects
- Fira Code monospace font
- Color-coded entities: yellow (player), red (enemies), cyan (items), grey (walls)
- Purple UI banners and map border glow during Dimension Rift events
- Radial vignette overlay for immersion

## Controls

| Key | Action |
|-----|--------|
| `W` / `Arrow Up` | Move north |
| `S` / `Arrow Down` | Move south |
| `A` / `Arrow Left` | Move west |
| `D` / `Arrow Right` | Move east |

Move into a monster to attack it. Move onto an item to pick it up. Move onto stairs (`>`) to descend.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS v4, Vite, Wouter
- **Backend:** Node.js, Express, WebSocket (`ws`)
- **Game Logic:** Server-authoritative — all state lives on the server
- **No Database:** Game state is ephemeral/session-based

## Architecture

```
client/
  src/
    pages/home.tsx        # Join screen, game view, death screen, rift banners
    hooks/useWebSocket.ts # WebSocket connection & message handling
    lib/gameLogic.ts      # Shared types and constants
    index.css             # CRT effects, color themes, Tailwind config

server/
  index.ts                # Express + HTTP server setup
  routes.ts               # WebSocket handlers, AI bot spawning, enemy/rift tick loops
  game.ts                 # GameWorld, DungeonLevel, per-player instances, rift system, FOV
  aiBot.ts                # AI player with BFS pathfinding and goal-based behavior

shared/
  schema.ts               # Shared type definitions
```

### WebSocket Protocol

| Client Message | Description |
|---------------|-------------|
| `{ type: "join", name }` | Join the game with a name |
| `{ type: "move", dx, dy }` | Move in a direction (-1, 0, or 1) |
| `{ type: "respawn" }` | Respawn after death |

| Server Message | Description |
|---------------|-------------|
| `{ type: "state", data }` | Full game state snapshot for the player |

## Running Locally

```bash
npm install
npm run dev
```

The server starts on port 5000 with both the API and Vite dev server.

## Changelog

### v0.3.0 — Dimension Rift System
- Refactored multiplayer to use **per-player dungeon instances** — each player now explores their own private dungeon
- Added **Dimension Rift** event system: periodic events (every 90-180s) that temporarily merge all players onto a shared map
- Rift levels spawn 2x monsters and items for increased challenge
- Warning phase with purple UI banners before rifts open
- Countdown display showing remaining rift turns
- Warning messages at 10 and 3 turns before rift closes
- Players return to their private dungeon with full state preserved when the rift closes
- Stairs disabled during rifts to keep players on the shared map
- AI bots participate in rifts alongside human players
- Handles edge cases: death/disconnect/respawn during active rifts

### v0.2.1 — Respawn HP Fix
- Fixed player HP not resetting on respawn — max HP now resets to 20 for a fresh start

### v0.2.0 — Dependency Update
- Updated rollup to v2.80.0 per security scan requirements

### v0.1.0 — Initial Release
- Procedural dungeon generation with rooms and corridors
- Real-time multiplayer via WebSocket
- Fog of war with raycasting FOV
- Combat system with depth-scaled damage
- Items and healing system
- AI bot players with BFS pathfinding
- CRT terminal visual aesthetic
- Death screen with run statistics

## License

MIT
