import { GameWorld, MAP_WIDTH, MAP_HEIGHT, type Position } from "./game";
import { log } from "./index";

const AI_NAMES = [
  "Gandalf_AI", "Conan_AI", "Elric_AI", "Bilbo_AI",
  "Aragorn_AI", "Merlin_AI", "Drizzt_AI", "Raistlin_AI"
];

export class AIBot {
  id: string;
  name: string;
  world: GameWorld;
  target: Position | null = null;
  tickInterval: ReturnType<typeof setInterval> | null = null;
  stuckCounter = 0;
  lastPos: Position = { x: -1, y: -1 };
  onChange: (() => void) | null = null;
  recentPositions: Position[] = [];
  tickSpeed: number;

  constructor(world: GameWorld, tickSpeed = 400) {
    this.world = world;
    this.tickSpeed = tickSpeed;
    this.id = `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
    this.world.addPlayer(this.id, this.name, true);
    log(`AI Bot ${this.name} (${this.id}) spawned`, "ai");
  }

  start(onChange?: () => void) {
    this.onChange = onChange || null;
    this.tickInterval = setInterval(() => this.tick(), this.tickSpeed);
  }

  setSpeed(ms: number) {
    this.tickSpeed = ms;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = setInterval(() => this.tick(), this.tickSpeed);
    }
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = null;
    this.world.removePlayer(this.id);
    log(`AI Bot ${this.id} removed`, "ai");
  }

  tick() {
    const player = this.world.players.get(this.id);
    const depth = this.world.playerDepths.get(this.id);
    if (!player || depth === undefined) return;

    const level = this.world.getOrCreateLevel(depth);

    this.recentPositions.push({ ...player.pos });
    if (this.recentPositions.length > 12) this.recentPositions.shift();

    if (player.pos.x === this.lastPos.x && player.pos.y === this.lastPos.y) {
      this.stuckCounter++;
    } else {
      this.stuckCounter = 0;
    }
    this.lastPos = { ...player.pos };

    if (this.stuckCounter > 2) {
      this.target = null;
      this.stuckCounter = 0;
      this.escapeCorner(player.pos, level);
      this.onChange?.();
      return;
    }

    const isOscillating = this.recentPositions.length >= 8 && this.detectOscillation();
    if (isOscillating) {
      this.target = null;
      this.escapeCorner(player.pos, level);
      this.recentPositions = [];
      this.onChange?.();
      return;
    }

    const visible = this.world.computeVisible(player.pos, level);

    if (player.hp < player.maxHp * 0.3) {
      const potion = level.entities.find(e =>
        e.type === 'item' && e.name === 'Health Potion' && visible[e.pos.y][e.pos.x]
      );
      if (potion) {
        this.target = potion.pos;
      }
    }

    if (!this.target) {
      const nearbyEnemy = level.entities.find(e =>
        e.type === 'enemy' && visible[e.pos.y][e.pos.x] &&
        Math.abs(e.pos.x - player.pos.x) <= 3 && Math.abs(e.pos.y - player.pos.y) <= 3
      );

      const nearbyItem = level.entities.find(e =>
        e.type === 'item' && visible[e.pos.y][e.pos.x] &&
        Math.abs(e.pos.x - player.pos.x) <= 5 && Math.abs(e.pos.y - player.pos.y) <= 5
      );

      const stairs = level.entities.find(e =>
        e.type === 'stairs_down' && visible[e.pos.y][e.pos.x]
      );

      if (nearbyEnemy && player.hp > player.maxHp * 0.3) {
        this.target = nearbyEnemy.pos;
      } else if (nearbyItem) {
        this.target = nearbyItem.pos;
      } else if (stairs && Math.random() < 0.3) {
        this.target = stairs.pos;
      } else {
        this.target = this.findUnexploredTarget(player, level);
      }
    }

    if (this.target) {
      const moved = this.moveToward(player.pos, this.target, level);
      if (!moved) {
        this.target = null;
        this.escapeCorner(player.pos, level);
      }

      if (this.target && player.pos.x === this.target.x && player.pos.y === this.target.y) {
        this.target = null;
      }
    } else {
      this.escapeCorner(player.pos, level);
    }

    this.onChange?.();
  }

  detectOscillation(): boolean {
    if (this.recentPositions.length < 8) return false;
    const last8 = this.recentPositions.slice(-8);
    const uniquePositions = new Set(last8.map(p => `${p.x},${p.y}`));
    return uniquePositions.size <= 3;
  }

  moveToward(from: Position, to: Position, level: any): boolean {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    if (dx === 0 && dy === 0) return false;

    const moves: [number, number][] = [];

    if (dx !== 0 && dy !== 0) {
      if (Math.random() < 0.5) {
        moves.push([dx, 0], [0, dy], [dx, dy]);
      } else {
        moves.push([0, dy], [dx, 0], [dx, dy]);
      }
    } else if (dx !== 0) {
      moves.push([dx, 0], [dx, 1], [dx, -1], [0, 1], [0, -1]);
    } else {
      moves.push([0, dy], [1, dy], [-1, dy], [1, 0], [-1, 0]);
    }

    for (const [mx, my] of moves) {
      const nx = from.x + mx;
      const ny = from.y + my;
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && level.map[ny][nx].walkable) {
        const isRecent = this.recentPositions.slice(-4).some(p => p.x === nx && p.y === ny);
        if (!isRecent || moves.indexOf([mx, my]) === moves.length - 1) {
          this.world.movePlayer(this.id, mx, my);
          return true;
        }
      }
    }

    for (const [mx, my] of moves) {
      const nx = from.x + mx;
      const ny = from.y + my;
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && level.map[ny][nx].walkable) {
        this.world.movePlayer(this.id, mx, my);
        return true;
      }
    }

    return false;
  }

  escapeCorner(pos: Position, level: any) {
    const dirs: [number, number][] = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    let bestDir: [number, number] | null = null;
    let bestOpenness = -1;

    for (const [dx, dy] of dirs) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
      if (!level.map[ny][nx].walkable) continue;

      const isRecent = this.recentPositions.slice(-4).some(p => p.x === nx && p.y === ny);

      let openness = 0;
      for (const [ddx, ddy] of dirs) {
        const nnx = nx + ddx;
        const nny = ny + ddy;
        if (nnx >= 0 && nnx < MAP_WIDTH && nny >= 0 && nny < MAP_HEIGHT && level.map[nny][nnx].walkable) {
          openness++;
        }
      }

      if (isRecent) openness -= 3;

      if (openness > bestOpenness) {
        bestOpenness = openness;
        bestDir = [dx, dy];
      }
    }

    if (bestDir) {
      this.world.movePlayer(this.id, bestDir[0], bestDir[1]);
    } else {
      const walkable = dirs.filter(([dx, dy]) => {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        return nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && level.map[ny][nx].walkable;
      });
      if (walkable.length > 0) {
        const [dx, dy] = walkable[Math.floor(Math.random() * walkable.length)];
        this.world.movePlayer(this.id, dx, dy);
      }
    }
  }

  findUnexploredTarget(player: { pos: Position; explored: boolean[][] }, level: any): Position | null {
    let closest: Position | null = null;
    let closestDist = Infinity;

    for (let y = 1; y < MAP_HEIGHT - 1; y += 2) {
      for (let x = 1; x < MAP_WIDTH - 1; x += 2) {
        if (!player.explored[y][x] && level.map[y][x].walkable) {
          const dist = Math.abs(x - player.pos.x) + Math.abs(y - player.pos.y);
          if (dist < closestDist && dist > 2) {
            closestDist = dist;
            closest = { x, y };
          }
        }
      }
    }

    if (!closest) {
      return level.getCentralEmptyPos();
    }

    return closest;
  }
}
