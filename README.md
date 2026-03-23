# Dungeon MUD

A real-time multiplayer ASCII roguelike dungeon crawler built with WebSockets. Explore procedurally generated dungeons, fight monsters, collect loot, and encounter other players through Dimension Rifts — all rendered in classic terminal-style ASCII art with procedural audio. Fully playable on desktop and mobile, with a live observation mode to watch AI bots play.

```
 ██████╗ ██╗   ██╗███╗   ██╗ ██████╗ ███████╗ ██████╗ ███╗   ██╗
 ██╔══██╗██║   ██║████╗  ██║██╔════╝ ██╔════╝██╔═══██╗████╗  ██║
 ██║  ██║██║   ██║██╔██╗ ██║██║  ███╗█████╗  ██║   ██║██╔██╗ ██║
 ██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══╝  ██║   ██║██║╚██╗██║
 ██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝███████╗╚██████╔╝██║ ╚████║
 ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
                       M U D
```

**v0.6.0**

## Features

### Per-Player Dungeon Instances
- Each player explores their own private, procedurally generated dungeon
- Room-and-corridor dungeon layout generated fresh for each player and each depth
- Infinite descending levels with increasing difficulty
- Stairs (`>`) connect levels — descend deeper for tougher monsters and better loot

### Dimension Rift System
- Every 90–180 seconds, a **Dimension Rift** event triggers across all players
- Once any player reaches **depth 5+**, rifts accelerate to every **30–70 seconds**
- A warning phase announces the incoming rift with purple UI banners and log messages
- After a brief countdown, all living players are merged onto a single shared map
- The rift level spawns **2× the normal amount of monsters and items**
- Players can see and interact with each other during the rift
- A countdown shows how many turns remain before the rift closes (20–50 enemy ticks)
- Warning messages appear at 10 turns and 3 turns remaining
- When the rift closes, every player returns to their own private dungeon — **HP and max HP are fully preserved**
- Stairs are disabled during rifts to keep everyone on the shared map

### Rift Aggression
- During rifts, monsters become significantly more aggressive
- Enemies act on **95% of ticks** (vs 30% normally) when injured players are nearby
- Monsters pathfind toward the closest injured player (HP below max)
- 40% chance of a bonus lunge attack during aggressive pursuit
- Even without injured targets, rift monsters are more active (50% act chance vs 30%)

### Phase Healing
- During a rift, walking through another player's tile triggers **phase healing**
- Both players restore **2–4 HP** from the dimensional energy
- Other players appear red (`@`) during a rift — walk through them to heal

### Rift Death & Respawn
- If you die during a rift, you respawn at your **pre-rift depth** instead of depth 1
- Your **max HP is preserved** from before the rift; you recover at half your max HP
- Normal deaths (outside rifts) fully restore HP to 25/25

### Combat System
- Bump-to-attack melee combat against monsters
- Damage scales with dungeon depth
- Every kill grants **+2 max HP**, rewarding aggressive play
- Player starts with **25 HP**
- Death screen shows full run statistics before respawning

### Equipment Buffs
Picking up equipment grants temporary enchantment buffs that last a random number of turns:

| Symbol | Item | Buff Type | Effect |
|--------|------|-----------|--------|
| `)` | Sword | Armor | +2 damage reduction for 8–20 turns |
| `[` | Shield | Armor | +3 damage reduction for 10–25 turns |
| `}` | Bow | Damage | +1 attack damage for 8–20 turns |
| `/` | Wand | Damage | +2 attack damage for 8–20 turns |

- Armor buffs reduce incoming damage (minimum 1 damage per hit)
- Damage buffs add bonus damage to all attacks
- Multiple buffs can stack (e.g., Sword + Shield armor)
- Active buffs display in the header with remaining turns
- A rising synth tone plays when a buff activates; a descending tone when it fades

