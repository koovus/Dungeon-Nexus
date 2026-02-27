import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GameWorld, MAP_WIDTH, MAP_HEIGHT } from "./game";
import { AIBot } from "./aiBot";
import { log } from "./index";

const NUM_AI_BOTS = 4;
const AI_TICK_SPEED = 40;

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
  const observing = new Set<string>();
  let nextId = 1;

  const aiBots: AIBot[] = [];
  for (let i = 0; i < NUM_AI_BOTS; i++) {
    const bot = new AIBot(world, AI_TICK_SPEED);
    aiBots.push(bot);
  }

  let observeThrottle: ReturnType<typeof setInterval> | null = null;

  function startObserveBroadcast() {
    if (observeThrottle) return;
    observeThrottle = setInterval(() => {
      if (observing.size === 0) {
        if (observeThrottle) clearInterval(observeThrottle);
        observeThrottle = null;
        return;
      }
      for (const clientId of observing) {
        sendObserveState(clientId);
      }
    }, AI_TICK_SPEED);
  }

  for (const bot of aiBots) {
    bot.start();
  }

  function sendState(playerId: string) {
    const ws = clients.get(playerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (observing.has(playerId)) {
      sendObserveState(playerId);
      return;
    }

    const state = world.getStateForPlayer(playerId);
    if (state) {
      ws.send(JSON.stringify({ type: 'state', data: state }));
    }
  }

  function sendObserveState(clientId: string) {
    const ws = clients.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const depthBots = new Map<number, AIBot[]>();
    for (const bot of aiBots) {
      const d = world.playerDepths.get(bot.id);
      if (d === undefined) continue;
      if (!depthBots.has(d)) depthBots.set(d, []);
      depthBots.get(d)!.push(bot);
    }

    const primaryBot = aiBots[0];
    const primaryDepth = world.playerDepths.get(primaryBot.id) ?? 1;
    const primaryPlayer = world.players.get(primaryBot.id);
    if (!primaryPlayer) return;

    const level = world.getOrCreateLevel(primaryDepth);

    const allExplored: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      allExplored.push(new Array(MAP_WIDTH).fill(false));
    }

    const allVisible: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      allVisible.push(new Array(MAP_WIDTH).fill(false));
    }

    const botsOnDepth = depthBots.get(primaryDepth) || [primaryBot];
    for (const bot of botsOnDepth) {
      const p = world.players.get(bot.id);
      if (!p) continue;
      const vis = world.computeVisible(p.pos, level);
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (p.explored[y][x]) allExplored[y][x] = true;
          if (vis[y][x]) allVisible[y][x] = true;
        }
      }
    }

    const visibleEntities = level.entities
      .filter(e => allVisible[e.pos.y][e.pos.x])
      .map(e => ({ ...e }));

    const botPlayers = botsOnDepth.map(bot => {
      const p = world.players.get(bot.id)!;
      return {
        name: p.name,
        pos: p.pos,
        char: '@',
        color: 'text-item',
        visible: true,
        isAI: true
      };
    });

    const humanPlayers = Array.from(world.players.entries())
      .filter(([pid]) => !aiBots.some(b => b.id === pid) && world.playerDepths.get(pid) === primaryDepth)
      .map(([_, p]) => ({
        name: p.name,
        pos: p.pos,
        char: '@',
        color: 'text-secondary',
        visible: allVisible[p.pos.y][p.pos.x]
      }));

    const messages: string[] = [];
    for (const bot of botsOnDepth) {
      const botMsgs = world.messageLog.get(bot.id) || [];
      const p = world.players.get(bot.id);
      for (const msg of botMsgs.slice(-8)) {
        messages.push(`[${p?.name || 'AI'}] ${msg}`);
      }
    }
    messages.sort();
    const recentMsgs = messages.slice(-30);

    const state = {
      map: level.map.map((row, y) => row.map((tile, x) => ({
        char: tile.char,
        walkable: tile.walkable,
        visible: allVisible[y][x],
        explored: allExplored[y][x]
      }))),
      player: {
        pos: primaryPlayer.pos,
        hp: primaryPlayer.hp,
        maxHp: primaryPlayer.maxHp,
        name: primaryPlayer.name
      },
      entities: visibleEntities,
      otherPlayers: [...botPlayers.slice(1), ...humanPlayers],
      messages: recentMsgs,
      depth: primaryDepth,
      onlineCount: world.players.size,
      observing: true,
      aiBots: botsOnDepth.map(bot => {
        const p = world.players.get(bot.id)!;
        return { name: p.name, hp: p.hp, maxHp: p.maxHp, depth: world.playerDepths.get(bot.id) ?? 1 };
      })
    };

    ws.send(JSON.stringify({ type: 'state', data: state }));
  }

  function broadcastStates(depth?: number) {
    for (const [pid] of clients) {
      if (observing.has(pid)) continue;
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
              observing.add(playerId);
              sendObserveState(playerId);
              startObserveBroadcast();
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
