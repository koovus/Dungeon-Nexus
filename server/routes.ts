import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GameWorld } from "./game";
import { AIBot } from "./aiBot";
import { log } from "./index";

const NUM_AI_BOTS = 4;
const AI_TICK_SPEED = 400;

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

  function broadcastStates(depth?: number) {
    for (const [pid] of clients) {
      if (depth !== undefined) {
        const pDepth = world.playerDepths.get(pid);
        if (pDepth !== depth) continue;
      }
      sendState(pid);
    }
  }

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
            const depth = world.playerDepths.get(playerId);
            if (depth) broadcastStates(depth);
            break;
          }

          case 'move': {
            const dx = Math.max(-1, Math.min(1, msg.dx || 0));
            const dy = Math.max(-1, Math.min(1, msg.dy || 0));
            const prevDepth = world.playerDepths.get(playerId);
            const moved = world.movePlayer(playerId, dx, dy);
            if (moved) {
              const newDepth = world.playerDepths.get(playerId);
              sendState(playerId);
              if (prevDepth !== undefined) broadcastStates(prevDepth);
              if (newDepth !== undefined && newDepth !== prevDepth) broadcastStates(newDepth);
            }
            break;
          }

          case 'respawn': {
            world.respawnPlayer(playerId);
            sendState(playerId);
            broadcastStates(1);
            break;
          }
        }
      } catch (err) {
        log(`WebSocket error: ${err}`, "game");
      }
    });

    ws.on('close', () => {
      const depth = world.playerDepths.get(playerId);
      world.removePlayer(playerId);
      clients.delete(playerId);
      if (depth) broadcastStates(depth);
    });

    ws.on('error', () => {
      const depth = world.playerDepths.get(playerId);
      world.removePlayer(playerId);
      clients.delete(playerId);
      if (depth) broadcastStates(depth);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, players: world.players.size });
  });

  return httpServer;
}
