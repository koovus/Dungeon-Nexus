import { GameWorld, MAP_WIDTH, MAP_HEIGHT, type Position } from "./game";
import { log } from "./index";

const AI_NAMES = [
  "Gandalf_AI", "Conan_AI", "Elric_AI", "Bilbo_AI",
  "Aragorn_AI", "Merlin_AI", "Drizzt_AI", "Raistlin_AI"
];

export class AIBot {
  id: string;
  world: GameWorld;
  target: Position | null = null;
  tickInterval: ReturnType<typeof setInterval> | null = null;
  stuckCounter = 0;
  lastPos: Position = { x: -1, y: -1 };
  onChange: (() => void) | null = null;

  constructor(world: GameWorld) {
    this.world = world;
    this.id = `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
    this.world.addPlayer(this.id, name);
    log(`AI Bot ${name} (${this.id}) spawned`, "ai");
  }

  start(onChange?: () => void) {
    this.onChange = onChange || null;
    this.tickInterval = setInterval(() => this.tick(), 400);
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
    const visible = this.world.computeVisible(player.pos, level);

    if (player.pos.x === this.lastPos.x && player.pos.y === this.lastPos.y) {
      this.stuckCounter++;
    } else {
      this.stuckCounter = 0;
    }
    this.lastPos = { ...player.pos };

    if (this.stuckCounter > 5) {
      this.target = null;
      this.stuckCounter = 0;
      const { dx, dy } = this.randomDirection();
      this.world.movePlayer(this.id, dx, dy);
      this.onChange?.();
      return;
    }

    if (player.hp < player.maxHp * 0.3) {
      const potion = level.entities.find(e =>
        e.type === 'item' && e.name === 'Health Potion' && visible[e.pos.y][e.pos.x]
      );
      if (potion) {
        this.target = potion.pos;
      }
    }

    if (!this.target || this.stuckCounter > 3) {
      const stairs = level.entities.find(e =>
        e.type === 'stairs_down' && visible[e.pos.y][e.pos.x]
      );

      const nearbyEnemy = level.entities.find(e =>
        e.type === 'enemy' && visible[e.pos.y][e.pos.x] &&
        Math.abs(e.pos.x - player.pos.x) <= 3 && Math.abs(e.pos.y - player.pos.y) <= 3
      );

      const nearbyItem = level.entities.find(e =>
        e.type === 'item' && visible[e.pos.y][e.pos.x] &&
        Math.abs(e.pos.x - player.pos.x) <= 5 && Math.abs(e.pos.y - player.pos.y) <= 5
      );

      if (nearbyEnemy && player.hp > player.maxHp * 0.3) {
        this.target = nearbyEnemy.pos;
      } else if (nearbyItem) {
        this.target = nearbyItem.pos;
      } else if (stairs && Math.random() < 0.3) {
        this.target = stairs.pos;
      } else {
        this.target = this.findUnexploredTarget(player);
      }
    }

    if (this.target) {
      const dx = Math.sign(this.target.x - player.pos.x);
      const dy = Math.sign(this.target.y - player.pos.y);

      if (dx === 0 && dy === 0) {
        this.target = null;
        return;
      }

      if (Math.random() < 0.5 && dx !== 0) {
        this.world.movePlayer(this.id, dx, 0);
      } else if (dy !== 0) {
        this.world.movePlayer(this.id, 0, dy);
      } else {
        this.world.movePlayer(this.id, dx, 0);
      }
    } else {
      const { dx, dy } = this.randomDirection();
      this.world.movePlayer(this.id, dx, dy);
    }

    this.onChange?.();
  }

  findUnexploredTarget(player: { pos: Position; explored: boolean[][] }): Position | null {
    let bestDist = Infinity;
    let best: Position | null = null;

    const depth = this.world.playerDepths.get(this.id);
    if (depth === undefined) return null;
    const level = this.world.getOrCreateLevel(depth);

    for (let y = 0; y < MAP_HEIGHT; y += 2) {
      for (let x = 0; x < MAP_WIDTH; x += 2) {
        if (!player.explored[y][x] && level.map[y][x].walkable) {
          const dist = Math.abs(x - player.pos.x) + Math.abs(y - player.pos.y);
          if (dist < bestDist && dist > 3) {
            bestDist = dist;
            best = { x, y };
          }
        }
      }
    }

    if (!best) {
      return {
        x: Math.floor(Math.random() * MAP_WIDTH),
        y: Math.floor(Math.random() * MAP_HEIGHT)
      };
    }

    return best;
  }

  randomDirection() {
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }
}