### Rest & Heal System
- Press `.` (period) or `Space` to rest in place (tap `Z` on mobile)
- After **2 turns** of resting, a message confirms you're recovering
- After **3+ turns**, you heal **1 HP** per rest turn
- After **5+ turns**, healing increases to **2 HP** per turn
- After **8+ turns**, healing increases to **3 HP** per turn
- **Risk:** Resting attracts lowercase monsters — they creep toward you from increasing range the longer you stay still
- At **5 turns**, a warning message alerts you that creatures sense your stillness
- Any movement immediately resets the rest counter

### Kill Streak Rewards
- Kill **5 monsters in a row** without taking combat damage to trigger a **gold rain** event
- 3–6 Gold items scatter across random positions on the map
- Streak resets after the reward or when you take damage from an enemy

### Leaderboard
- Live leaderboard in the sidebar, sorted by **all-time deepest depth** (kills as tiebreaker)
- Depth tracking is persistent across deaths — dying and respawning never drops your position
- Shows the top 10 players (human + AI)
- Your own entry is highlighted
- Dead players shown with strikethrough

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
| `g` | Goblin | 8 | Drains 1–3 HP within 3 tiles |
| `o` | Orc | 12 | Drains 1–3 HP within 3 tiles |
| `r` | Rat | 4 | Drains 1–3 HP within 3 tiles |
| `w` | Wolf | 6 | Drains 1–3 HP within 3 tiles |

Lowercase monsters passively drain HP from any player within 1–3 tiles every enemy tick — no direct contact needed. They are also attracted toward resting players.

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
- 4 AI-controlled players roam their own private dungeons simultaneously
- Bots use BFS pathfinding to navigate, explore, pick up items, and fight
- Intentionally weaker (12 HP) and passive — they won't steal all the monsters
- Bots participate in Dimension Rifts alongside human players
- Auto-respawn on death
- Fully watchable via **Observation Mode** (see below)

### Observation Mode
Watch the AI bots play live without entering the dungeon yourself:
- Available from the **join screen** ("Watch the AI Play" button)
- Available from the **death screen** ("Watch the AI Play" button)
- Renders the live dungeon from the chosen AI's perspective — fog of war, inventory, log, and leaderboard all update in real time
- Cycle between bots using `N` / `Tab` on keyboard, or the "Next AI" button
- Leave observation with `Escape` or the "Leave" button to return to the join screen
- On mobile, D-pad is replaced with Next AI / Leave buttons in landscape mode
- No player is created on the server — observers are pure watchers with no game impact

### Procedural Audio
- Fully procedural audio engine using the Web Audio API — no external audio files
- **Dungeon music**: Low droning ambient loop with evolving filter sweeps and chord progressions
- **Rift music**: Eerie, detuned atmosphere with swept filters and high-frequency tones
- **Sound effects**: Metallic clang for weapon/shield pickups, blip for other items, monster growl on enemy attacks, rising synth for buff activation, descending tone for buff expiry
- **Ambient sounds**: Random footsteps, distant growls, and atmospheric drags
- **Audio watchdog**: A background check runs every 2 seconds — if the browser suspends the AudioContext, it resumes automatically. A small dot in the game header shows live audio health (green = OK, yellow = healing)
- Mute button in the game header, preference saved to localStorage

### Death & Stats
When you die, a full death screen displays your run statistics:
- Deepest depth reached this run
- Monsters slain
- Damage dealt / taken
- Items collected
- Steps walked
- What killed you

Press Enter or Space to respawn at full HP, or watch the AI play while you take a break.

### Visual Style
- Retro CRT terminal aesthetic with scanline and flicker effects
- Fira Code monospace font
- Color-coded entities: yellow (player), cyan (other players / AI), red (enemies), green (items), grey (walls)
- Purple UI banners and map border glow during Dimension Rift events
- Radial vignette overlay for immersion
- Active buff indicators with turn counters in the header

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `W` / `↑` | Move north |
| `S` / `↓` | Move south |
| `A` / `←` | Move west |
| `D` / `→` | Move east |
| `.` / `Space` | Rest in place |

### Desktop — Observation Mode
| Key | Action |
|-----|--------|
| `N` / `Tab` | Switch to next AI bot |
| `Escape` | Stop observing, return to join screen |

