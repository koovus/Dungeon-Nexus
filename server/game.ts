import { log } from "./index";

export type EntityType = 'player' | 'enemy' | 'item' | 'stairs_down';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  char: string;
  color: string;
  name: string;
  hp?: number;
  maxHp?: number;
}

export interface Tile {
  char: string;
  walkable: boolean;
  isStairs?: boolean;
}

export interface PlayerStats {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  itemsCollected: number;
  stepsWalked: number;
  deepestDepth: number;
  killedBy: string;
}

export interface PlayerState {
  id: string;
  name: string;
  pos: Position;
  hp: number;
  maxHp: number;
  explored: boolean[][];
  stats: PlayerStats;
  dead: boolean;
}

export interface EnemyDef {
  char: string;
  name: string;
  color: string;
  hp: number;
}

export interface ItemDef {
  char: string;
  name: string;
  color: string;
}

export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 40;
const FOV_RADIUS = 8;

const DEFAULT_ENEMIES: EnemyDef[] = [
  { char: 'g', name: 'Goblin', color: 'text-enemy', hp: 8 },
  { char: 'o', name: 'Orc', color: 'text-enemy', hp: 12 },
  { char: 'T', name: 'Troll', color: 'text-enemy', hp: 18 },
  { char: 'D', name: 'Dragon', color: 'text-enemy', hp: 30 },
  { char: 'r', name: 'Rat', color: 'text-enemy', hp: 4 },
  { char: 'S', name: 'Skeleton', color: 'text-enemy', hp: 10 },
  { char: 'Z', name: 'Zombie', color: 'text-enemy', hp: 14 },
  { char: 'w', name: 'Wolf', color: 'text-enemy', hp: 6 },
];

const DEFAULT_ITEMS: ItemDef[] = [
  { char: '!', name: 'Health Potion', color: 'text-item' },
  { char: '?', name: 'Magic Scroll', color: 'text-item' },
  { char: '$', name: 'Gold', color: 'text-player' },
  { char: ')', name: 'Sword', color: 'text-secondary' },
  { char: '[', name: 'Shield', color: 'text-secondary' },
  { char: '/', name: 'Wand', color: 'text-item' },
  { char: '%', name: 'Food', color: 'text-item' },
  { char: '"', name: 'Healing Herb', color: 'text-primary' },
];

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DimensionRift {
  level: DungeonLevel;
  participants: Set<string>;
  turnsRemaining: number;
  depth: number;
  preRiftState: Map<string, { depth: number; pos: Position; explored: boolean[][] }>;
}

export interface RiftWarning {
  participants: Set<string>;
  ticksLeft: number;
}

export class DungeonLevel {
  map: Tile[][] = [];
  entities: Entity[] = [];
  depth: number;

  constructor(depth: number, entityMultiplier = 1, includeStairs = true) {
    this.depth = depth;
    this.generateRoomBasedMap();
    if (includeStairs) this.placeStairs();
    this.spawnEntities(depth, entityMultiplier);
  }

