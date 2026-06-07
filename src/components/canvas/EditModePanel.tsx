"use client";
import { useState, useRef } from "react";
import MobilePublicCanvas from "./MobilePublicCanvas";

const MONO = "'Space Mono', monospace";

/** Mobile logical canvas width — must match MobilePublicCanvas's LOGICAL_WIDTH. */
const LOGICAL_W = 390;

const PANEL_DEFAULT_W = 340;
const PANEL_MIN_W     = 260;
const PANEL_MAX_W     = 580;

export default function EditModePanel({
  userId,
  handle,
  name,
  onClose,
}: {
  userId:  string;
  handle:  string;
  name:    string;
  onClose: () => void;
}) {
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_W);
  const [resizeHover, setResizeHover] = useState(false);
  const isDragging = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(PANEL_DEFAULT_W);

  // fixedScale is derived directly from panelWidth — single source of truth,
  // no intermediate state. MobilePublicCanvas uses it directly so resize is
  // a single render per mouse pixel.
  const fixedScale = panelWidth / LOGICAL_W;

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startW.current = panelWidth;
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      // Moving left = clientX decreases = panel grows
      const dx  = startX.current - ev.clientX;
      const next = Math.min(PANEL_MAX_W, Math.max(PANEL_MIN_W, startW.current + dx));
      setPanelWidth(next);
    }
    function onUp() {
      isDragging.current         = false;
      document.body.style.cursor    = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  return (
    <div style={{
      position:      "fixed",
      right:         0,
      top:           44,
      width:         panelWidth,
      height:        "calc(100vh - 44px)",
      background:    "rgba(6,6,8,0.97)",
      borderLeft:    "1px solid rgba(255,255,255,0.07)",
      display:       "flex",
      flexDirection: "column",
      zIndex:        600,
      overflow:      "hidden",
    }}>

      {/* ── Resize handle — drag left edge to change width ── */}
      <div
        onMouseDown={handleResizeStart}
        onMouseEnter={() => setResizeHover(true)}
        onMouseLeave={() => setResizeHover(false)}
        style={{
          position:        "absolute",
          left:            0,
          top:             0,
          width:           6,
          height:          "100%",
          cursor:          "col-resize",
          zIndex:          10,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      resizeHover ? "rgba(255,255,255,0.04)" : "transparent",
          transition:      "background 0.15s ease",
        }}
      >
        <div style={{
          width:        2,
          height:       28,
          borderRadius: 1,
          background:   resizeHover
            ? "rgba(255,255,255,0.28)"
            : "rgba(255,255,255,0.1)",
          transition:   "background 0.15s ease",
        }} />
      </div>

      {/* ── Panel header ── */}
      <div style={{
        height:       36,
        display:      "flex",
        alignItems:   "center",
        padding:      "0 12px 0 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink:   0,
        gap:          9,
      }}>
        {/* Phone silhouette */}
        <div style={{
          width:        9,
          height:       15,
          border:       "1.5px solid rgba(255,255,255,0.22)",
          borderRadius: 2.5,
          flexShrink:   0,
          position:     "relative",
        }}>
          <div style={{
            position:     "absolute",
            bottom:       2,
            left:         "50%",
            transform:    "translateX(-50%)",
            width:        4,
            height:       1,
            borderRadius: 0.5,
            background:   "rgba(255,255,255,0.22)",
          }} />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 2,
            color:         "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
            lineHeight:    1,
          }}>
            Mobile View
          </span>
          <span style={{
            fontFamily:    MONO,
            fontSize:      6.5,
            letterSpacing: 1,
            color:         "rgba(255,255,255,0.18)",
            lineHeight:    1,
          }}>
            390px
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            background:    "transparent",
            border:        "1px solid rgba(255,255,255,0.08)",
            borderRadius:  3,
            padding:       "2px 7px",
            fontFamily:    MONO,
            fontSize:      7,
            letterSpacing: 1,
            color:         "rgba(255,255,255,0.28)",
            cursor:        "pointer",
            textTransform: "uppercase",
            flexShrink:    0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
        >
          ✕
        </button>
      </div>

      {/* ── Mobile canvas preview
           data-drop-zone attribute reserved for future drag-to-Mobile interaction ── */}
      <div
        data-drop-zone="mobile-preview"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <MobilePublicCanvas
          userId={userId}
          handle={handle}
          name={name}
          preview
          fixedScale={fixedScale}
        />
      </div>
    </div>
  );
}
