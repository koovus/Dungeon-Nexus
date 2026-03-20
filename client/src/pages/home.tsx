import { useEffect, useState, useRef, useCallback } from 'react';
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/gameLogic';
import type { GameStateSnapshot, PlayerStatsInfo } from '@/lib/gameLogic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameWebSocket } from '@/hooks/useWebSocket';
import { Skull, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  initAudio,
  setMuted,
  playDungeonMusic,
  playRiftMusic,
  fadeOutMusic,
  playMetalClang,
  playItemPickup,
  playMonsterGrowl,
  playBuffActivate,
  playBuffExpire,
  startAmbientSounds,
  stopAmbientSounds,
  stopAll,
} from '@/lib/audioEngine';

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
      <div className="relative z-10 border border-primary/50 p-6 md:p-8 max-w-lg w-full mx-4" style={{ textShadow: '0 0 5px currentColor' }}>
        <pre className="text-primary text-[7px] sm:text-xs mb-6 text-center leading-tight select-none overflow-hidden">
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
          <p className="text-center text-xs text-primary/40">v0.4.0</p>
          <div className="grid grid-cols-2 gap-2 text-xs border border-primary/20 p-3">
            <div><span className="text-player font-bold">@</span> You</div>
            <div><span className="text-secondary font-bold">@</span> Other Players</div>
            <div><span className="text-enemy font-bold">g o T D</span> Monsters</div>
            <div><span className="text-item font-bold">! ? $ )</span> Items</div>
            <div><span className="text-primary font-bold">&gt;</span> Stairs Down</div>
            <div><span className="text-wall font-bold">#</span> Walls</div>
            <div><span className="text-primary/70 font-bold">. Space</span> Rest</div>
            <div><span className="text-item font-bold">{"}"} / ) [</span> Equipment</div>
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
      <div className="relative z-10 border border-enemy/50 p-6 md:p-8 max-w-lg w-full mx-4 bg-enemy/5">
        <div className="flex flex-col items-center gap-4 mb-6">
          <Skull className="w-12 h-12 md:w-16 md:h-16 text-enemy animate-pulse" />
          <h1 className="text-enemy text-xl md:text-2xl font-bold uppercase tracking-widest text-center" style={{ textShadow: '0 0 10px rgba(255,0,0,0.6)' }}>
            You Have Perished
          </h1>
          <p className="text-enemy/70 text-sm text-center">
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
          Enter the Dungeon Again
        </button>
      </div>
    </div>
  );
}

