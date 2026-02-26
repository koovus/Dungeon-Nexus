import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GameWorld } from "./game";
import { AIBot } from "./aiBot";
import { log } from "./index";

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
  const observing = new Map<string, string>();
  let nextId = 1;

  const aiBot = new AIBot(world);
  aiBot.start(() => {
    for (const [clientId, botId] of observing.entries()) {
      if (botId === aiBot.id) {
        sendBotState(clientId, botId);
      }
    }
  });

  function sendState(playerId: string) {
    const ws = clients.get(playerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (observing.has(playerId)) {
      sendBotState(playerId, observing.get(playerId)!);
      return;
    }

    const state = world.getStateForPlayer(playerId);
    if (state) {
      ws.send(JSON.stringify({ type: 'state', data: state }));
    }
  }

  function sendBotState(clientId: string, botId: string) {
    const ws = clients.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const state = world.getStateForPlayer(botId);
    if (state) {
      ws.send(JSON.stringify({ type: 'state', data: { ...state, observing: true } }));
    }
  }

  function broadcastStates(depth?: number) {
    for (const [pid] of clients) {
      if (observing.has(pid)) {
        sendBotState(pid, observing.get(pid)!);
        continue;
      }
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
            if (observing.has(playerId)) break;
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

          case 'observe': {
            if (msg.enabled) {
              observing.set(playerId, aiBot.id);
              sendBotState(playerId, aiBot.id);
              log(`Player ${playerId} started observing AI`, "game");
            } else {
              observing.delete(playerId);
              sendState(playerId);
              log(`Player ${playerId} stopped observing AI`, "game");
            }
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
      observing.delete(playerId);
      if (depth) broadcastStates(depth);
    });

    ws.on('error', () => {
      const depth = world.playerDepths.get(playerId);
      world.removePlayer(playerId);
      clients.delete(playerId);
      observing.delete(playerId);
      if (depth) broadcastStates(depth);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, players: world.players.size });
  });

  return httpServer;
}
