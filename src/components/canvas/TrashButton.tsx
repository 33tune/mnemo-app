"use client";
import { forwardRef } from "react";

type Props = {
  isActive: boolean;
  overTrash: boolean;
  menuOpen: boolean;
  onClick: (e: React.MouseEvent) => void;
};

const TrashButton = forwardRef<HTMLDivElement, Props>(function TrashButton(
  { isActive, overTrash, menuOpen, onClick },
  ref
) {
  return (
    <div ref={ref} style={{ position: "fixed", bottom: 32, right: 32, zIndex: 1000 }}>
      <button
        onClick={onClick}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: isActive && overTrash ? "1px solid rgba(255,80,80,0.6)" : "1px solid rgba(255,255,255,0.2)",
          background: isActive && overTrash ? "rgba(255,50,50,0.3)" : menuOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
          color: isActive && overTrash ? "rgba(255,100,100,0.9)" : "white",
          fontSize: isActive ? 20 : 24,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        {isActive ? "🗑" : menuOpen ? "×" : "+"}
      </button>
    </div>
  );
});

export default TrashButton;