  generateRoomBasedMap() {
    this.map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        row.push({ char: '#', walkable: false });
      }
      this.map.push(row);
    }

    const rooms: Room[] = [];
    const numRooms = 8 + Math.floor(Math.random() * 6);

    for (let i = 0; i < numRooms * 3; i++) {
      if (rooms.length >= numRooms) break;

      const w = 5 + Math.floor(Math.random() * 8);
      const h = 4 + Math.floor(Math.random() * 6);
      const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - w - 2));
      const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - h - 2));

      const overlaps = rooms.some(r =>
        x <= r.x + r.w + 1 && x + w + 1 >= r.x &&
        y <= r.y + r.h + 1 && y + h + 1 >= r.y
      );

      if (!overlaps) {
        rooms.push({ x, y, w, h });
        for (let ry = y; ry < y + h; ry++) {
          for (let rx = x; rx < x + w; rx++) {
            this.map[ry][rx] = { char: '.', walkable: true };
          }
        }
      }
    }

    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1];
      const b = rooms[i];
      const ax = Math.floor(a.x + a.w / 2);
      const ay = Math.floor(a.y + a.h / 2);
      const bx = Math.floor(b.x + b.w / 2);
      const by = Math.floor(b.y + b.h / 2);

      let cx = ax;
      let cy = ay;

      while (cx !== bx) {
        if (cy >= 0 && cy < MAP_HEIGHT && cx >= 0 && cx < MAP_WIDTH) {
          this.map[cy][cx] = { char: '.', walkable: true };
          if (cy > 0) this.map[cy][cx] = { char: '.', walkable: true };
        }
        cx += cx < bx ? 1 : -1;
      }

      while (cy !== by) {
        if (cy >= 0 && cy < MAP_HEIGHT && cx >= 0 && cx < MAP_WIDTH) {
          this.map[cy][cx] = { char: '.', walkable: true };
        }
        cy += cy < by ? 1 : -1;
      }
    }
  }

  placeStairs() {
    const pos = this.getRandomEmptyPos();
    this.map[pos.y][pos.x] = { char: '>', walkable: true, isStairs: true };
    this.entities.push({
      id: `stairs_${this.depth}`,
      type: 'stairs_down',
      pos,
      char: '>',
      color: 'text-primary',
      name: 'Stairs Down'
    });
  }

  spawnEntities(depth: number, multiplier = 1) {
    const enemyCount = Math.floor((10 + depth * 3) * multiplier);
    const itemCount = Math.floor((12 + depth * 2) * multiplier);

    for (let i = 0; i < enemyCount; i++) {
      const def = DEFAULT_ENEMIES[Math.floor(Math.random() * DEFAULT_ENEMIES.length)];
      const scaledHp = Math.floor(def.hp * (1 + (depth - 1) * 0.3));
      this.entities.push({
        id: `e_${depth}_${i}_${Date.now()}`,
        type: 'enemy',
        pos: this.getRandomEmptyPos(),
        char: def.char,
        color: def.color,
        name: def.name,
        hp: scaledHp,
        maxHp: scaledHp
      });
    }

    for (let i = 0; i < itemCount; i++) {
      const def = DEFAULT_ITEMS[Math.floor(Math.random() * DEFAULT_ITEMS.length)];
      this.entities.push({
        id: `i_${depth}_${i}_${Date.now()}`,
        type: 'item',
        pos: this.getRandomEmptyPos(),
        char: def.char,
        color: def.color,
        name: def.name
      });
    }
  }

  getRandomEmptyPos(): Position {
    let attempts = 0;
    while (attempts < 10000) {
      const x = Math.floor(Math.random() * MAP_WIDTH);
      const y = Math.floor(Math.random() * MAP_HEIGHT);
      if (this.map[y][x].walkable && !this.map[y][x].isStairs) {
        const occupied = this.entities.some(e => e.pos.x === x && e.pos.y === y);
        if (!occupied) return { x, y };
      }
      attempts++;
    }
    return { x: 1, y: 1 };
  }

  getCentralEmptyPos(): Position {
    const cx = Math.floor(MAP_WIDTH / 2);
    const cy = Math.floor(MAP_HEIGHT / 2);

    for (let radius = 0; radius < Math.max(MAP_WIDTH, MAP_HEIGHT); radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
            if (this.map[y][x].walkable && !this.map[y][x].isStairs) {
              const occupied = this.entities.some(e => e.pos.x === x && e.pos.y === y);
              if (!occupied) return { x, y };
            }
          }
        }
      }
    }
    return this.getRandomEmptyPos();
  }

  countOpenNeighbors(pos: Position): number {
    let count = 0;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dx, dy] of dirs) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && this.map[ny][nx].walkable) {
        count++;
      }
    }
    return count;
  }

  getOpenEmptyPos(): Position {
    let best: Position | null = null;
    let bestOpen = 0;

    for (let i = 0; i < 200; i++) {
      const pos = this.getRandomEmptyPos();
      const open = this.countOpenNeighbors(pos);
      if (open > bestOpen) {
        bestOpen = open;
        best = pos;
      }
      if (open >= 6) return pos;
    }
    return best || this.getCentralEmptyPos();
  }
}

