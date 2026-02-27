export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 40;

export interface TileState {
  char: string;
  walkable: boolean;
  visible: boolean;
  explored: boolean;
}

export interface PlayerInfo {
  pos: { x: number; y: number };
  hp: number;
  maxHp: number;
  name: string;
}

export interface EntityInfo {
  id: string;
  type: string;
  pos: { x: number; y: number };
  char: string;
  color: string;
  name: string;
  hp?: number;
  maxHp?: number;
}

export interface OtherPlayerInfo {
  name: string;
  pos: { x: number; y: number };
  char: string;
  color: string;
  visible: boolean;
}

export interface PlayerStatsInfo {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  itemsCollected: number;
  stepsWalked: number;
  deepestDepth: number;
  killedBy: string;
}

export interface GameStateSnapshot {
  map: TileState[][];
  player: PlayerInfo;
  entities: EntityInfo[];
  otherPlayers: OtherPlayerInfo[];
  messages: string[];
  depth: number;
  onlineCount: number;
  dead?: boolean;
  stats?: PlayerStatsInfo;
}
