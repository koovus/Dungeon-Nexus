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
];

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class DungeonLevel {
  map: Tile[][] = [];
  entities: Entity[] = [];
  depth: number;

  constructor(depth: number) {
    this.depth = depth;
    this.generateRoomBasedMap();
    this.placeStairs();
    this.spawnEntities(depth);
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

  spawnEntities(depth: number) {
    const enemyCount = 10 + depth * 3;
    const itemCount = 12 + depth * 2;

    for (let i = 0; i < enemyCount; i++) {
      const def = DEFAULT_ENEMIES[Math.floor(Math.random() * DEFAULT_ENEMIES.length)];
      const scaledHp = Math.floor(def.hp * (1 + (depth - 1) * 0.3));
      this.entities.push({
        id: `e_${depth}_${i}`,
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
        id: `i_${depth}_${i}`,
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
  levels: Map<number, DungeonLevel> = new Map();
  players: Map<string, PlayerState> = new Map();
  playerDepths: Map<string, number> = new Map();
  messageLog: Map<string, string[]> = new Map();

  constructor() {
    this.getOrCreateLevel(1);
    log("Game world initialized", "game");
  }

  getOrCreateLevel(depth: number): DungeonLevel {
    if (!this.levels.has(depth)) {
      this.levels.set(depth, new DungeonLevel(depth));
      log(`Generated dungeon level ${depth}`, "game");
    }
    return this.levels.get(depth)!;
  }

  addPlayer(id: string, name: string, useOpenSpawn = false): PlayerState {
    const depth = 1;
    const level = this.getOrCreateLevel(depth);
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
      "Find the > stairs to descend deeper."
    ]);

    this.updatePlayerFOV(id);
    this.broadcastToDepth(depth, `${name} has entered the dungeon.`, id);
    log(`Player ${name} (${id}) joined at depth ${depth}`, "game");

    return player;
  }

  respawnPlayer(id: string) {
    const player = this.players.get(id);
    if (!player) return;

    player.dead = false;
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
    const level = this.getOrCreateLevel(depth);
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
    const depth = this.playerDepths.get(id);
    if (player && depth) {
      this.broadcastToDepth(depth, `${player.name} has left the dungeon.`, id);
      log(`Player ${player.name} (${id}) left`, "game");
    }
    this.players.delete(id);
    this.playerDepths.delete(id);
    this.messageLog.delete(id);
  }

  addMessage(playerId: string, msg: string) {
    const msgs = this.messageLog.get(playerId) || [];
    msgs.push(msg);
    if (msgs.length > 50) msgs.shift();
    this.messageLog.set(playerId, msgs);
  }

  broadcastToDepth(depth: number, msg: string, excludeId?: string) {
    for (const [pid, d] of this.playerDepths.entries()) {
      if (d === depth && pid !== excludeId) {
        this.addMessage(pid, msg);
      }
    }
  }

  movePlayer(id: string, dx: number, dy: number): boolean {
    const player = this.players.get(id);
    const depth = this.playerDepths.get(id);
    if (!player || depth === undefined) return false;

    const level = this.getOrCreateLevel(depth);
    const newX = player.pos.x + dx;
    const newY = player.pos.y + dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return false;

    const tile = level.map[newY][newX];
    if (!tile.walkable) return false;

    if (player.dead) return false;

    const otherPlayer = Array.from(this.players.entries()).find(
      ([pid, p]) => pid !== id && this.playerDepths.get(pid) === depth && p.pos.x === newX && p.pos.y === newY
    );
    if (otherPlayer) {
      this.addMessage(id, `You pass by ${otherPlayer[1].name}.`);
      this.addMessage(otherPlayer[0], `${player.name} passes by you.`);
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
        }
        level.entities.splice(entityIdx, 1);
        player.pos = { x: newX, y: newY };
      } else if (entity.type === 'stairs_down') {
        const newDepth = depth + 1;
        this.addMessage(id, `You descend to depth ${newDepth}...`);
        this.broadcastToDepth(depth, `${player.name} descended deeper.`, id);

        this.playerDepths.set(id, newDepth);
        if (newDepth > player.stats.deepestDepth) {
          player.stats.deepestDepth = newDepth;
        }
        const newLevel = this.getOrCreateLevel(newDepth);
        player.pos = newLevel.getRandomEmptyPos();
        player.explored = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
          player.explored.push(new Array(MAP_WIDTH).fill(false));
        }
        this.updatePlayerFOV(id);
        this.broadcastToDepth(newDepth, `${player.name} arrived from above.`, id);
        return true;
      }
    } else {
      player.pos = { x: newX, y: newY };
    }

    player.stats.stepsWalked++;
    this.updatePlayerFOV(id);
    return true;
  }

  updatePlayerFOV(id: string) {
    const player = this.players.get(id);
    const depth = this.playerDepths.get(id);
    if (!player || depth === undefined) return;

    const level = this.getOrCreateLevel(depth);
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
    const depth = this.playerDepths.get(id);
    if (!player || depth === undefined) return null;

    const level = this.getOrCreateLevel(depth);
    const messages = this.messageLog.get(id) || [];

    const visible = this.computeVisible(player.pos, level);

    const otherPlayers = Array.from(this.players.entries())
      .filter(([pid, _]) => pid !== id && this.playerDepths.get(pid) === depth)
      .map(([_, p]) => ({
        name: p.name,
        pos: p.pos,
        char: '@',
        color: 'text-secondary',
        visible: visible[p.pos.y][p.pos.x]
      }));

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
      onlineCount
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