export class GameWorld {
  playerLevels: Map<string, Map<number, DungeonLevel>> = new Map();
  players: Map<string, PlayerState> = new Map();
  playerDepths: Map<string, number> = new Map();
  messageLog: Map<string, string[]> = new Map();

  rift: DimensionRift | null = null;
  riftWarning: RiftWarning | null = null;
  riftTimer: ReturnType<typeof setTimeout> | null = null;
  onRiftEvent: ((playerIds: string[]) => void) | null = null;

  constructor() {
    log("Game world initialized", "game");
    this.scheduleNextRift();
  }

  getOrCreatePlayerLevel(playerId: string, depth: number): DungeonLevel {
    let levels = this.playerLevels.get(playerId);
    if (!levels) {
      levels = new Map();
      this.playerLevels.set(playerId, levels);
    }
    if (!levels.has(depth)) {
      const level = new DungeonLevel(depth);
      levels.set(depth, level);
      log(`Generated dungeon level ${depth} for player ${playerId}`, "game");
    }
    return levels.get(depth)!;
  }

  getActiveLevel(playerId: string): DungeonLevel | null {
    if (this.rift && this.rift.participants.has(playerId)) {
      return this.rift.level;
    }
    const depth = this.playerDepths.get(playerId);
    if (depth === undefined) return null;
    return this.getOrCreatePlayerLevel(playerId, depth);
  }

  getEffectiveDepth(playerId: string): number {
    if (this.rift && this.rift.participants.has(playerId)) {
      return this.rift.depth;
    }
    return this.playerDepths.get(playerId) || 1;
  }

  isInRift(playerId: string): boolean {
    return this.rift !== null && this.rift.participants.has(playerId);
  }

  isRiftWarningActive(playerId: string): boolean {
    return this.riftWarning !== null && this.riftWarning.participants.has(playerId);
  }

  addPlayer(id: string, name: string, useOpenSpawn = false): PlayerState {
    const depth = 1;
    const level = this.getOrCreatePlayerLevel(id, depth);
    const pos = useOpenSpawn ? level.getOpenEmptyPos() : level.getRandomEmptyPos();

    const explored: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      explored.push(new Array(MAP_WIDTH).fill(false));
    }

    const player: PlayerState = {
      id,
      name,
      pos,
      hp: 20,
      maxHp: 20,
      explored,
      dead: false,
      stats: {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        itemsCollected: 0,
        stepsWalked: 0,
        deepestDepth: 1,
        killedBy: ''
      }
    };

    this.players.set(id, player);
    this.playerDepths.set(id, depth);
    this.messageLog.set(id, [
      "Welcome to the Dungeons of Doom.",
      "Use arrow keys or WASD to move.",
      "Find the > stairs to descend deeper.",
      "You are alone in your dimension... for now."
    ]);

    this.updatePlayerFOV(id);
    log(`Player ${name} (${id}) joined at depth ${depth}`, "game");

