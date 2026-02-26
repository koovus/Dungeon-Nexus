import { EntityDefinition, defaultEnemyTypes, defaultItemTypes } from '@/components/GameSettings';

export type EntityType = 'player' | 'enemy' | 'item' | 'other_player';

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
  color: string;
  walkable: boolean;
  explored: boolean;
  visible: boolean;
}

export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 40;

const FOV_RADIUS = 8;

export class GameState {
  map: Tile[][] = [];
  player: Entity;
  entities: Entity[] = [];
  messages: string[] = [];
  
  enemyDefs: EntityDefinition[];
  itemDefs: EntityDefinition[];

  constructor(enemyDefs = defaultEnemyTypes, itemDefs = defaultItemTypes) {
    this.enemyDefs = enemyDefs;
    this.itemDefs = itemDefs;
    
    this.generateMap();
    this.player = {
      id: 'player',
      type: 'player',
      pos: this.getRandomEmptyPos(),
      char: '@',
      color: 'text-player',
      name: 'Hero',
      hp: 20,
      maxHp: 20
    };
    
    this.spawnEntities();
    this.updateFOV();
    this.log("Welcome to the Dungeons of Doom.");
    this.log("Use arrow keys or WASD to move.");
  }

  generateMap() {
    this.map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        // Simple cellular automata or just random rooms for now
        // To keep it simple, just border walls and some random pillars
        const isBorder = x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1;
        const isWall = isBorder || Math.random() < 0.15;
        
        row.push({
          char: isWall ? '#' : '.',
          color: isWall ? 'text-wall' : 'text-primary/30',
          walkable: !isWall,
          explored: false,
          visible: false
        });
      }
      this.map.push(row);
    }
    
    // Clear out some space for player
    for(let y = 1; y < 10; y++) {
      for(let x = 1; x < 10; x++) {
        this.map[y][x] = {
          char: '.',
          color: 'text-primary/30',
          walkable: true,
          explored: false,
          visible: false
        }
      }
    }
  }

  spawnEntities() {
    // Other players
    for (let i = 0; i < 3; i++) {
      this.entities.push({
        id: `op_${i}`,
        type: 'other_player',
        pos: this.getRandomEmptyPos(),
        char: '@',
        color: 'text-secondary',
        name: `Player_${Math.floor(Math.random() * 1000)}`
      });
    }

    // Enemies
    if (this.enemyDefs.length > 0) {
      for (let i = 0; i < 15; i++) {
        const type = this.enemyDefs[Math.floor(Math.random() * this.enemyDefs.length)];
        this.entities.push({
          id: `e_${i}`,
          type: 'enemy',
          pos: this.getRandomEmptyPos(),
          char: type.char,
          color: type.color,
          name: type.name,
          hp: 10,
          maxHp: 10
        });
      }
    }

    // Items
    if (this.itemDefs.length > 0) {
      for (let i = 0; i < 20; i++) {
        const type = this.itemDefs[Math.floor(Math.random() * this.itemDefs.length)];
        this.entities.push({
          id: `i_${i}`,
          type: 'item',
          pos: this.getRandomEmptyPos(),
          char: type.char,
          color: type.color,
          name: type.name
        });
      }
    }
  }

  getRandomEmptyPos(): Position {
    let pos = { x: 0, y: 0 };
    while (true) {
      pos = {
        x: Math.floor(Math.random() * MAP_WIDTH),
        y: Math.floor(Math.random() * MAP_HEIGHT)
      };
      if (this.map[pos.y][pos.x].walkable) break;
    }
    return pos;
  }

  movePlayer(dx: number, dy: number) {
    const newX = this.player.pos.x + dx;
    const newY = this.player.pos.y + dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;

    if (this.map[newY][newX].walkable) {
      // Check collision with entities
      const entity = this.entities.find(e => e.pos.x === newX && e.pos.y === newY);
      if (entity) {
        if (entity.type === 'enemy') {
          this.log(`You hit the ${entity.name}!`);
          entity.hp! -= Math.floor(Math.random() * 5) + 1;
          if (entity.hp! <= 0) {
            this.log(`You killed the ${entity.name}.`);
            this.entities = this.entities.filter(e => e.id !== entity.id);
          } else {
            this.log(`The ${entity.name} hits you back!`);
            this.player.hp! -= Math.floor(Math.random() * 3) + 1;
          }
          return;
        } else if (entity.type === 'item') {
          this.log(`You picked up a ${entity.name}.`);
          this.entities = this.entities.filter(e => e.id !== entity.id);
          // Move onto the item
          this.player.pos = { x: newX, y: newY };
        } else if (entity.type === 'other_player') {
          this.log(`You bumped into ${entity.name}.`);
          return; // Can't walk over players
        }
      } else {
        this.player.pos = { x: newX, y: newY };
      }
      this.updateFOV();
      this.simulateOtherPlayers();
    }
  }

  simulateOtherPlayers() {
    this.entities.filter(e => e.type === 'other_player').forEach(p => {
      if (Math.random() > 0.5) return; // Sometimes they wait
      
      const dx = Math.floor(Math.random() * 3) - 1;
      const dy = Math.floor(Math.random() * 3) - 1;
      
      const nx = p.pos.x + dx;
      const ny = p.pos.y + dy;
      
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && this.map[ny][nx].walkable) {
        // Simple collision check for mock
        if (nx !== this.player.pos.x || ny !== this.player.pos.y) {
           p.pos = { x: nx, y: ny };
        }
      }
    });
  }

  log(msg: string) {
    this.messages.push(msg);
    if (this.messages.length > 50) {
      this.messages.shift();
    }
  }

  updateFOV() {
    // Reset visible
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.map[y][x].visible = false;
      }
    }

    const px = this.player.pos.x;
    const py = this.player.pos.y;

    // Raycasting FOV (simplified)
    for (let i = 0; i < 360; i += 5) {
      const rad = i * Math.PI / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);

      let cx = px;
      let cy = py;

      for (let r = 0; r < FOV_RADIUS; r++) {
        const rx = Math.round(cx);
        const ry = Math.round(cy);

        if (rx < 0 || rx >= MAP_WIDTH || ry < 0 || ry >= MAP_HEIGHT) break;

        this.map[ry][rx].visible = true;
        this.map[ry][rx].explored = true;

        if (!this.map[ry][rx].walkable) break;

        cx += dx;
        cy += dy;
      }
    }
  }
}

export const createGame = (enemies = defaultEnemyTypes, items = defaultItemTypes) => new GameState(enemies, items);
