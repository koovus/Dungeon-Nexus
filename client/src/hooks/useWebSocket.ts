import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameStateSnapshot } from '@/lib/gameLogic';

export function useGameWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const modeRef = useRef<'idle' | 'playing' | 'observing'>('idle');
  const nameRef = useRef<string>('');

  const openConnection = useCallback((mode: 'playing' | 'observing', name?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    modeRef.current = mode;
    if (name) nameRef.current = name;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (mode === 'playing') {
        ws.send(JSON.stringify({ type: 'join', name: nameRef.current }));
      } else {
        ws.send(JSON.stringify({ type: 'observe' }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state') {
          setGameState(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (modeRef.current !== 'idle') {
        reconnectTimeout.current = setTimeout(() => {
          openConnection(modeRef.current as 'playing' | 'observing', nameRef.current);
        }, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const connect = useCallback((name: string) => {
    openConnection('playing', name);
  }, [openConnection]);

  const observe = useCallback(() => {
    openConnection('observing');
  }, [openConnection]);

  const disconnect = useCallback(() => {
    modeRef.current = 'idle';
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    wsRef.current?.close();
    wsRef.current = null;
    setGameState(null);
    setConnected(false);
  }, []);

  const sendMove = useCallback((dx: number, dy: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'move', dx, dy }));
    }
  }, []);

  const sendRest = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'rest' }));
    }
  }, []);

  const sendRespawn = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'respawn' }));
    }
  }, []);

  const cycleObserved = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'observe_cycle' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      modeRef.current = 'idle';
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, []);

  return { gameState, connected, connect, observe, disconnect, sendMove, sendRest, sendRespawn, cycleObserved };
}
