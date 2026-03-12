# Dungeon MUD

A real-time multiplayer ASCII roguelike dungeon crawler built with WebSockets. Explore procedurally generated dungeons, fight monsters, collect loot, and encounter other players through Dimension Rifts — all rendered in classic terminal-style ASCII art with procedural audio.

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
- Once any player reaches **depth 5+**, rifts accelerate to every **30-70 seconds**
- A warning phase announces the incoming rift with purple UI banners and system log messages
- After a brief countdown, all living players are merged onto a single shared map
- The rift level spawns **2x the normal amount of monsters and items**
- Players can see and interact with each other during the rift
- A countdown shows how many turns remain before the rift closes (20-50 enemy ticks)
- Warning messages appear at 10 turns and 3 turns remaining
- When the rift closes, every player returns to their own private dungeon exactly where they left off
- Stairs are disabled during rifts to keep everyone on the shared map

### Rift Aggression
- During rifts, monsters become significantly more aggressive
- Enemies act on **95% of ticks** (vs 30% normally) when injured players are nearby
- Monsters pathfind toward the closest injured player (HP below max)
- 40% chance of a bonus lunge attack during aggressive pursuit
- Even without injured targets, rift monsters are more active (50% act chance vs 30%)

### Combat System
- Bump-to-attack melee combat against monsters
- Damage scales with dungeon depth
- Every kill grants **+2 max HP**, rewarding aggressive play
- Player starts with **25 HP**
- Death screen shows full run statistics before respawning
- HP and max HP fully reset on respawn for a fresh start

### Equipment Buffs
Picking up equipment grants temporary enchantment buffs that last a random number of turns:

| Symbol | Item | Buff Type | Effect |
|--------|------|-----------|--------|
| `)` | Sword | Armor | +2 damage reduction for 8-20 turns |
| `[` | Shield | Armor | +3 damage reduction for 10-25 turns |
| `}` | Bow | Damage | +1 attack damage for 8-20 turns |
| `/` | Wand | Damage | +2 attack damage for 8-20 turns |

- Armor buffs reduce incoming damage (minimum 1 damage per hit)
- Damage buffs add bonus damage to all attacks
- Multiple buffs can stack (e.g., Sword + Shield armor)
- Active buffs display in the header with remaining turns
- A rising synth tone plays when a buff activates; a descending tone when it fades
- Combat messages show bonus damage dealt and damage absorbed

### Rest & Heal System
- Press `.` (period) or `Space` to rest in place
- After **2 turns** of resting, a message confirms you're recovering
- After **3+ turns**, you heal **1 HP** per rest turn
- After **5+ turns**, healing increases to **2 HP** per turn
- After **8+ turns**, healing increases to **3 HP** per turn
- **Risk:** Resting attracts lowercase monsters — they creep toward you from increasing range the longer you stay still
- At **5 turns**, a warning message alerts you that creatures sense your stillness
- Any movement immediately resets the rest counter
- A pulsing "Resting..." indicator shows in the header while resting

### Monster Types

**Uppercase monsters** — actively roam the dungeon and hunt players:
| Symbol | Monster | Base HP |
|--------|---------|---------|
| `T` | Troll | 18 |
| `D` | Dragon | 30 |
| `S` | Skeleton | 10 |
| `Z` | Zombie | 14 |

**Lowercase monsters** — have an HP drain aura:
| Symbol | Monster | Base HP | Special |
|--------|---------|---------|---------|
| `g` | Goblin | 8 | Drains 1-3 HP within 3 tiles |
| `o` | Orc | 12 | Drains 1-3 HP within 3 tiles |
| `r` | Rat | 4 | Drains 1-3 HP within 3 tiles |
| `w` | Wolf | 6 | Drains 1-3 HP within 3 tiles |

Lowercase monsters passively drain HP from any player within 1-3 tiles every enemy tick — no direct contact needed. They are also attracted toward resting players. Get in, kill them fast, or keep your distance.

### Kill Streak Rewards
- Kill **5 monsters in a row** without taking combat damage to trigger a **gold rain** event
- 3-6 Gold items scatter across random positions on the map
- Streak resets after the reward or when you take damage from an enemy

### Items & Healing
| Symbol | Item | Effect |
|--------|------|--------|
| `!` | Health Potion | Restores 5 HP |
| `%` | Food | Restores 3 HP |
| `"` | Healing Herb | Restores 8 HP |
| `?` | Magic Scroll | Collectible |
| `$` | Gold | Collectible |

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

### Procedural Audio
- Fully procedural audio engine using the Web Audio API — no external audio files
- **Dungeon music**: Low droning ambient loop with evolving filter sweeps
- **Rift music**: Eerie, detuned atmosphere with swept filters and high-frequency tones
- **Sound effects**: Metallic clang for weapon/shield pickups, gentle blip for other items, monster growl on enemy attacks, rising synth for buff activation, descending tone for buff expiry
- **Ambient sounds**: Random footsteps, distant growls, and atmospheric drags
- Mute button in the game header, preference saved to localStorage

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
- Active buff indicators with turn counters in the header
- Pulsing "Resting..." indicator during rest

## Controls

| Key | Action |
|-----|--------|
| `W` / `Arrow Up` | Move north |
| `S` / `Arrow Down` | Move south |
| `A` / `Arrow Left` | Move west |
| `D` / `Arrow Right` | Move east |
| `.` / `Space` | Rest in place (heal over time) |

Move into a monster to attack it. Move onto an item to pick it up. Move onto stairs (`>`) to descend.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS v4, Vite, Wouter
- **Backend:** Node.js, Express, WebSocket (`ws`)
- **Audio:** Web Audio API (fully procedural, no audio files)
- **Game Logic:** Server-authoritative — all state lives on the server
- **No Database:** Game state is ephemeral/session-based

## Architecture

```
client/
  src/
    pages/home.tsx        # Join screen, game view, death screen, rift banners
    hooks/useWebSocket.ts # WebSocket connection & message handling
    lib/gameLogic.ts      # Shared types and constants
    lib/audioEngine.ts    # Procedural Web Audio API sound engine
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
| `{ type: "rest" }` | Rest in place (heal over time, attracts monsters) |
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
