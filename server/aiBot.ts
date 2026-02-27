import { GameWorld, MAP_WIDTH, MAP_HEIGHT, type Position, type DungeonLevel } from "./game";
import { log } from "./index";

const AI_NAMES = [
  "Gandalf_AI", "Conan_AI", "Elric_AI", "Bilbo_AI",
  "Aragorn_AI", "Merlin_AI", "Drizzt_AI", "Raistlin_AI"
];

const DIRS: [number, number][] = [
  [0, -1], [0, 1], [-1, 0], [1, 0]
];

function bfsPath(from: Position, to: Position, level: DungeonLevel, stopAdjacent = false, maxSteps = 200): Position[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (stopAdjacent && Math.abs(from.x - to.x) <= 1 && Math.abs(from.y - to.y) <= 1) return [to];

  const entityPositions = new Set<string>();
  for (const e of level.entities) {
    if (e.type === 'enemy') entityPositions.add(`${e.pos.x},${e.pos.y}`);
  }
  const toKey = `${to.x},${to.y}`;
  entityPositions.delete(toKey);

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: Position[] = [from];
  const key = (p: Position) => `${p.x},${p.y}`;

  visited.add(key(from));

  let steps = 0;
  while (queue.length > 0 && steps < maxSteps) {
    const current = queue.shift()!;
    steps++;

    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = `${nx},${ny}`;

      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
      if (!level.map[ny][nx].walkable) continue;
      if (visited.has(nk)) continue;
      if (entityPositions.has(nk) && nk !== toKey) continue;

      visited.add(nk);
      parent.set(nk, key(current));

      const isGoal = stopAdjacent
        ? (Math.abs(nx - to.x) <= 1 && Math.abs(ny - to.y) <= 1)
        : (nx === to.x && ny === to.y);

      if (isGoal) {
        const path: Position[] = [];
        let ck = nk;
        while (ck !== key(from)) {
          const [px, py] = ck.split(',').map(Number);
          path.unshift({ x: px, y: py });
          ck = parent.get(ck)!;
        }
        return path;
      }

      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

function bfsToUnexplored(from: Position, explored: boolean[][], level: DungeonLevel, maxSteps = 300): Position | null {
  const visited = new Set<string>();
  const queue: Position[] = [from];
  visited.add(`${from.x},${from.y}`);

  let steps = 0;
  while (queue.length > 0 && steps < maxSteps) {
    const current = queue.shift()!;
    steps++;

    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = `${nx},${ny}`;

      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
      if (!level.map[ny][nx].walkable) continue;
      if (visited.has(nk)) continue;

      visited.add(nk);

      if (!explored[ny][nx]) {
        return { x: nx, y: ny };
      }

      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

export class AIBot {
  id: string;
  name: string;
  world: GameWorld;
  tickInterval: ReturnType<typeof setInterval> | null = null;
  onChange: (() => void) | null = null;
  tickSpeed: number;
  path: Position[] = [];
  currentGoal: string = 'explore';
  pathRecalcCounter = 0;

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

    if (player.dead) {
      this.world.respawnPlayer(this.id);
      this.path = [];
      this.currentGoal = 'explore';
      return;
    }

    const level = this.world.getOrCreateLevel(depth);
    const visible = this.world.computeVisible(player.pos, level);

    const decision = this.decide(player, level, visible);
    const needsRepath = this.path.length === 0
      || this.currentGoal !== decision.goal
      || this.pathRecalcCounter++ > 5;

    if (decision.target && needsRepath) {
      const stopAdj = decision.goal === 'fight';
      const newPath = bfsPath(player.pos, decision.target, level, stopAdj);
      if (newPath && newPath.length > 0) {
        this.path = newPath;
        this.currentGoal = decision.goal;
        this.pathRecalcCounter = 0;
      } else {
        this.path = [];
        this.currentGoal = decision.goal;
      }
    } else if (!decision.target) {
      this.path = [];
    }

    if (this.path.length > 0) {
      const next = this.path[0];
      const dx = next.x - player.pos.x;
      const dy = next.y - player.pos.y;

      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        this.world.movePlayer(this.id, Math.sign(dx), Math.sign(dy));
        const newPlayer = this.world.players.get(this.id);
        if (newPlayer && newPlayer.pos.x === next.x && newPlayer.pos.y === next.y) {
          this.path.shift();
        } else if (this.currentGoal === 'fight' && this.path.length === 1) {
          this.path = [];
        } else {
          this.path = [];
        }
      } else {
        this.path = [];
      }
    } else if (decision.goal === 'idle') {
      this.randomStep(player.pos, level);
    }

    this.onChange?.();
  }

  decide(player: { pos: Position; hp: number; maxHp: number; explored: boolean[][] }, level: DungeonLevel, visible: boolean[][]) {
    if (player.hp < player.maxHp * 0.4) {
      const potion = this.findClosestVisible(level, visible, player.pos, e =>
        e.type === 'item' && e.name === 'Health Potion'
      );
      if (potion) return { target: potion, goal: 'heal' };
    }

    const enemy = this.findClosestVisible(level, visible, player.pos, e =>
      e.type === 'enemy' && Math.abs(e.pos.x - player.pos.x) + Math.abs(e.pos.y - player.pos.y) <= 6
    );
    if (enemy && player.hp > player.maxHp * 0.3) {
      return { target: enemy, goal: 'fight' };
    }

    const item = this.findClosestVisible(level, visible, player.pos, e =>
      e.type === 'item' && Math.abs(e.pos.x - player.pos.x) + Math.abs(e.pos.y - player.pos.y) <= 10
    );
    if (item) return { target: item, goal: 'loot' };

    const unexplored = bfsToUnexplored(player.pos, player.explored, level);
    if (unexplored) return { target: unexplored, goal: 'explore' };

    const stairs = level.entities.find(e => e.type === 'stairs_down');
    if (stairs) return { target: stairs.pos, goal: 'descend' };

    return { target: null, goal: 'idle' };
  }

  findClosestVisible(
    level: DungeonLevel,
    visible: boolean[][],
    from: Position,
    filter: (e: any) => boolean
  ): Position | null {
    let best: Position | null = null;
    let bestDist = Infinity;

    for (const e of level.entities) {
      if (!filter(e)) continue;
      if (!visible[e.pos.y][e.pos.x]) continue;
      const dist = Math.abs(e.pos.x - from.x) + Math.abs(e.pos.y - from.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = e.pos;
      }
    }

    return best;
  }

  randomStep(pos: Position, level: DungeonLevel) {
    const shuffled = [...DIRS].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of shuffled) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && level.map[ny][nx].walkable) {
        this.world.movePlayer(this.id, dx, dy);
        return;
      }
    }
  }
}