    return player;
  }

  respawnPlayer(id: string) {
    const player = this.players.get(id);
    if (!player) return;

    if (this.rift && this.rift.participants.has(id)) {
      this.removeFromRift(id);
    }

    player.dead = false;
    player.maxHp = 20;
    player.hp = player.maxHp;
    player.stats = {
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      itemsCollected: 0,
      stepsWalked: 0,
      deepestDepth: 1,
      killedBy: ''
    };

    const depth = 1;
    this.playerDepths.set(id, depth);

    this.playerLevels.delete(id);
    const level = this.getOrCreatePlayerLevel(id, depth);
    player.pos = level.getRandomEmptyPos();
    player.explored = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      player.explored.push(new Array(MAP_WIDTH).fill(false));
    }
    this.messageLog.set(id, [
      "You awaken at the dungeon entrance...",
      "A new journey begins."
    ]);
    this.updatePlayerFOV(id);
    log(`Player ${player.name} (${id}) respawned`, "game");
  }

  removePlayer(id: string) {
    const player = this.players.get(id);
    if (player) {
      if (this.rift && this.rift.participants.has(id)) {
        this.removeFromRift(id);
      }
      if (this.riftWarning && this.riftWarning.participants.has(id)) {
        this.riftWarning.participants.delete(id);
      }
      log(`Player ${player.name} (${id}) left`, "game");
    }
    this.players.delete(id);
    this.playerDepths.delete(id);
    this.messageLog.delete(id);
    this.playerLevels.delete(id);
  }

  addMessage(playerId: string, msg: string) {
    const msgs = this.messageLog.get(playerId) || [];
    msgs.push(msg);
    if (msgs.length > 50) msgs.shift();
    this.messageLog.set(playerId, msgs);
  }

  broadcastToRift(msg: string, excludeId?: string) {
    if (!this.rift) return;
    for (const pid of this.rift.participants) {
      if (pid !== excludeId) {
        this.addMessage(pid, msg);
      }
    }
  }

  broadcastToAll(msg: string, excludeId?: string) {
    for (const pid of this.players.keys()) {
      if (pid !== excludeId) {
        this.addMessage(pid, msg);
      }
    }
  }

  movePlayer(id: string, dx: number, dy: number): boolean {
    const player = this.players.get(id);
    if (!player || player.dead) return false;

    const level = this.getActiveLevel(id);
    if (!level) return false;

    const depth = this.getEffectiveDepth(id);
    const inRift = this.isInRift(id);
    const newX = player.pos.x + dx;
    const newY = player.pos.y + dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return false;

    const tile = level.map[newY][newX];
    if (!tile.walkable) return false;

    if (inRift) {
      const otherPlayer = Array.from(this.players.entries()).find(
        ([pid, p]) => pid !== id && !p.dead && this.isInRift(pid) && p.pos.x === newX && p.pos.y === newY
      );
      if (otherPlayer) {
        this.addMessage(id, `You pass by ${otherPlayer[1].name}.`);
        this.addMessage(otherPlayer[0], `${player.name} passes by you.`);
      }
    }

    const entityIdx = level.entities.findIndex(e => e.pos.x === newX && e.pos.y === newY);
    if (entityIdx >= 0) {
      const entity = level.entities[entityIdx];

      if (entity.type === 'enemy') {
        const dmg = Math.floor(Math.random() * 5) + 1 + Math.floor(depth * 0.5);
        entity.hp! -= dmg;
        player.stats.damageDealt += dmg;
        this.addMessage(id, `You hit the ${entity.name} for ${dmg} damage!`);

        if (entity.hp! <= 0) {
          player.stats.kills++;
          player.maxHp += 2;
          player.hp = Math.min(player.hp + 2, player.maxHp);
          this.addMessage(id, `You killed the ${entity.name}. [+2 Max HP]`);
          level.entities.splice(entityIdx, 1);
        } else {
          const enemyDmg = Math.floor(Math.random() * 3) + 1 + Math.floor(depth * 0.3);
          player.hp -= enemyDmg;
          player.stats.damageTaken += enemyDmg;
          this.addMessage(id, `The ${entity.name} hits you for ${enemyDmg}!`);

          if (player.hp <= 0) {
            player.hp = 0;
            player.dead = true;
            player.stats.killedBy = entity.name;
            this.addMessage(id, `You have been slain by the ${entity.name}...`);
          }
        }
        this.updatePlayerFOV(id);
        return true;
      } else if (entity.type === 'item') {
        this.addMessage(id, `You picked up a ${entity.name}.`);
        player.stats.itemsCollected++;
        if (entity.name === 'Health Potion') {
          const heal = Math.min(5, player.maxHp - player.hp);
          if (heal > 0) {
            player.hp += heal;
            this.addMessage(id, `Restored ${heal} HP.`);
          }
        } else if (entity.name === 'Food') {
          const heal = Math.min(3, player.maxHp - player.hp);
          if (heal > 0) {
            player.hp += heal;
            this.addMessage(id, `The food restores ${heal} HP.`);
          }
        } else if (entity.name === 'Healing Herb') {
          const heal = Math.min(8, player.maxHp - player.hp);
          if (heal > 0) {
            player.hp += heal;
            this.addMessage(id, `The herb restores ${heal} HP!`);
          }
        }
        level.entities.splice(entityIdx, 1);
        player.pos = { x: newX, y: newY };
      } else if (entity.type === 'stairs_down') {
        if (inRift) {
          this.addMessage(id, "The dimension gate prevents you from descending.");
          return true;
        }
        const currentDepth = this.playerDepths.get(id)!;
        const newDepth = currentDepth + 1;
        this.addMessage(id, `You descend to depth ${newDepth}...`);

        this.playerDepths.set(id, newDepth);
        if (newDepth > player.stats.deepestDepth) {
          player.stats.deepestDepth = newDepth;
        }
        const newLevel = this.getOrCreatePlayerLevel(id, newDepth);
        player.pos = newLevel.getRandomEmptyPos();
        player.explored = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
          player.explored.push(new Array(MAP_WIDTH).fill(false));
        }
        this.updatePlayerFOV(id);
        return true;
      }
    } else {
      player.pos = { x: newX, y: newY };
    }

    player.stats.stepsWalked++;
    this.updatePlayerFOV(id);
    return true;
  }

  tickEnemies(): Set<string> {
    const affectedPlayers = new Set<string>();
    const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    const levelToPlayers = new Map<DungeonLevel, { id: string; player: PlayerState }[]>();

    for (const [pid, player] of this.players) {
      if (player.dead) continue;
      const level = this.getActiveLevel(pid);
      if (!level) continue;

      if (!levelToPlayers.has(level)) {
        levelToPlayers.set(level, []);
      }
      levelToPlayers.get(level)!.push({ id: pid, player });
    }

    for (const [level, playerInfos] of levelToPlayers) {
      const isRiftLevel = this.rift && level === this.rift.level;
      const effectiveDepth = isRiftLevel ? this.rift!.depth : level.depth;

      const injuredInRift = isRiftLevel
        ? playerInfos.filter(pi => !pi.player.dead && pi.player.hp < pi.player.maxHp)
        : [];

      for (const entity of level.entities) {
        if (entity.type !== 'enemy') continue;
        if (entity.char === entity.char.toLowerCase()) continue;

        const hasInjuredNearby = injuredInRift.length > 0;
        const actChance = hasInjuredNearby ? 0.95 : (isRiftLevel ? 0.5 : 0.3);
        if (Math.random() > actChance) continue;

        let sortedDirs: [number, number][];
        if (hasInjuredNearby) {
          let closest = injuredInRift[0];
          let closestDist = Math.abs(entity.pos.x - closest.player.pos.x) + Math.abs(entity.pos.y - closest.player.pos.y);
          for (const pi of injuredInRift) {
            const dist = Math.abs(entity.pos.x - pi.player.pos.x) + Math.abs(entity.pos.y - pi.player.pos.y);
            if (dist < closestDist) {
              closest = pi;
              closestDist = dist;
            }
          }
          const tx = closest.player.pos.x;
          const ty = closest.player.pos.y;
          sortedDirs = [...dirs].sort((a, b) => {
            const distA = Math.abs(entity.pos.x + a[0] - tx) + Math.abs(entity.pos.y + a[1] - ty);
            const distB = Math.abs(entity.pos.x + b[0] - tx) + Math.abs(entity.pos.y + b[1] - ty);
            return distA - distB;
          });

          if (Math.random() < 0.4) {
            for (const [dx2, dy2] of sortedDirs) {
              const nx2 = entity.pos.x + dx2;
              const ny2 = entity.pos.y + dy2;
              if (nx2 < 0 || nx2 >= MAP_WIDTH || ny2 < 0 || ny2 >= MAP_HEIGHT) continue;
              if (!level.map[ny2][nx2].walkable) continue;
              const blocked2 = level.entities.some(e => e !== entity && e.pos.x === nx2 && e.pos.y === ny2);
              if (blocked2) continue;
              const hitP = playerInfos.find(pi => !pi.player.dead && pi.player.pos.x === nx2 && pi.player.pos.y === ny2);
              if (hitP) {
                const { id: pid2, player: p2 } = hitP;
                const dmg2 = Math.floor(Math.random() * 3) + 1 + Math.floor(effectiveDepth * 0.3);
                p2.hp -= dmg2;
                p2.stats.damageTaken += dmg2;
                this.addMessage(pid2, `The ${entity.name} lunges at you for ${dmg2}!`);
                if (p2.hp <= 0) {
                  p2.hp = 0;
                  p2.dead = true;
                  p2.stats.killedBy = entity.name;
                  this.addMessage(pid2, `You have been slain by the ${entity.name}...`);
                }
                for (const pi of playerInfos) affectedPlayers.add(pi.id);
              } else {
                entity.pos = { x: nx2, y: ny2 };
                for (const pi of playerInfos) affectedPlayers.add(pi.id);
              }
              break;
            }
          }
        } else {
          sortedDirs = [...dirs].sort(() => Math.random() - 0.5);
        }

        for (const [dx, dy] of sortedDirs) {
          const nx = entity.pos.x + dx;
          const ny = entity.pos.y + dy;

          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
          if (!level.map[ny][nx].walkable) continue;

          const blocked = level.entities.some(e => e !== entity && e.pos.x === nx && e.pos.y === ny);
          if (blocked) continue;

          const hitPlayerInfo = playerInfos.find(
            pi => !pi.player.dead && pi.player.pos.x === nx && pi.player.pos.y === ny
          );

          if (hitPlayerInfo) {
            const { id: pid, player: p } = hitPlayerInfo;
            const dmg = Math.floor(Math.random() * 3) + 1 + Math.floor(effectiveDepth * 0.3);
            p.hp -= dmg;
            p.stats.damageTaken += dmg;
            this.addMessage(pid, `The ${entity.name} attacks you for ${dmg}!`);

            if (p.hp <= 0) {
              p.hp = 0;
              p.dead = true;
              p.stats.killedBy = entity.name;
              this.addMessage(pid, `You have been slain by the ${entity.name}...`);
            }
            for (const pi of playerInfos) {
              affectedPlayers.add(pi.id);
            }
            break;
          }

          entity.pos = { x: nx, y: ny };
          for (const pi of playerInfos) {
            affectedPlayers.add(pi.id);
          }
          break;
        }
      }

      for (const entity of level.entities) {
        if (entity.type !== 'enemy') continue;
        if (entity.char !== entity.char.toLowerCase()) continue;
        if (entity.hp <= 0) continue;

        for (const { id: pid, player: p } of playerInfos) {
          if (p.dead) continue;
          const dist = Math.abs(entity.pos.x - p.pos.x) + Math.abs(entity.pos.y - p.pos.y);
          if (dist >= 1 && dist <= 3) {
            const drain = Math.floor(Math.random() * 3) + 1;
            p.hp -= drain;
            p.stats.damageTaken += drain;
            this.addMessage(pid, `The ${entity.name} drains ${drain} HP from you!`);
            if (p.hp <= 0) {
              p.hp = 0;
              p.dead = true;
              p.stats.killedBy = entity.name;
              this.addMessage(pid, `You have been drained of life by the ${entity.name}...`);
            }
            affectedPlayers.add(pid);
          }
        }
      }
    }

    return affectedPlayers;
  }

  scheduleNextRift() {
    if (this.riftTimer) clearTimeout(this.riftTimer);
    const delay = (90 + Math.random() * 90) * 1000;
    this.riftTimer = setTimeout(() => {
      this.initiateRiftWarning();
    }, delay);
    log(`Next dimension rift in ${Math.round(delay / 1000)}s`, "game");
  }

  initiateRiftWarning(): string[] {
    const eligible = Array.from(this.players.entries())
      .filter(([_, p]) => !p.dead)
      .map(([id]) => id);

    if (eligible.length < 1) {
      this.scheduleNextRift();
      return [];
    }

    this.riftWarning = {
      participants: new Set(eligible),
      ticksLeft: 6
    };

    for (const pid of eligible) {
      this.addMessage(pid, "");
      this.addMessage(pid, ">>> A DIMENSION GATE IS FORMING... <<<");
      this.addMessage(pid, ">>> Worlds are merging. Prepare yourself! <<<");
    }

    log(`Dimension rift warning issued to ${eligible.length} players`, "game");
    this.onRiftEvent?.(eligible);
    return eligible;
  }

  openRift(): string[] {
    if (!this.riftWarning) return [];

    const participants = new Set<string>();
    for (const pid of this.riftWarning.participants) {
      const player = this.players.get(pid);
      if (player && !player.dead) {
        participants.add(pid);
      }
    }
    this.riftWarning = null;

    if (participants.size < 1) {
      this.scheduleNextRift();
      return [];
    }

    let totalDepth = 0;
    let count = 0;
    for (const pid of participants) {
      totalDepth += this.playerDepths.get(pid) || 1;
      count++;
    }
    const avgDepth = Math.max(1, Math.round(totalDepth / count));

    const riftLevel = new DungeonLevel(avgDepth, 2, false);

    const preRiftState = new Map<string, { depth: number; pos: Position; explored: boolean[][] }>();
    for (const pid of participants) {
      const player = this.players.get(pid)!;
      const depth = this.playerDepths.get(pid)!;
      preRiftState.set(pid, {
        depth,
        pos: { ...player.pos },
        explored: player.explored.map(row => [...row])
      });

      player.pos = riftLevel.getRandomEmptyPos();
      player.explored = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        player.explored.push(new Array(MAP_WIDTH).fill(false));
      }
    }

    const duration = 20 + Math.floor(Math.random() * 31);

    this.rift = {
      level: riftLevel,
      participants,
      turnsRemaining: duration,
      depth: avgDepth,
      preRiftState
    };

    for (const pid of participants) {
      this.updatePlayerFOV(pid);
      this.addMessage(pid, "");
      this.addMessage(pid, ">>> THE DIMENSION GATE HAS OPENED! <<<");
      if (participants.size > 1) {
        this.addMessage(pid, `>>> ${participants.size} adventurers share this realm! <<<`);
      }
      this.addMessage(pid, ">>> Beware: more monsters prowl these merged worlds! <<<");
    }

    log(`Dimension rift opened with ${participants.size} participants for ${duration} ticks at depth ${avgDepth}`, "game");
    return Array.from(participants);
  }

  closeRift(): string[] {
    if (!this.rift) return [];

    const affected: string[] = [];

    for (const pid of this.rift.participants) {
      const player = this.players.get(pid);
      if (!player) continue;

      affected.push(pid);

      const saved = this.rift.preRiftState.get(pid);
      if (saved && !player.dead) {
        this.playerDepths.set(pid, saved.depth);
        player.pos = saved.pos;
        player.explored = saved.explored;
        this.updatePlayerFOV(pid);
      } else if (player.dead) {
        continue;
      }

      this.addMessage(pid, "");
      this.addMessage(pid, ">>> The dimension gate closes... <<<");
      this.addMessage(pid, ">>> You return to your own world. <<<");
    }

    this.rift = null;
    this.scheduleNextRift();

    log("Dimension rift closed", "game");
    return affected;
  }

  removeFromRift(playerId: string) {
    if (!this.rift) return;

    const player = this.players.get(playerId);
    const saved = this.rift.preRiftState.get(playerId);
    if (player && saved && !player.dead) {
      this.playerDepths.set(playerId, saved.depth);
      player.pos = saved.pos;
      player.explored = saved.explored;
      this.updatePlayerFOV(playerId);
      this.addMessage(playerId, ">>> You are pulled back to your own dimension. <<<");
    }

    this.rift.participants.delete(playerId);
    this.rift.preRiftState.delete(playerId);

    if (this.rift.participants.size === 0) {
      this.rift = null;
      this.scheduleNextRift();
      log("Dimension rift closed (no participants left)", "game");
    }
  }

  tickRift(): string[] {
    if (this.riftWarning) {
      this.riftWarning.ticksLeft--;
      if (this.riftWarning.ticksLeft <= 0) {
        return this.openRift();
      }
      return Array.from(this.riftWarning.participants);
    }

    if (this.rift) {
      this.rift.turnsRemaining--;

      if (this.rift.turnsRemaining === 10) {
        this.broadcastToRift(">>> The dimension gate flickers... it will close soon! <<<");
        return Array.from(this.rift.participants);
      }
      if (this.rift.turnsRemaining === 3) {
        this.broadcastToRift(">>> The dimension gate is collapsing! <<<");
        return Array.from(this.rift.participants);
      }

      if (this.rift.turnsRemaining <= 0) {
        return this.closeRift();
      }
    }

    return [];
  }

  updatePlayerFOV(id: string) {
    const player = this.players.get(id);
    if (!player) return;

    const level = this.getActiveLevel(id);
    if (!level) return;

    const px = player.pos.x;
    const py = player.pos.y;

    for (let i = 0; i < 360; i += 3) {
      const rad = i * Math.PI / 180;
      const ddx = Math.cos(rad);
      const ddy = Math.sin(rad);

      let cx = px;
      let cy = py;

      for (let r = 0; r < FOV_RADIUS; r++) {
        const rx = Math.round(cx);
        const ry = Math.round(cy);

        if (rx < 0 || rx >= MAP_WIDTH || ry < 0 || ry >= MAP_HEIGHT) break;

        player.explored[ry][rx] = true;

        if (!level.map[ry][rx].walkable) break;

        cx += ddx;
        cy += ddy;
      }
    }
  }

  getStateForPlayer(id: string) {
    const player = this.players.get(id);
    if (!player) return null;

    const level = this.getActiveLevel(id);
    if (!level) return null;

    const depth = this.getEffectiveDepth(id);
    const messages = this.messageLog.get(id) || [];
    const inRift = this.isInRift(id);
    const riftWarningActive = this.isRiftWarningActive(id);

    const visible = this.computeVisible(player.pos, level);

    let otherPlayers: { name: string; pos: Position; char: string; color: string; visible: boolean }[] = [];
    if (inRift && this.rift) {
      otherPlayers = Array.from(this.players.entries())
        .filter(([pid, p]) => pid !== id && !p.dead && this.rift!.participants.has(pid))
        .map(([_, p]) => ({
          name: p.name,
          pos: p.pos,
          char: '@',
          color: 'text-secondary',
          visible: visible[p.pos.y]?.[p.pos.x] || false
        }));
    }

    const visibleEntities = level.entities
      .filter(e => visible[e.pos.y][e.pos.x])
      .map(e => ({ ...e }));

    const onlineCount = this.players.size;

    return {
      map: level.map.map((row, y) => row.map((tile, x) => ({
        char: tile.char,
        walkable: tile.walkable,
        visible: visible[y][x],
        explored: player.explored[y][x]
      }))),
      player: {
        pos: player.pos,
        hp: player.hp,
        maxHp: player.maxHp,
        name: player.name
      },
      entities: visibleEntities,
      otherPlayers,
      dead: player.dead,
      stats: player.stats,
      messages,
      depth,
      onlineCount,
      riftActive: inRift,
      riftWarning: riftWarningActive,
      riftTurnsLeft: inRift && this.rift ? this.rift.turnsRemaining : undefined
    };
  }

  computeVisible(pos: Position, level: DungeonLevel): boolean[][] {
    const visible: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      visible.push(new Array(MAP_WIDTH).fill(false));
    }

    for (let i = 0; i < 360; i += 3) {
      const rad = i * Math.PI / 180;
      const ddx = Math.cos(rad);
      const ddy = Math.sin(rad);
      let cx = pos.x;
      let cy = pos.y;

      for (let r = 0; r < FOV_RADIUS; r++) {
        const rx = Math.round(cx);
        const ry = Math.round(cy);
        if (rx < 0 || rx >= MAP_WIDTH || ry < 0 || ry >= MAP_HEIGHT) break;
        visible[ry][rx] = true;
        if (!level.map[ry][rx].walkable) break;
        cx += ddx;
        cy += ddy;
      }
    }

    return visible;
  }
}
