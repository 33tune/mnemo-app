"use client";
import { useState } from "react";
import type { CanvasMode } from "@/types";

const MONO = "'Space Mono', monospace";

export default function ViewModeSwitcher({
  canvasMode,
  onSwitch,
}: {
  canvasMode: CanvasMode;
  onSwitch: (mode: "space" | "space_mobile") => void;
}) {
  return (
    <div style={{
      position:     "fixed",
      bottom:       18,
      left:         "50%",
      transform:    "translateX(-50%)",
      zIndex:       800,
      display:      "flex",
      alignItems:   "center",
      gap:          1,
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(255,255,255,0.07)",
      borderRadius: 6,
      padding:      "3px",
      backdropFilter: "blur(28px)",
      WebkitBackdropFilter: "blur(28px)",
    }}>
      <PillBtn active={canvasMode === "space"} onClick={() => onSwitch("space")}>
        DESKTOP VIEW
      </PillBtn>
      <PillBtn active={canvasMode === "space_mobile"} onClick={() => onSwitch("space_mobile")}>
        MOBILE VIEW
      </PillBtn>
    </div>
  );
}

function PillBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active:   boolean;
  onClick:  () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        padding:       "5px 14px",
        borderRadius:  4,
        border:        active ? "1px solid rgba(255,255,255,0.13)" : "1px solid transparent",
        background:    active
          ? "rgba(255,255,255,0.11)"
          : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color:         active
          ? "rgba(255,255,255,0.92)"
          : hov ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.38)",
        fontFamily:    MONO,
        fontSize:      8,
        letterSpacing: 2,
        textTransform: "uppercase",
        cursor:        "pointer",
        fontWeight:    active ? 500 : 400,
        transition:    "all 0.1s ease",
        userSelect:    "none",
        whiteSpace:    "nowrap",
      }}
    >
      {children}
    </button>
  );
}
