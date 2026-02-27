import { useEffect, useState, useRef, useCallback } from 'react';
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/gameLogic';
import type { GameStateSnapshot, PlayerStatsInfo } from '@/lib/gameLogic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameWebSocket } from '@/hooks/useWebSocket';
import { Eye, EyeOff, Skull } from 'lucide-react';

function JoinScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `Adventurer_${Math.floor(Math.random() * 1000)}`;
    onJoin(finalName);
  };

  return (
    <div className="min-h-screen w-full bg-background text-primary crt flex flex-col items-center justify-center crt-flicker font-mono">
      <div className="relative z-10 border border-primary/50 p-8 max-w-lg w-full mx-4" style={{ textShadow: '0 0 5px currentColor' }}>
        <pre className="text-primary text-xs mb-6 text-center leading-tight select-none">
{`
 ██████╗ ██╗   ██╗███╗   ██╗ ██████╗ ███████╗ ██████╗ ███╗   ██╗
 ██╔══██╗██║   ██║████╗  ██║██╔════╝ ██╔════╝██╔═══██╗████╗  ██║
 ██║  ██║██║   ██║██╔██╗ ██║██║  ███╗█████╗  ██║   ██║██╔██╗ ██║
 ██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══╝  ██║   ██║██║╚██╗██║
 ██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝███████╗╚██████╔╝██║ ╚████║
 ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
                       M U D
`}
        </pre>

        <div className="space-y-4 text-sm text-primary/70 mb-6">
          <p className="text-center">A multiplayer roguelike dungeon crawler</p>
          <div className="grid grid-cols-2 gap-2 text-xs border border-primary/20 p-3">
            <div><span className="text-player font-bold">@</span> You</div>
            <div><span className="text-secondary font-bold">@</span> Other Players</div>
            <div><span className="text-enemy font-bold">g o T D</span> Monsters</div>
            <div><span className="text-item font-bold">! ? $ )</span> Items</div>
            <div><span className="text-primary font-bold">&gt;</span> Stairs Down</div>
            <div><span className="text-wall font-bold">#</span> Walls</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-primary/70 uppercase tracking-widest block mb-1">Enter thy name</label>
            <input
              ref={inputRef}
              data-testid="input-player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous Adventurer"
              maxLength={20}
              className="w-full bg-transparent border border-primary/50 px-3 py-2 text-primary font-mono focus:outline-none focus:border-primary placeholder:text-primary/30"
            />
          </div>
          <button
            data-testid="button-join"
            type="submit"
            className="w-full bg-primary/20 border border-primary/50 px-4 py-2 text-primary uppercase tracking-widest hover:bg-primary/30 transition-colors"
          >
            Enter the Dungeon
          </button>
        </form>
      </div>
    </div>
  );
}

function DeathScreen({ stats, playerName, depth, onRespawn }: {
  stats: PlayerStatsInfo;
  playerName: string;
  depth: number;
  onRespawn: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onRespawn();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onRespawn]);

  return (
    <div className="h-screen w-full bg-background text-primary crt flex flex-col items-center justify-center crt-flicker font-mono">
      <div className="relative z-10 border border-enemy/50 p-8 max-w-lg w-full mx-4 bg-enemy/5">
        <div className="flex flex-col items-center gap-4 mb-6">
          <Skull className="w-16 h-16 text-enemy animate-pulse" />
          <h1 className="text-enemy text-2xl font-bold uppercase tracking-widest" style={{ textShadow: '0 0 10px rgba(255,0,0,0.6)' }}>
            You Have Perished
          </h1>
          <p className="text-enemy/70 text-sm">
            {playerName} was slain by {stats.killedBy || 'the dungeon'} on depth {depth}
          </p>
        </div>

        <div className="border border-primary/20 p-4 mb-6 space-y-2">
          <h2 className="text-primary/70 text-xs uppercase tracking-widest border-b border-primary/20 pb-1 mb-3">
            Final Record
          </h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div className="text-primary/60">Deepest Depth</div>
            <div className="text-player font-bold text-right" data-testid="stat-depth">{stats.deepestDepth}</div>

            <div className="text-primary/60">Monsters Slain</div>
            <div className="text-enemy font-bold text-right" data-testid="stat-kills">{stats.kills}</div>

            <div className="text-primary/60">Damage Dealt</div>
            <div className="text-player font-bold text-right" data-testid="stat-dmg-dealt">{stats.damageDealt}</div>

            <div className="text-primary/60">Damage Taken</div>
            <div className="text-enemy font-bold text-right" data-testid="stat-dmg-taken">{stats.damageTaken}</div>

            <div className="text-primary/60">Items Collected</div>
            <div className="text-item font-bold text-right" data-testid="stat-items">{stats.itemsCollected}</div>

            <div className="text-primary/60">Steps Walked</div>
            <div className="text-primary font-bold text-right" data-testid="stat-steps">{stats.stepsWalked}</div>
          </div>
        </div>

        <button
          data-testid="button-respawn"
          onClick={onRespawn}
          className="w-full py-3 border border-primary/50 text-primary uppercase tracking-widest text-sm hover:bg-primary/10 hover:border-primary transition-colors"
          style={{ textShadow: '0 0 5px currentColor' }}
        >
          Enter the Dungeon Again [Enter]
        </button>
      </div>
    </div>
  );
}

