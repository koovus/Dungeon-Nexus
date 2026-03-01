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
  let nextId = 1;

  const aiBots: AIBot[] = [];
  for (let i = 0; i < NUM_AI_BOTS; i++) {
    const bot = new AIBot(world, AI_TICK_SPEED);
    aiBots.push(bot);
  }
  for (const bot of aiBots) {
    bot.start();
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
  }, 800);

  wss.on('connection', (ws) => {
    const playerId = `p_${nextId++}`;
    clients.set(playerId, ws);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'join': {
            const name = (msg.name || `Adventurer_${Math.floor(Math.random() * 1000)}`).substring(0, 20);
            world.addPlayer(playerId, name);
            sendState(playerId);
            break;
          }

          case 'move': {
            const dx = Math.max(-1, Math.min(1, msg.dx || 0));
            const dy = Math.max(-1, Math.min(1, msg.dy || 0));
            const moved = world.movePlayer(playerId, dx, dy);
            if (moved) {
              sendState(playerId);
              if (world.isInRift(playerId) && world.rift) {
                for (const pid of world.rift.participants) {
                  if (pid !== playerId) sendState(pid);
                }
              }
            }
            break;
          }

          case 'respawn': {
            world.respawnPlayer(playerId);
            sendState(playerId);
            break;
          }
        }
      } catch (err) {
        log(`WebSocket error: ${err}`, "game");
      }
    });

    ws.on('close', () => {
      world.removePlayer(playerId);
      clients.delete(playerId);
    });

    ws.on('error', () => {
      world.removePlayer(playerId);
      clients.delete(playerId);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, players: world.players.size });
  });

  return httpServer;
}