function MuteButton() {
  const [mute, setMute] = useState(() => {
    try { return localStorage.getItem('dungeon-muted') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    setMuted(mute);
    try { localStorage.setItem('dungeon-muted', String(mute)); } catch {}
  }, [mute]);

  return (
    <button
      data-testid="button-mute"
      onClick={() => setMute(!mute)}
      className="border border-primary/30 px-2 py-1 text-primary/70 hover:text-primary hover:border-primary/60 transition-colors flex items-center gap-1.5 text-xs uppercase tracking-wider"
      title={mute ? 'Unmute' : 'Mute'}
    >
      {mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{mute ? 'Muted' : 'Sound'}</span>
    </button>
  );
}

function AudioController({ state }: { state: GameStateSnapshot }) {
  const prevMessagesLen = useRef(0);
  const prevRiftActive = useRef(false);
  const prevRiftWarning = useRef(false);
  const prevDead = useRef(false);

  useEffect(() => {
    playDungeonMusic();
    startAmbientSounds();
    return () => {
      stopAll();
    };
  }, []);

  useEffect(() => {
    if (state.dead && !prevDead.current) {
      stopAll();
    } else if (!state.dead && prevDead.current) {
      if (state.riftActive) {
        playRiftMusic();
      } else {
        playDungeonMusic();
        startAmbientSounds();
      }
    }
    prevDead.current = !!state.dead;
  }, [state.dead, state.riftActive]);

  useEffect(() => {
    if (state.dead) return;
    const newMessages = state.messages.slice(prevMessagesLen.current);
    prevMessagesLen.current = state.messages.length;

    for (const msg of newMessages) {
      const lower = msg.toLowerCase();
      if (lower.includes('you picked up a')) {
        if (lower.includes('sword') || lower.includes('shield') || lower.includes('axe') || lower.includes('dagger') || lower.includes('mace') || lower.includes('spear') || lower.includes('hammer')) {
          playMetalClang();
        } else {
          playItemPickup();
        }
      } else if (lower.includes('hits you') || lower.includes('attacks you') || lower.includes('bites you') || lower.includes('claws you')) {
        playMonsterGrowl();
      } else if (lower.includes('aura shields you') || lower.includes('hums with protection') || lower.includes('steadies your aim') || lower.includes('crackles with power')) {
        playBuffActivate();
      } else if (lower.includes('enchantment fades')) {
        playBuffExpire();
      }
    }
  }, [state.messages.length, state.dead]);

  useEffect(() => {
    if (state.dead) return;
    if (state.riftWarning && !prevRiftWarning.current) {
      fadeOutMusic();
      stopAmbientSounds();
    }
    prevRiftWarning.current = !!state.riftWarning;
  }, [state.riftWarning, state.dead]);

  useEffect(() => {
    if (state.dead) return;
    if (state.riftActive && !prevRiftActive.current) {
      playRiftMusic();
    } else if (!state.riftActive && prevRiftActive.current) {
      stopAll();
      playDungeonMusic();
      startAmbientSounds();
    }
    prevRiftActive.current = !!state.riftActive;
  }, [state.riftActive, state.dead]);

  return null;
}

function TouchDpad({ onMove, onRest }: { onMove: (dx: number, dy: number) => void; onRest: () => void }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRepeat = (action: () => void) => {
    action();
    intervalRef.current = setInterval(action, 160);
  };

  const stopRepeat = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const btnClass = "flex items-center justify-center w-14 h-14 border border-primary/40 bg-primary/10 active:bg-primary/30 text-primary rounded select-none touch-none";

  const dirBtn = (dx: number, dy: number, icon: React.ReactNode) => (
    <button
      className={btnClass}
      onPointerDown={(e) => { e.preventDefault(); startRepeat(() => onMove(dx, dy)); }}
      onPointerUp={stopRepeat}
      onPointerLeave={stopRepeat}
      onPointerCancel={stopRepeat}
      data-testid={`dpad-${dx === 0 ? (dy < 0 ? 'up' : 'down') : (dx < 0 ? 'left' : 'right')}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-1 p-2 select-none" style={{ width: 'fit-content', margin: '0 auto' }}>
      <div />
      {dirBtn(0, -1, <ChevronUp className="w-6 h-6" />)}
      <div />
      {dirBtn(-1, 0, <ChevronLeft className="w-6 h-6" />)}
      <button
        className={btnClass + " text-primary/60 text-lg font-bold"}
        onPointerDown={(e) => { e.preventDefault(); onRest(); }}
        data-testid="dpad-rest"
      >
        Z
      </button>
      {dirBtn(1, 0, <ChevronRight className="w-6 h-6" />)}
      <div />
      {dirBtn(0, 1, <ChevronDown className="w-6 h-6" />)}
      <div />
    </div>
  );
}

function GameView({
  state,
  onMove,
  onRest
}: {
  state: GameStateSnapshot;
  onMove: (dx: number, dy: number) => void;
  onRest: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const mapInnerRef = useRef<HTMLDivElement>(null);
  const mapOuterRef = useRef<HTMLDivElement>(null);
  const [mapScale, setMapScale] = useState(1);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '.' || e.key === ' ') {
        e.preventDefault();
        onRest();
        return;
      }

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
  }, [onMove, onRest]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.messages.length]);

  useEffect(() => {
    const updateScale = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mapInnerRef.current && mapOuterRef.current) {
        const outerW = mapOuterRef.current.clientWidth;
        const innerW = mapInnerRef.current.scrollWidth;
        if (innerW > 0) {
          setMapScale(Math.min(1, outerW / innerW));
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

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
          rowChars.push(<span key={key} className="text-player">@</span>);
        } else if (otherPlayerMap.has(key)) {
          const op = otherPlayerMap.get(key)!;
          rowChars.push(<span key={key} className={op.color}>{op.char}</span>);
        } else if (entityMap.has(key) && tile.visible) {
          const e = entityMap.get(key)!;
          rowChars.push(<span key={key} className={e.color}>{e.char}</span>);
        } else if (tile.visible) {
          const color = tile.walkable
            ? 'text-primary/30'
            : state.riftActive ? 'text-purple-500/70' : 'text-wall';
          rowChars.push(<span key={key} className={color}>{tile.char}</span>);
        } else if (tile.explored) {
          const dimColor = state.riftActive && !tile.walkable ? 'text-purple-900/40' : 'text-primary/10';
          rowChars.push(<span key={key} className={dimColor}>{tile.char}</span>);
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

  const scaledMapHeight = mapInnerRef.current ? mapInnerRef.current.scrollHeight * mapScale : 'auto';

  if (isMobile) {
    return (
      <div className="h-screen w-full bg-background text-primary crt flex flex-col crt-flicker overflow-hidden">
        <div className="relative z-10 flex flex-col h-full">

          {state.riftWarning && (
            <div className="border-b border-purple-500/60 bg-purple-500/10 px-2 py-1 text-center animate-pulse shrink-0" data-testid="rift-warning-banner">
              <span className="text-purple-400 uppercase tracking-widest text-xs font-bold">A Dimension Gate Is Forming...</span>
            </div>
          )}
          {state.riftActive && (
            <div className="border-b border-purple-500/80 bg-purple-500/15 px-2 py-1 text-center shrink-0" data-testid="rift-active-banner">
              <span className="text-purple-300 uppercase tracking-widest text-xs font-bold animate-pulse">Dimension Rift Active</span>
              {state.riftTurnsLeft !== undefined && (
                <span className="text-purple-400/70 text-xs ml-2">[{state.riftTurnsLeft}t]</span>
              )}
            </div>
          )}

          <header className="border-b border-primary/50 px-2 py-1.5 flex justify-between items-center font-bold shrink-0">
            <div className="flex gap-2 items-center text-xs">
              <span className="text-player" data-testid="text-player-name">{state.player.name}</span>
              <span className={state.player.hp <= 5 ? "text-enemy animate-pulse" : "text-primary"} data-testid="text-player-hp">
                HP:{state.player.hp}/{state.player.maxHp}
              </span>
              {state.player.isResting && (
                <span className="text-primary/60 animate-pulse" data-testid="text-resting">Zzz</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-primary/50" data-testid="text-depth-info">
              <span>D{state.depth}</span>
              <span>{state.onlineCount} online</span>
              <MuteButton />
            </div>
          </header>

          <div
            ref={mapOuterRef}
            className={`shrink-0 w-full overflow-hidden border-b ${state.riftActive ? 'border-purple-500/50' : 'border-primary/20'} relative bg-background`}
            style={{ height: typeof scaledMapHeight === 'number' ? `${scaledMapHeight}px` : undefined }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-20" />
            <div
              style={{
                transform: `scale(${mapScale})`,
                transformOrigin: 'top left',
                width: mapScale < 1 ? `${100 / mapScale}%` : '100%',
              }}
            >
              <div
                ref={mapInnerRef}
                className="font-mono text-sm tracking-widest p-1"
                style={{ textShadow: '0 0 5px currentColor' }}
                data-testid="game-map"
              >
                {renderMap()}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex gap-2 p-1 border-b border-primary/20 overflow-x-auto shrink-0">
              {(state.player.buffs?.length ?? 0) > 0 && (
                <div className="flex gap-1 text-xs" data-testid="text-buffs">
                  {state.player.buffs!.map((b, i) => (
                    <span key={i} className={`border border-current/30 px-1 ${b.type === 'armor' ? 'text-secondary' : 'text-item'}`}>
                      {b.source}({b.turnsLeft})
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-primary/20">
                <div className="px-2 pt-1 shrink-0">
                  <span className="text-primary/50 text-xs uppercase tracking-widest">Log</span>
                </div>
                <div
                  ref={logRef}
                  className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5 px-2 pb-1 min-h-0"
                >
                  {state.messages.slice(-20).map((msg, i, arr) => (
                    <div
                      key={i}
                      className={i === arr.length - 1 ? 'text-secondary' : 'text-primary/60'}
                    >
                      <span className="opacity-40 mr-1">&gt;</span>{msg}
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-28 flex flex-col min-h-0 overflow-hidden shrink-0">
                <div className="px-2 pt-1 shrink-0">
                  <span className="text-primary/50 text-xs uppercase tracking-widest">Top</span>
                </div>
                <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5 min-h-0">
                  {(state.leaderboard ?? []).slice(0, 6).map((entry, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1 text-xs ${entry.name === state.player.name ? 'text-player' : 'text-primary/60'}`}
                      data-testid={`leaderboard-entry-${i}`}
                    >
                      <span className="opacity-50 w-3 text-right shrink-0">{i + 1}.</span>
                      <span className={`flex-1 truncate text-xs ${!entry.alive ? 'opacity-40' : ''}`}>{entry.name}</span>
                      <span className="text-primary/40 shrink-0">D{entry.depth}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-primary/20 flex items-center justify-between px-2">
              <TouchDpad onMove={onMove} onRest={onRest} />
              <div className="text-xs text-primary/30 text-right leading-tight">
                {state.riftActive ? 'phase @\nto heal' : 'Z = rest'}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background text-primary crt flex flex-col crt-flicker">
      <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-3 relative z-10 min-h-0">

        {state.riftWarning && (
          <div
            className="border border-purple-500/60 bg-purple-500/10 px-4 py-2 text-center animate-pulse shrink-0"
            style={{ textShadow: '0 0 8px rgba(168, 85, 247, 0.6)' }}
            data-testid="rift-warning-banner"
          >
            <span className="text-purple-400 uppercase tracking-widest text-sm font-bold">
              A Dimension Gate Is Forming...
            </span>
          </div>
        )}

        {state.riftActive && (
          <div
            className="border border-purple-500/80 bg-purple-500/15 px-4 py-2 text-center shrink-0"
            style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.8)' }}
            data-testid="rift-active-banner"
          >
            <span className="text-purple-300 uppercase tracking-widest text-sm font-bold animate-pulse">
              Dimension Rift Active
            </span>
            {state.riftTurnsLeft !== undefined && (
              <span className="text-purple-400/70 text-xs ml-3">
                [{state.riftTurnsLeft} turns remaining]
              </span>
            )}
          </div>
        )}

        <header className="border-b border-primary/50 pb-2 flex justify-between items-end font-bold uppercase tracking-wider shrink-0">
          <div className="flex gap-4 items-end">
            <span className="text-player" data-testid="text-player-name">{state.player.name}</span>
            <span className={state.player.hp <= 5 ? "text-enemy animate-pulse" : "text-primary"} data-testid="text-player-hp">
              HP: {state.player.hp}/{state.player.maxHp}
            </span>
            {(state.player.buffs?.length ?? 0) > 0 && (
              <span className="text-xs text-item" data-testid="text-buffs">
                {state.player.buffs!.map((b, i) => (
                  <span key={i} className={b.type === 'armor' ? 'text-secondary' : 'text-item'}>
                    {b.source}({b.turnsLeft}){i < state.player.buffs!.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </span>
            )}
            {state.player.isResting && (
              <span className="text-xs text-primary/60 animate-pulse" data-testid="text-resting">Resting...</span>
            )}
          </div>
          <div className="text-primary/50 text-sm flex items-center gap-3" data-testid="text-depth-info">
            <span>Depth: {state.depth} | Online: {state.onlineCount}</span>
            <MuteButton />
          </div>
        </header>

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

          <div className={`flex-1 border p-4 bg-background overflow-hidden relative ${state.riftActive ? 'border-purple-500/50' : 'border-primary/30'}`}>
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
              {state.riftActive ? '[RIFT] phase through @ to heal' : '[WASD] move · [.] rest'}
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

            {state.leaderboard && state.leaderboard.length > 0 && (
              <div className="border border-primary/30 p-3 shrink-0 max-h-44 flex flex-col" data-testid="leaderboard-panel">
                <h3 className="uppercase text-xs tracking-widest text-primary/70 mb-2 border-b border-primary/30 pb-1 shrink-0">Leaderboard</h3>
                <div className="space-y-0.5 text-xs">
                  {state.leaderboard.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-2 ${entry.name === state.player.name ? 'text-player' : 'text-primary/70'}`} data-testid={`leaderboard-entry-${i}`}>
                      <span className="w-4 text-right opacity-50">{i + 1}.</span>
                      <span className={`flex-1 truncate ${!entry.alive ? 'line-through opacity-40' : ''}`}>{entry.name}</span>
                      <span className="text-primary/50">D{entry.depth}</span>
                      <span className="text-enemy/70">{entry.kills}k</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
  const { gameState, connected, connect, sendMove, sendRest, sendRespawn } = useGameWebSocket();
  const [joined, setJoined] = useState(false);

  const handleJoin = useCallback((name: string) => {
    initAudio();
    const savedMute = localStorage.getItem('dungeon-muted') === 'true';
    if (savedMute) setMuted(true);
    connect(name);
    setJoined(true);
  }, [connect]);

  const handleMove = useCallback((dx: number, dy: number) => {
    sendMove(dx, dy);
  }, [sendMove]);

  const handleRest = useCallback(() => {
    sendRest();
  }, [sendRest]);

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

  return (
    <>
      {gameState.dead && gameState.stats ? (
        <DeathScreen
          stats={gameState.stats}
          playerName={gameState.player.name}
          depth={gameState.depth}
          onRespawn={sendRespawn}
        />
      ) : (
        <GameView
          state={gameState}
          onMove={handleMove}
          onRest={handleRest}
        />
      )}
      <AudioController state={gameState} />
    </>
  );
}