function GameView({
  state,
  onMove,
  observing,
  onToggleObserve
}: {
  state: GameStateSnapshot;
  onMove: (dx: number, dy: number) => void;
  observing: boolean;
  onToggleObserve: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (observing) return;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp': case 'w': dy = -1; break;
        case 'ArrowDown': case 's': dy = 1; break;
        case 'ArrowLeft': case 'a': dx = -1; break;
        case 'ArrowRight': case 'd': dx = 1; break;
        default: return;
      }

      e.preventDefault();
      onMove(dx, dy);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove, observing]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.messages.length]);

  const entityMap = new Map<string, typeof state.entities[0]>();
  for (const e of state.entities) {
    entityMap.set(`${e.pos.x},${e.pos.y}`, e);
  }
  const otherPlayerMap = new Map<string, typeof state.otherPlayers[0]>();
  for (const p of state.otherPlayers) {
    if (p.visible) otherPlayerMap.set(`${p.pos.x},${p.pos.y}`, p);
  }

  const renderMap = () => {
    const rows = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const rowChars = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = state.map[y][x];
        const key = `${x},${y}`;
        const isPlayer = state.player.pos.x === x && state.player.pos.y === y;

        if (isPlayer) {
          rowChars.push(<span key={key} className={observing ? "text-item" : "text-player"}>@</span>);
        } else if (otherPlayerMap.has(key)) {
          const op = otherPlayerMap.get(key)!;
          rowChars.push(<span key={key} className={op.color}>{op.char}</span>);
        } else if (entityMap.has(key) && tile.visible) {
          const e = entityMap.get(key)!;
          rowChars.push(<span key={key} className={e.color}>{e.char}</span>);
        } else if (tile.visible) {
          const color = tile.walkable ? 'text-primary/30' : 'text-wall';
          rowChars.push(<span key={key} className={color}>{tile.char}</span>);
        } else if (tile.explored) {
          rowChars.push(<span key={key} className="text-primary/10">{tile.char}</span>);
        } else {
          rowChars.push(<span key={key} className="text-transparent"> </span>);
        }
      }
      rows.push(<div key={y} className="leading-none whitespace-pre flex">{rowChars}</div>);
    }
    return rows;
  };

  const visibleEntities = state.entities.filter(e => e.type !== 'stairs_down');
  const visibleOthers = state.otherPlayers.filter(p => p.visible);

  return (
    <div className="h-screen w-full bg-background text-primary crt flex flex-col crt-flicker">
      <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-3 relative z-10 min-h-0">

        {/* Observe Mode Banner */}
        {observing && state.aiBots && (
          <div className="bg-item/5 border border-item/30 px-4 py-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-item text-xs uppercase tracking-widest">
                <Eye className="w-4 h-4 animate-pulse" />
                Observing {state.aiBots.length} AI Agents — 10x Speed
              </div>
              <div className="flex gap-3">
                {state.aiBots.map((bot, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="text-item font-bold">@</span>
                    <span className="text-item/80">{bot.name}</span>
                    <span className={bot.hp <= 5 ? "text-enemy" : "text-primary/50"}>
                      {bot.hp}/{bot.maxHp}
                    </span>
                    <span className="text-primary/30">D{bot.depth}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <header className="border-b border-primary/50 pb-2 flex justify-between items-end font-bold uppercase tracking-wider shrink-0">
          <div className="flex gap-4 items-end">
            {observing ? (
              <span className="text-item" data-testid="text-player-name">[AI] {state.player.name}</span>
            ) : (
              <span className="text-player" data-testid="text-player-name">{state.player.name}</span>
            )}
            {!observing && (
              <span className={state.player.hp <= 5 ? "text-enemy animate-pulse" : "text-primary"} data-testid="text-player-hp">
                HP: {state.player.hp}/{state.player.maxHp}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              data-testid="button-observe"
              onClick={onToggleObserve}
              className={`flex items-center gap-2 text-xs px-3 py-1 border uppercase tracking-widest transition-colors ${
                observing
                  ? 'border-item/50 text-item bg-item/10 hover:bg-item/20'
                  : 'border-primary/50 text-primary/70 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {observing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {observing ? 'Stop Observing' : 'Observe AI'}
            </button>
            <div className="text-primary/50 text-sm" data-testid="text-depth-info">
              Depth: {state.depth} | Online: {state.onlineCount}
            </div>
          </div>
        </header>

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

          <div className="flex-1 border border-primary/30 p-4 bg-background overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-20"></div>

            <div className="h-full w-full flex items-center justify-center">
              <div
                className="font-mono text-sm tracking-widest relative z-10 transform-gpu"
                style={{ textShadow: '0 0 5px currentColor' }}
                data-testid="game-map"
              >
                {renderMap()}
              </div>
            </div>

            <div className="absolute bottom-2 right-2 text-xs opacity-40 uppercase tracking-widest z-30">
              {observing ? '[Observing]' : '[WASD] move'}
            </div>
          </div>

          <div className="w-72 flex flex-col gap-3 min-h-0">

            <div className="border border-primary/30 p-3 shrink-0 max-h-48 flex flex-col">
              <h3 className="uppercase text-xs tracking-widest text-primary/70 mb-2 border-b border-primary/30 pb-1 shrink-0">Nearby</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {visibleOthers.map((p, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <span className={`${p.color} font-bold`}>{p.char}</span>
                      <span className="opacity-80">{p.name}</span>
                    </div>
                  ))}
                  {visibleEntities.map(e => (
                    <div key={e.id} className="text-sm flex items-center gap-2">
                      <span className={`${e.color} font-bold`}>{e.char}</span>
                      <span className="opacity-80">{e.name}</span>
                      {e.hp !== undefined && (
                        <span className="ml-auto text-xs opacity-50">[{e.hp}hp]</span>
                      )}
                    </div>
                  ))}
                  {visibleEntities.length === 0 && visibleOthers.length === 0 && (
                    <div className="text-xs opacity-50 italic">Nothing nearby.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="border border-primary/30 p-3 flex-1 flex flex-col min-h-0 relative">
              <h3 className="uppercase text-xs tracking-widest text-primary/70 mb-2 border-b border-primary/30 pb-1 shrink-0">System Log</h3>
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto font-mono text-sm space-y-0.5 pr-2 min-h-0"
              >
                {state.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={i === state.messages.length - 1 ? 'text-secondary' : 'text-primary/70'}
                  >
                    <span className="opacity-40 mr-1">&gt;</span>{msg}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 rounded" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { gameState, connected, connect, sendMove, observing, toggleObserve, sendRespawn } = useGameWebSocket();
  const [joined, setJoined] = useState(false);

  const handleJoin = useCallback((name: string) => {
    connect(name);
    setJoined(true);
  }, [connect]);

  const handleMove = useCallback((dx: number, dy: number) => {
    sendMove(dx, dy);
  }, [sendMove]);

  if (!joined) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background text-primary font-mono flex items-center justify-center crt crt-flicker">
        <div className="text-center relative z-10" style={{ textShadow: '0 0 5px currentColor' }}>
          <div className="animate-pulse text-xl uppercase tracking-widest">Connecting to server...</div>
          {!connected && <div className="text-sm text-primary/50 mt-2">Establishing link</div>}
        </div>
      </div>
    );
  }

  if (gameState.dead && gameState.stats) {
    return (
      <DeathScreen
        stats={gameState.stats}
        playerName={gameState.player.name}
        depth={gameState.depth}
        onRespawn={sendRespawn}
      />
    );
  }

  return (
    <GameView
      state={gameState}
      onMove={handleMove}
      observing={observing}
      onToggleObserve={toggleObserve}
    />
  );
}
