"use client";
import type { CanvasCard } from "@/types";
import type { Connection, ConnectingState } from "@/hooks/useConnections";

interface Props {
  connections:    Connection[];
  connecting:     ConnectingState;
  connectMouse:   { x: number; y: number };
  cards:          CanvasCard[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

export default function ConnectionsSVG({ connections, connecting, connectMouse, cards, setConnections }: Props) {
  function getCardCenter(c: CanvasCard) {
    return { x: c.x + c.w / 2, y: c.y + c.h / 2 };
  }

  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 3 }}>
      <defs>
        <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <circle cx="2.5" cy="2.5" r="1.5" fill="rgba(255,255,255,0.2)" />
        </marker>
      </defs>

      {connections.map(conn => {
        const from = cards.find(c => c.id === conn.fromId);
        const to   = cards.find(c => c.id === conn.toId);
        if (!from || !to) return null;
        const fc = getCardCenter(from);
        const tc = getCardCenter(to);
        const mx = (fc.x + tc.x) / 2;
        const my = (fc.y + tc.y) / 2 - 50;
        return (
          <g key={conn.id}>
            <path d={`M ${fc.x} ${fc.y} Q ${mx} ${my} ${tc.x} ${tc.y}`}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none"
              strokeDasharray="3 5" markerEnd="url(#arr)" />
            <path d={`M ${fc.x} ${fc.y} Q ${mx} ${my} ${tc.x} ${tc.y}`}
              stroke="transparent" strokeWidth="14" fill="none"
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onClick={() => setConnections(p => p.filter(c => c.id !== conn.id))} />
          </g>
        );
      })}

      {connecting && (
        <line x1={connecting.startX} y1={connecting.startY}
          x2={connectMouse.x} y2={connectMouse.y}
          stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 5" />
      )}
    </svg>
  );
}
