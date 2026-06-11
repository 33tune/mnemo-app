"use client";
import type { CSSProperties } from "react";
import type { CanvasCard as CanvasCardType } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import CardMenu from "./CardMenu";
import { renderContent, textColor, isLight } from "./CardContent";
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";

const MONO = "'Space Mono', monospace";
const LAYER_NAMES = ["Fondo", "Medio", "Frente"] as const;

function adaptivePad(br: number): number {
  return Math.max(14, Math.min(br * 0.75, 32));
}

interface Props {
  card:           CanvasCardType;
  isSel:          boolean;
  showMenu:       boolean;
  isEdit:         boolean;
  multiSel:       boolean;
  cardMenuTab:    "type" | "style" | "layer";
  draggingId:     string | null;
  connectMode:    boolean;
  parallaxStyle:  CSSProperties;
  onMouseDown:    (id: string, type: "image" | "card" | "text", x: number, y: number, e: React.MouseEvent) => void;
  onClick:        (e: React.MouseEvent) => void;
  onDoubleClick:  (e: React.MouseEvent) => void;
  onResizeMD:     (id: string, type: "image" | "card" | "text", e: React.MouseEvent) => void;
  onRotateMD:     (id: string, type: "image" | "card" | "text", e: React.MouseEvent, domCx?: number, domCy?: number) => void;
  setCardMenuId:  (id: string | null) => void;
  setCardMenuTab: (tab: "type" | "style" | "layer") => void;
  setEditingId:   (id: string | null) => void;
  updateCard:     (id: string, patch: Partial<CanvasCardType>) => void;
  bgCardId:       React.MutableRefObject<string | null>;
  bgImageRef:     React.RefObject<HTMLInputElement>;
}

