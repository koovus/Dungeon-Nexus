import { useEffect, useState, useRef, useMemo } from 'react';
import { createGame, GameState, MAP_WIDTH, MAP_HEIGHT } from '@/lib/gameLogic';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [, setTick] = useState(0); // For forcing re-renders
  const logRef = useRef<HTMLDivElement>(null);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          dy = -1;
          break;
        case 'ArrowDown':
        case 's':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'a':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'd':
          dx = 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      game.movePlayer(dx, dy);
      setTick(t => t + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game]);

  // Scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [game.messages.length]);

  // Create text representation of the map
  const renderMap = () => {
    let rows = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      let rowChars = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = game.map[y][x];
        
        // Render entity if visible
        let entity = null;
        if (tile.visible) {
          entity = game.entities.find(e => e.pos.x === x && e.pos.y === y);
        }
        
        if (game.player.pos.x === x && game.player.pos.y === y) {
          rowChars.push(<span key={`${x}-${y}`} className={game.player.color}>{game.player.char}</span>);
        } else if (entity) {
          rowChars.push(<span key={`${x}-${y}`} className={entity.color}>{entity.char}</span>);
        } else if (tile.visible) {
          rowChars.push(<span key={`${x}-${y}`} className={tile.color}>{tile.char}</span>);
        } else if (tile.explored) {
          rowChars.push(<span key={`${x}-${y}`} className="text-primary/10">{tile.char}</span>);
        } else {
          rowChars.push(<span key={`${x}-${y}`} className="text-transparent"> </span>);
        }
      }
      rows.push(<div key={y} className="leading-none whitespace-pre flex">{rowChars}</div>);
    }
    return rows;
  };

  return (
    <div className="min-h-screen w-full bg-background text-primary crt flex flex-col crt-flicker">
      <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4 relative z-10">
        
        {/* Header / Stats */}
        <header className="border-b border-primary/50 pb-2 flex justify-between items-end font-bold uppercase tracking-wider">
          <div>
            <span className="text-player mr-4">{game.player.name}</span>
            <span className={game.player.hp! <= 5 ? "text-enemy animate-pulse" : "text-primary"}>
              HP: {game.player.hp}/{game.player.maxHp}
            </span>
          </div>
          <div className="text-secondary/70 text-sm">
            Depth: 1 | Online: 4
          </div>
        </header>

        {/* Main Game Area */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          
          {/* Map Display */}
          <div className="flex-1 border border-primary/30 p-4 bg-background overflow-hidden relative group">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none"></div>
            
            <div className="h-full w-full flex items-center justify-center">
              <div 
                className="font-mono text-sm tracking-widest relative z-10 transform-gpu"
                style={{ 
                  textShadow: '0 0 5px currentColor',
                }}
              >
                {renderMap()}
              </div>
            </div>
            
            <div className="absolute bottom-2 right-2 text-xs opacity-50 uppercase tracking-widest">
              [WASD] to move
            </div>
          </div>

          {/* Side Panel: Logs & Entities */}
          <div className="w-80 flex flex-col gap-4 border-l border-primary/30 pl-4">
            
            {/* Nearby Players */}
            <div className="border border-primary/30 p-3 h-1/3 flex flex-col">
              <h3 className="uppercase text-xs tracking-widest text-primary/70 mb-2 border-b border-primary/30 pb-1">Nearby Entities</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {game.entities.filter(e => {
                     // Only show visible entities
                     return game.map[e.pos.y][e.pos.x].visible;
                  }).map(e => (
                    <div key={e.id} className="text-sm flex items-center gap-2">
                      <span className={`${e.color} font-bold`}>{e.char}</span>
                      <span className="opacity-80">{e.name}</span>
                      {e.hp !== undefined && (
                        <span className="ml-auto text-xs opacity-50">[{e.hp} HP]</span>
                      )}
                    </div>
                  ))}
                  {game.entities.filter(e => game.map[e.pos.y][e.pos.x].visible).length === 0 && (
                     <div className="text-xs opacity-50 italic">Nothing nearby.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Message Log */}
            <div className="border border-primary/30 p-3 flex-1 flex flex-col bg-background/50 backdrop-blur-sm relative">
              <h3 className="uppercase text-xs tracking-widest text-primary/70 mb-2 border-b border-primary/30 pb-1">System Log</h3>
              
              <div 
                ref={logRef}
                className="flex-1 overflow-y-auto font-mono text-sm space-y-1 pr-2"
              >
                {game.messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`opacity-${Math.max(20, 100 - (game.messages.length - 1 - i) * 10)} ${
                      i === game.messages.length - 1 ? 'text-secondary' : 'text-primary'
                    }`}
                  >
                    <span className="opacity-50 mr-2">&gt;</span>{msg}
                  </div>
                ))}
              </div>
              
              {/* Scanline overlay for log */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
