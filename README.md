# Dungeon MUD

A real-time multiplayer ASCII roguelike dungeon crawler built with WebSockets. Explore procedurally generated dungeons, fight monsters, collect loot, and encounter other players — all rendered in classic terminal-style ASCII art.

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

### Procedural Dungeon Generation
- Room-and-corridor dungeon layout generated fresh each depth
- Infinite descending levels with increasing difficulty
- Stairs (`>`) connect levels — descend deeper for tougher monsters and better loot

### Real-Time Multiplayer
- WebSocket-based multiplayer — all players share the same dungeon
- See other players (`@`) exploring alongside you
- Walk through other players freely; only monsters block your path
- System log reports when players pass by each other

### Combat System
- Bump-to-attack melee combat against monsters
- Damage scales with dungeon depth
- Every kill grants **+2 max HP**, rewarding aggressive play
- Death screen shows full run statistics before respawning

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
- 4 AI-controlled players roam the dungeon alongside human players
- Bots use BFS pathfinding to navigate, explore, pick up items, and fight
- Intentionally weaker (12 HP) and passive — they won't steal all the monsters
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
    pages/home.tsx        # Join screen, game view, death screen
    hooks/useWebSocket.ts # WebSocket connection & message handling
    lib/gameLogic.ts      # Shared types and constants
    index.css             # CRT effects, color themes, Tailwind config

server/
  index.ts                # Express + HTTP server setup
  routes.ts               # WebSocket handlers, AI bot spawning, enemy tick loop
  game.ts                 # GameWorld, DungeonLevel, procedural generation, combat, FOV
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

## License

MIT
