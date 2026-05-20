"use client";
import { useState } from "react";
import type { CanvasCard, CanvasImage } from "@/types";

export type Connection = { id: string; fromId: string; toId: string };
export type ConnectingState = { fromId: string; startX: number; startY: number } | null;

export function useConnections() {
  const [connections,   setConnections]   = useState<Connection[]>([]);
  const [connecting,    setConnecting]    = useState<ConnectingState>(null);
  const [connectMode,   setConnectMode]   = useState(false);
  const [connectMouse,  setConnectMouse]  = useState({ x: 0, y: 0 });

  function handleConnectClick(
    id: string,
    e: React.MouseEvent,
    cards: CanvasCard[],
    images: CanvasImage[]
  ) {
    if (connecting) {
      if (connecting.fromId !== id) {
        const exists = connections.some(c =>
          (c.fromId === connecting.fromId && c.toId === id) ||
          (c.fromId === id && c.toId === connecting.fromId)
        );
        if (!exists)
          setConnections(p => [...p, { id: crypto.randomUUID(), fromId: connecting.fromId, toId: id }]);
      }
      setConnecting(null);
    } else {
      const card = cards.find(c => c.id === id);
      const img  = images.find(i => i.id === id);
      const cx = card ? card.x + card.w / 2 : img ? img.x + img.w / 2 : e.clientX;
      const cy = card ? card.y + card.h / 2 : img ? img.y + img.h / 2 : e.clientY;
      setConnecting({ fromId: id, startX: cx, startY: cy });
      setConnectMouse({ x: e.clientX, y: e.clientY });
    }
  }

  return {
    connections, setConnections,
    connecting,  setConnecting,
    connectMode, setConnectMode,
    connectMouse, setConnectMouse,
    handleConnectClick,
  };
}
