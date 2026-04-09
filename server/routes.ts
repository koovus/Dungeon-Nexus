import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GameWorld } from "./game";
import { AIBot } from "./aiBot";
import { log } from "./index";

const NUM_AI_BOTS = 4;
const AI_TICK_SPEED = 600;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const world = new GameWorld();

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws"
  });

  const clients = new Map<string, WebSocket>();
  const observers = new Map<string, { ws: WebSocket; targetIdx: number }>();
  let nextId = 1;

  const aiBots: AIBot[] = [];
  for (let i = 0; i < NUM_AI_BOTS; i++) {
    const bot = new AIBot(world, AI_TICK_SPEED);
    aiBots.push(bot);
  }
  for (const bot of aiBots) {
    bot.start();
  }

  function getAiBotIds(): string[] {
    return aiBots.map(b => b.id);
  }

  function getLiveAiBotId(targetIdx: number): { id: string; idx: number } | null {
    const botIds = getAiBotIds();
    if (botIds.length === 0) return null;
    for (let i = 0; i < botIds.length; i++) {
      const idx = (targetIdx + i) % botIds.length;
      const p = world.players.get(botIds[idx]);
      if (p && !p.dead) return { id: botIds[idx], idx };
    }
    const idx = targetIdx % botIds.length;
    return { id: botIds[idx], idx };
  }

  function sendObserverState(obsId: string) {
    const obs = observers.get(obsId);
    if (!obs || obs.ws.readyState !== WebSocket.OPEN) return;
    const result = getLiveAiBotId(obs.targetIdx);
    if (!result) return;
    obs.targetIdx = result.idx;
    const state = world.getStateForPlayer(result.id);
    if (!state) return;
    const target = world.players.get(result.id);
    obs.ws.send(JSON.stringify({
      type: 'state',
      data: {
        ...state,
        observing: true,
        observedName: target?.name || 'AI',
        observedIdx: result.idx,
        observedCount: aiBots.length,
      }
    }));
  }

  function sendState(playerId: string) {
    const ws = clients.get(playerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const state = world.getStateForPlayer(playerId);
    if (state) {
      ws.send(JSON.stringify({ type: 'state', data: state }));
    }
  }

  world.onRiftEvent = (playerIds: string[]) => {
    for (const pid of playerIds) {
      sendState(pid);
    }
    for (const obsId of observers.keys()) {
      sendObserverState(obsId);
    }
  };

  setInterval(() => {
    const affectedPlayers = world.tickEnemies();
    for (const pid of affectedPlayers) {
      sendState(pid);
    }

    const riftAffected = world.tickRift();
    for (const pid of riftAffected) {
      sendState(pid);
    }

    const restAffected = world.tickResting();
    for (const pid of restAffected) {
      sendState(pid);
    }

    for (const obsId of observers.keys()) {
      sendObserverState(obsId);
    }
  }, 800);

  function updateBotSpeeds() {
    const speed = observers.size > 0 ? Math.round(AI_TICK_SPEED / 3) : AI_TICK_SPEED;
    for (const bot of aiBots) bot.setSpeed(speed);
  }

  wss.on('connection', (ws) => {
    const connId = `p_${nextId++}`;
    clients.set(connId, ws);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'join': {
            const name = (msg.name || `Adventurer_${Math.floor(Math.random() * 1000)}`).substring(0, 20);
            world.addPlayer(connId, name);
            sendState(connId);
            break;
          }

          case 'observe': {
            observers.set(connId, { ws, targetIdx: 0 });
            updateBotSpeeds();
            sendObserverState(connId);
            break;
          }

          case 'observe_cycle': {
            const obs = observers.get(connId);
            if (obs) {
              obs.targetIdx = (obs.targetIdx + 1) % Math.max(1, aiBots.length);
              sendObserverState(connId);
            }
            break;
          }

          case 'move': {
            const dx = Math.max(-1, Math.min(1, msg.dx || 0));
            const dy = Math.max(-1, Math.min(1, msg.dy || 0));
            const moved = world.movePlayer(connId, dx, dy);
            if (moved) {
              sendState(connId);
              if (world.isInRift(connId) && world.rift) {
                for (const pid of world.rift.participants) {
                  if (pid !== connId) sendState(pid);
                }
              }
            }
            break;
          }

          case 'rest': {
            const started = world.startResting(connId);
            if (started) {
              sendState(connId);
            }
            break;
          }

          case 'respawn': {
            world.respawnPlayer(connId);
            sendState(connId);
            break;
          }

          case 'ping': {
            // Keepalive — no-op, just prevents idle proxy timeouts
            break;
          }
        }
      } catch (err) {
        log(`WebSocket error: ${err}`, "game");
      }
    });

    ws.on('close', () => {
      if (observers.has(connId)) {
        observers.delete(connId);
        updateBotSpeeds();
      } else {
        world.removePlayer(connId);
      }
      clients.delete(connId);
    });

    ws.on('error', () => {
      if (observers.has(connId)) {
        observers.delete(connId);
        updateBotSpeeds();
      } else {
        world.removePlayer(connId);
      }
      clients.delete(connId);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, players: world.players.size });
  });

  return httpServer;
}