### Mobile (landscape)
Portrait mode shows a "rotate your device" prompt. In landscape:

| Control | Action |
|---------|--------|
| D-pad arrows | Move in that direction (hold to repeat) |
| `Z` (center) | Rest in place |
| Next AI / Leave | Observation mode controls (replace D-pad when observing) |

Move into a monster to attack. Move onto an item to pick it up. Move onto stairs (`>`) to descend.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS v4, Vite, Wouter
- **Backend:** Node.js, Express, WebSocket (`ws`)
- **Audio:** Web Audio API (fully procedural, no audio files)
- **Game Logic:** Server-authoritative — all state lives on the server
- **No Database:** Game state is ephemeral and session-based

## Architecture

```
client/
  src/
    pages/home.tsx        # Join screen, game view, death screen, observe mode, mobile D-pad
    hooks/useWebSocket.ts # WebSocket connection, playing/observing/idle modes
    lib/gameLogic.ts      # Shared types and constants
    lib/audioEngine.ts    # Procedural Web Audio API engine with watchdog
    index.css             # CRT effects, color themes, Tailwind config

server/
  index.ts                # Express + HTTP server setup
  routes.ts               # WebSocket handlers, observer tracking, AI bot spawning, tick loops
  game.ts                 # GameWorld, DungeonLevel, per-player instances, rift system, FOV
  aiBot.ts                # AI player with BFS pathfinding and goal-based behavior

shared/
  schema.ts               # Shared type definitions
```

### WebSocket Protocol

**Client → Server**
| Message | Description |
|---------|-------------|
| `{ type: "join", name }` | Enter the game as a named player |
| `{ type: "observe" }` | Connect as a read-only observer (no player created) |
| `{ type: "observe_cycle" }` | Switch to the next AI bot while observing |
| `{ type: "move", dx, dy }` | Move in a direction (-1, 0, or 1) |
| `{ type: "rest" }` | Rest in place |
| `{ type: "respawn" }` | Respawn after death |

**Server → Client**
| Message | Description |
|---------|-------------|
| `{ type: "state", data }` | Full game state snapshot (includes `observing`, `observedName`, `observedIdx`, `observedCount` when in observe mode) |

## Running Locally

```bash
npm install
npm run dev
```

The server starts on port 5000 serving both the API and the Vite dev build.

## Changelog

### v0.6.0
- **Observation mode**: Watch any AI bot play live from the join screen or death screen; cycle with N/Tab, leave with Escape; works on desktop and mobile
- **Audio watchdog**: Background check every 2s auto-resumes suspended AudioContext; live health indicator dot in the game header
- **Leaderboard all-time depth**: Deepest depth is now tracked permanently — dying never resets your leaderboard position
- **Respawn HP fix**: Normal deaths fully restore HP (25/25); half-HP penalty only applies to dying inside a Dimension Rift
- **Compact log**: Log panel shows last 8 messages in smaller text for faster reading

### v0.5.0
- **Mobile support**: Responsive layout with scaled ASCII map and touch D-pad in landscape mode
- **Rift HP preservation**: HP and max HP saved and restored across rift entry/exit
- **Rift death respawn**: Dying in a rift respawns at pre-rift depth, not depth 1
- **Phase healing**: Walking through other players during a rift heals both parties 2–4 HP

### v0.4.0
- Equipment buff system: Sword, Shield, Bow, Wand grant timed combat buffs
- Rest/heal mechanic with monster attraction risk
- Leaderboard panel (depth + kills, top 10)
- Rift visual overhaul: purple walls, red other-players

### v0.3.0
- Kill streak rewards (gold rain after 5 consecutive kills)
- AI bot players with BFS pathfinding
- Procedural audio engine (dungeon music, rift music, SFX)

### v0.2.0
- Dimension Rift system
- Fog of war with raycasting
- Depth-scaling difficulty

### v0.1.0
- Initial release: procedural dungeons, combat, items, WebSocket multiplayer

## License

MIT