export default function CanvasCard({
  card, isSel, showMenu, isEdit, multiSel, cardMenuTab, draggingId,
  connectMode, parallaxStyle, onMouseDown, onClick, onDoubleClick,
  onResizeMD, onRotateMD, setCardMenuId, setCardMenuTab, setEditingId,
  updateCard, bgCardId, bgImageRef,
}: Props) {
  const isNote = card.type === "text" || card.type === "list";
  const tc     = textColor(card.bgColor);
  const light  = isLight(card.bgColor);
  const pad    = adaptivePad(card.borderRadius);

  return (
    <div
      className="card-enter"
      onMouseDown={e => onMouseDown(card.id, "card", card.x, card.y, e)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        position: "absolute", left: card.x, top: card.y, width: card.w, height: card.h,
        zIndex: card.zIndex + card.layer * 100 + (isSel ? SELECTION_Z_BOOST : 0),
        cursor: connectMode ? "crosshair" : draggingId === card.id ? "grabbing" : "grab",
        userSelect: "none",
        transform: `${parallaxStyle.transform ?? ""} rotate(${card.rotation}deg)`,
        willChange: "transform",
      }}
    >
      {/* Card background */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: card.borderRadius,
        border: isSel
          ? `1px solid ${light ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.22)"}`
          : `1px solid ${light ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)"}`,
        ...(card.bgImage
          ? bgImageStyle(card.bgImage, card.bgMode)
          : { background: card.bgColor || "rgba(255,255,255,0.045)" }),
        backdropFilter: card.bgColor ? "none" : "blur(18px)",
        WebkitBackdropFilter: card.bgColor ? "none" : "blur(18px)",
        boxShadow: isNote
          ? "0 8px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)"
          : "0 2px 14px rgba(0,0,0,0.18)",
        opacity: card.opacity,
      }} />

      {/* Note tape detail */}
      {isNote && card.bgColor && (
        <div style={{
          position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
          width: 32, height: 10, borderRadius: 3,
          background: "rgba(0,0,0,0.08)", backdropFilter: "blur(2px)", zIndex: 2,
        }} />
      )}

      {/* Content */}
      {card.type !== "empty" && (
        <div style={{
          position: "absolute",
          top: isNote && card.bgColor ? pad + 6 : pad,
          bottom: pad, left: pad, right: pad,
          overflow: "hidden",
          pointerEvents: isEdit ? "auto" : "none",
        }}>
          {renderContent(card, tc, isEdit)}
        </div>
      )}

      {/* Empty state */}
      {card.type === "empty" && !isSel && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.15 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={light ? "#000" : "#fff"} strokeWidth="1.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}

      {/* Drag handle strip */}
      <div
        onMouseDown={e => onMouseDown(card.id, "card", card.x, card.y, e)}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 22,
          borderRadius: `${card.borderRadius}px ${card.borderRadius}px 0 0`,
          cursor: draggingId === card.id ? "grabbing" : "grab", zIndex: 4,
        }}
      />

      {/* Layer badges */}
      {isSel && !multiSel && (
        <div
          style={{
            position:            "absolute",
            top:                 -30,
            left:                0,
            display:             "flex",
            gap:                 2,
            padding:             2,
            background:          "rgba(0,0,0,0.4)",
            border:              "1px solid rgba(255,255,255,0.08)",
            borderRadius:        6,
            backdropFilter:      "blur(8px)",
            WebkitBackdropFilter:"blur(8px)",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {([0, 1, 2] as const).map(l => {
            const active = card.layer === l;
            return (
              <div
                key={l}
                onClick={e => { e.stopPropagation(); updateCard(card.id, { layer: l }); }}
                style={{
                  padding:       "4px 8px",
                  borderRadius:  4,
                  fontFamily:    MONO,
                  fontSize:      11,
                  letterSpacing: "1px",
                  background:    active ? "rgba(255,255,255,0.9)" : "transparent",
                  color:         active ? "#000000" : "rgba(255,255,255,0.7)",
                  opacity:       active ? 1 : 0.5,
                  cursor:        "pointer",
                  border:        "none",
                  userSelect:    "none",
                  transition:    "all 0.12s cubic-bezier(0.2,0.8,0.2,1)",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.opacity   = "1";
                    el.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.opacity   = "0.5";
                    el.style.transform = "scale(1)";
                  }
                }}
                onMouseDown={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(0.96)";
                }}
                onMouseUp={e => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                }}
              >
                {LAYER_NAMES[l].slice(0, 2).toUpperCase()}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit button */}
      {isSel && !multiSel && (card.type === "text" || card.type === "list" || card.type === "links") && !isEdit && (
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setEditingId(card.id); }}
          style={{
            position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)",
            padding: "3px 10px", borderRadius: 20, cursor: "pointer", zIndex: 20,
            background: "rgba(10,10,12,0.94)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(8px)",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
            editar
          </span>
        </div>
      )}

      {/* Done button */}
      {isEdit && (
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setEditingId(null); }}
          style={{
            position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)",
            padding: "3px 10px", borderRadius: 20, cursor: "pointer", zIndex: 20,
            background: "rgba(212,240,196,0.12)", border: "1px solid rgba(212,240,196,0.25)",
            fontFamily: MONO, fontSize: 8, letterSpacing: 1.5,
            color: "rgba(212,240,196,0.8)", textTransform: "uppercase",
          }}
        >
          listo ✓
        </div>
      )}

      {/* Settings dot */}
      {isSel && !multiSel && !isEdit && (
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setCardMenuId(showMenu ? null : card.id); setCardMenuTab("type"); }}
          style={{
            position: "absolute", top: -10, left: -10,
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(12,12,14,0.96)", border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
      )}

      {/* Rotate handle */}
      {isSel && !multiSel && !isEdit && (
        <div
          onMouseDown={e => {
            e.stopPropagation();
            // Pasamos el centro DOM real para rotación precisa
            const el = e.currentTarget.parentElement;
            if (el) {
              const rect = el.getBoundingClientRect();
              onRotateMD(card.id, "card", e, rect.left + rect.width / 2, rect.top + rect.height / 2);
            } else {
              onRotateMD(card.id, "card", e);
            }
          }}
          style={{
            position: "absolute", top: -10, right: -10,
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(12,12,14,0.96)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "crosshair", zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(212,240,196,0.4)"; e.currentTarget.style.background="rgba(212,240,196,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.background="rgba(12,12,14,0.96)"; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6" />
            <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
        </div>
      )}

      {/* Card Menu */}
      {showMenu && (
        <CardMenu
          card={card}
          cardMenuTab={cardMenuTab}
          setCardMenuTab={setCardMenuTab}
          updateCard={updateCard}
          bgCardId={bgCardId}
          bgImageRef={bgImageRef}
        />
      )}

      {/* Resize handle */}
      {isSel && !multiSel && (
        <div
          onMouseDown={e => onResizeMD(card.id, "card", e)}
          style={{
            position: "absolute", bottom: -5, right: -5,
            width: 10, height: 10, borderRadius: "50%",
            background: light ? "rgba(20,20,20,0.5)" : "rgba(255,255,255,0.65)",
            cursor: "nwse-resize", border: "1.5px solid rgba(0,0,0,0.2)", zIndex: 10,
          }}
        />
      )}
    </div>
  );
}