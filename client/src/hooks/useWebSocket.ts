import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameStateSnapshot } from '@/lib/gameLogic';

export function useGameWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [observing, setObserving] = useState(false);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback((name: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', name }));
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
      reconnectTimeout.current = setTimeout(() => {
        if (name) connect(name);
      }, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const sendMove = useCallback((dx: number, dy: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'move', dx, dy }));
    }
  }, []);

  const toggleObserve = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const newVal = !observing;
      setObserving(newVal);
      wsRef.current.send(JSON.stringify({ type: 'observe', enabled: newVal }));
    }
  }, [observing]);

  useEffect(() => {
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, []);

  return { gameState, connected, connect, sendMove, observing, toggleObserve };
}
