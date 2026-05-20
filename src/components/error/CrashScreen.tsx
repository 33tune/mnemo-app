"use client";
import React from "react";

const MONO = "'Space Mono', monospace";

interface Props {
  error?: Error;
  reset?: () => void;
}

function ActionBtn({
  label,
  onClick,
  dim,
}: {
  label:   string;
  onClick: () => void;
  dim?:    boolean;
}) {
  const base: React.CSSProperties = {
    fontFamily:    MONO,
    fontSize:      9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    borderRadius:  3,
    padding:       "12px 20px",
    width:         "100%",
    cursor:        "pointer",
    transition:    "all 0.1s ease",
    border:        dim
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(255,255,255,0.14)",
    background:    dim ? "transparent" : "rgba(255,255,255,0.05)",
    color:         dim ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.82)",
  };

  return (
    <button
      onClick={onClick}
      style={base}
      onMouseEnter={e => {
        e.currentTarget.style.background    = dim ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.1)";
        e.currentTarget.style.borderColor   = dim ? "rgba(255,255,255,0.1)"  : "rgba(255,255,255,0.25)";
        e.currentTarget.style.color         = dim ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.95)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background    = base.background    as string;
        e.currentTarget.style.borderColor   = (base.border as string).replace("1px solid ", "");
        e.currentTarget.style.color         = base.color         as string;
      }}
    >
      {label}
    </button>
  );
}

export default function CrashScreen({ error, reset }: Props) {
  return (
    <div style={{
      position:        "fixed",
      inset:           0,
      background:      "#07070a",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      zIndex:          99999,
      fontFamily:      MONO,
    }}>
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            24,
        maxWidth:       420,
        width:          "100%",
        padding:        "0 24px",
        textAlign:      "center",
      }}>

        {/* Rule */}
        <div style={{ fontSize: 8, letterSpacing: 4, color: "rgba(255,255,255,0.1)", textTransform: "uppercase" }}>
          ── ── ── ── ── ──
        </div>

        {/* Heading */}
        <div style={{ fontSize: 17, letterSpacing: 6, color: "rgba(255,255,255,0.82)", textTransform: "uppercase", lineHeight: 1.4 }}>
          SYSTEM INTERRUPTION
        </div>

        {/* Body */}
        <div style={{ fontSize: 9, letterSpacing: 1.8, color: "rgba(255,255,255,0.24)", textTransform: "uppercase", lineHeight: 2 }}>
          A rendering error interrupted the workspace.<br />
          Your canvas data is safe.
        </div>

        {/* Error detail */}
        {error?.message && (
          <div style={{
            fontFamily:   MONO,
            fontSize:     8,
            color:        "rgba(255,80,80,0.55)",
            background:   "rgba(255,0,0,0.04)",
            border:       "1px solid rgba(255,0,0,0.1)",
            borderRadius: 2,
            padding:      "8px 12px",
            width:        "100%",
            overflowX:    "auto",
            whiteSpace:   "pre-wrap",
            wordBreak:    "break-all",
            textAlign:    "left",
            lineHeight:   1.6,
          }}>
            {error.message}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          {reset && (
            <ActionBtn label="TRY AGAIN" onClick={reset} />
          )}
          <ActionBtn
            label="RELOAD WORKSPACE"
            onClick={() => window.location.reload()}
          />
          <ActionBtn
            label="RETURN HOME"
            onClick={() => { window.location.href = "/dashboard"; }}
            dim
          />
        </div>

        {/* Rule */}
        <div style={{ fontSize: 8, letterSpacing: 4, color: "rgba(255,255,255,0.1)", textTransform: "uppercase" }}>
          ── ── ── ── ── ──
        </div>

      </div>
    </div>
  );
}
