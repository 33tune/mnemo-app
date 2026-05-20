"use client";
import type { CanvasCard, TextFont } from "@/types";
import { UI } from "@/styles/ui";
import { UIButton, UILabel, UISlider } from "@/components/ui";

const SANS = "'DM Sans', sans-serif";
const MONO = UI.font;

const LAYER_NAMES = ["Back", "Mid", "Front"] as const;

const CARD_TYPES: { type: CanvasCard["type"]; label: string; desc: string }[] = [
  { type: "text",    label: "Note",    desc: "Free text" },
  { type: "list",    label: "List",    desc: "Tasks & checks" },
  { type: "links",   label: "Links",   desc: "Quick links" },
  { type: "gallery", label: "Gallery", desc: "Coming soon" },
  { type: "folder",  label: "Folder",  desc: "Coming soon" },
];

const NOTE_COLORS = [
  "#f5f0d8", "#d4f0c4", "#c4d8f0",
  "#f0c4d4", "#e8d4f0", "#f0e4c4",
];

const CARD_FONTS: { key: TextFont; label: string }[] = [
  { key: "DM Sans",          label: "DM Sans" },
  { key: "Space Mono",       label: "Space Mono" },
  { key: "Impact",           label: "Impact" },
  { key: "Playfair Display", label: "Playfair Display" },
  { key: "Bebas Neue",       label: "Bebas Neue" },
  { key: "Syne",             label: "Syne" },
];

// Shared easing — matches ProfileCard
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

interface Props {
  card:           CanvasCard;
  cardMenuTab:    "type" | "style" | "layer";
  setCardMenuTab: (tab: "type" | "style" | "layer") => void;
  updateCard:     (id: string, patch: Partial<CanvasCard>) => void;
  bgCardId:       React.MutableRefObject<string | null>;
  bgImageRef:     React.RefObject<HTMLInputElement>;
  cardRect?:      DOMRect;
}

export default function CardMenu({
  card, cardMenuTab, setCardMenuTab, updateCard, bgCardId, bgImageRef, cardRect,
}: Props) {
  const menuPos = cardRect
    ? {
        x: Math.max(8, Math.min(cardRect.right + 8, window.innerWidth  - 248)),
        y: Math.max(52, Math.min(cardRect.top,       window.innerHeight - 520)),
      }
    : { x: 8, y: 52 };

  return (
    <>
      {/* Enter animation — same as ProfileCard menu */}
      <style>{`
        @keyframes cmenu-in {
          from { opacity: 0; transform: translateX(6px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
        .cmenu { animation: cmenu-in 0.14s ${EASE} both; }
      `}</style>

      <div
        className="cmenu"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          position:      "fixed",
          top:           menuPos.y,
          left:          menuPos.x,
          zIndex:        9999,
          width:         232,
          background:    "#09090b",
          border:        `1px solid ${UI.colors.border}`,
          borderRadius:  5,
          padding:       "16px 14px 20px",
          boxShadow:     "0 2px 20px rgba(0,0,0,0.5)",
          fontFamily:    SANS,
          maxHeight:     "86vh",
          overflowY:     "auto",
          scrollbarWidth: "thin" as React.CSSProperties["scrollbarWidth"],
          scrollbarColor: `${UI.colors.border} transparent`,
        } as React.CSSProperties}
      >

        {/* ── Tab bar ─────────────────────────────── */}
        <div style={{
          display:      "flex",
          borderBottom: `1px solid ${UI.colors.border}`,
          marginBottom: 20,
          opacity:      0.9,
        }}>
          {(["type", "style", "layer"] as const).map(tab => {
            const active = cardMenuTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setCardMenuTab(tab)}
                style={{
                  flex:          1,
                  padding:       "6px 0",
                  border:        "none",
                  borderBottom:  active ? "2px solid rgba(255,255,255,0.55)" : "2px solid transparent",
                  marginBottom:  -1,
                  background:    "transparent",
                  color:         active ? UI.colors.text : UI.colors.textFaint,
                  fontSize:      9,
                  fontFamily:    MONO,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  cursor:        "pointer",
                  transition:    `color 0.12s ${EASE}, border-color 0.12s ${EASE}`,
                }}
              >
                {tab === "type" ? "Type" : tab === "style" ? "Style" : "Layer"}
              </button>
            );
          })}
        </div>

        {/* ── TYPE tab ────────────────────────────── */}
        {cardMenuTab === "type" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CARD_TYPES.map(t => {
              const dis = t.type === "gallery" || t.type === "folder";
              const act = card.type === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => !dis && updateCard(card.id, { type: t.type })}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "space-between",
                    padding:        "9px 10px",
                    borderRadius:   3,
                    border:         act
                      ? `1px solid ${UI.colors.borderStrong}`
                      : "1px solid transparent",
                    background: act ? "rgba(255,255,255,0.05)" : "transparent",
                    cursor:     dis ? "default" : "pointer",
                    opacity:    dis ? 0.28 : 1,
                    width:      "100%",
                    fontFamily: SANS,
                    transition: `background 0.1s ${EASE}, border-color 0.1s ${EASE}`,
                  }}
                  onMouseEnter={e => { if (!dis && !act) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = act ? "rgba(255,255,255,0.05)" : "transparent"; }}
                >
                  <div>
                    <div style={{
                      fontSize:   12,
                      color:      act ? UI.colors.text : UI.colors.textDim,
                      fontWeight: act ? 600 : 400,
                    }}>
                      {t.label}
                    </div>
                    <div style={{
                      fontSize:      9,
                      color:         UI.colors.textFaint,
                      fontFamily:    MONO,
                      letterSpacing: "0.5px",
                      marginTop:     2,
                    }}>
                      {t.desc}
                    </div>
                  </div>
                  {act && (
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: "rgba(212,240,196,0.8)",
                      flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}

            {/* Rotation — text / list only */}
            {(card.type === "text" || card.type === "list") && (
              <div style={{ marginTop: 10, padding: "10px", borderRadius: 3, background: "rgba(255,255,255,0.03)" }}>
                <UISlider
                  label="Rotation"
                  value={Number(card.rotation.toFixed(1))}
                  unit="°"
                  min={-20} max={20} step={0.5}
                  onChange={v => updateCard(card.id, { rotation: v })}
                  onMouseDown={e => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}

        {/* ── STYLE tab ───────────────────────────── */}
        {cardMenuTab === "style" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Note colors */}
            {(card.type === "text" || card.type === "list") && (
              <div>
                <div style={{ marginBottom: 10 }}><UILabel>Color nota</UILabel></div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {/* Transparent swatch */}
                  <div
                    onClick={() => updateCard(card.id, { bgColor: "", bgImage: "" })}
                    style={{
                      width: 24, height: 24, borderRadius: 3, cursor: "pointer",
                      background: "rgba(255,255,255,0.05)",
                      border: card.bgColor === ""
                        ? `2px solid ${UI.colors.borderStrong}`
                        : `1.5px solid ${UI.colors.border}`,
                      transition: `border-color 0.1s ${EASE}`,
                    }}
                  />
                  {NOTE_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => updateCard(card.id, { bgColor: c, bgImage: "" })}
                      style={{
                        width: 24, height: 24, borderRadius: 3,
                        background: c, cursor: "pointer",
                        border: card.bgColor === c
                          ? "2px solid rgba(255,255,255,0.75)"
                          : "1.5px solid rgba(0,0,0,0.1)",
                        transition: `border-color 0.1s ${EASE}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Font family */}
            {(card.type === "text" || card.type === "list" || card.type === "links") && (
              <div>
                <div style={{ marginBottom: 8 }}><UILabel>Font</UILabel></div>
                <select
                  value={card.cardFont ?? "DM Sans"}
                  onChange={e => updateCard(card.id, { cardFont: e.target.value as TextFont })}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width:      "100%",
                    padding:    "6px 8px",
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.04)",
                    border:     `1px solid ${UI.colors.border}`,
                    color:      UI.colors.textDim,
                    fontSize:   11,
                    outline:    "none",
                    cursor:     "pointer",
                    fontFamily: SANS,
                    transition: `border-color 0.12s ${EASE}`,
                  }}
                >
                  {CARD_FONTS.map(f => (
                    <option key={f.key} value={f.key} style={{ background: "#09090b" }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Font size */}
            {(card.type === "text" || card.type === "list" || card.type === "links") && (
              <div>
                <div style={{ marginBottom: 8 }}><UILabel>Size</UILabel></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => updateCard(card.id, { cardFontSize: Math.max(8, (card.cardFontSize ?? 14) - 2) })}
                    style={{
                      width: 26, height: 26, flexShrink: 0,
                      borderRadius: 3,
                      border:       `1px solid ${UI.colors.border}`,
                      background:   "transparent",
                      color:        UI.colors.textDim,
                      cursor:       "pointer",
                      fontSize:     14,
                      display:      "flex", alignItems: "center", justifyContent: "center",
                      fontFamily:   MONO,
                      transition:   UI.transition,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = UI.colors.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = UI.colors.textDim; }}
                  >−</button>
                  <span style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 11, color: UI.colors.textDim }}>
                    {card.cardFontSize ?? 14}px
                  </span>
                  <button
                    onClick={() => updateCard(card.id, { cardFontSize: Math.min(72, (card.cardFontSize ?? 14) + 2) })}
                    style={{
                      width: 26, height: 26, flexShrink: 0,
                      borderRadius: 3,
                      border:       `1px solid ${UI.colors.border}`,
                      background:   "transparent",
                      color:        UI.colors.textDim,
                      cursor:       "pointer",
                      fontSize:     14,
                      display:      "flex", alignItems: "center", justifyContent: "center",
                      fontFamily:   MONO,
                      transition:   UI.transition,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = UI.colors.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = UI.colors.textDim; }}
                  >+</button>
                </div>
              </div>
            )}

            {/* Text color */}
            {(card.type === "text" || card.type === "list" || card.type === "links") && (
              <div>
                <div style={{ marginBottom: 8 }}><UILabel>Color texto</UILabel></div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div
                    onClick={() => updateCard(card.id, { textColor: "" })}
                    title="Auto (según fondo)"
                    style={{
                      width:          26, height: 26, borderRadius: 3, flexShrink: 0,
                      background:     "rgba(255,255,255,0.04)",
                      border:         !card.textColor
                        ? `1.5px solid ${UI.colors.borderStrong}`
                        : `1.5px solid ${UI.colors.border}`,
                      cursor:         "pointer",
                      display:        "flex", alignItems: "center", justifyContent: "center",
                      fontFamily:     SANS,
                      fontSize:       9,
                      color:          UI.colors.textFaint,
                      transition:     `border-color 0.1s ${EASE}`,
                    }}
                  >
                    A
                  </div>
                  <div style={{
                    flex: 1, height: 26, borderRadius: 3,
                    overflow: "hidden", border: `1px solid ${UI.colors.border}`,
                  }}>
                    <input
                      type="color"
                      value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                      onChange={e => updateCard(card.id, { textColor: e.target.value })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ width: "100%", height: "100%", border: "none", cursor: "pointer", padding: 2 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Background color */}
            <div>
              <div style={{ marginBottom: 8 }}><UILabel>Color fondo</UILabel></div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div
                  onClick={() => updateCard(card.id, { bgColor: "", bgImage: "" })}
                  style={{
                    width:      26, height: 26, borderRadius: 3, flexShrink: 0,
                    background: "rgba(255,255,255,0.04)",
                    border:     card.bgColor === ""
                      ? `1.5px solid ${UI.colors.borderStrong}`
                      : `1.5px solid ${UI.colors.border}`,
                    cursor:     "pointer",
                    transition: `border-color 0.1s ${EASE}`,
                  }}
                />
                <div style={{
                  flex: 1, height: 26, borderRadius: 3,
                  overflow: "hidden", border: `1px solid ${UI.colors.border}`,
                }}>
                  <input
                    type="color"
                    value={card.bgColor?.startsWith("#") ? card.bgColor : "#141416"}
                    onChange={e => updateCard(card.id, { bgColor: e.target.value, bgImage: "" })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ width: "100%", height: "100%", border: "none", cursor: "pointer", padding: 2 }}
                  />
                </div>
              </div>
            </div>

            {/* Opacity */}
            <UISlider
              label="Transparencia"
              value={Math.round(card.opacity * 100)}
              unit="%"
              min={5} max={100}
              onChange={v => updateCard(card.id, { opacity: v / 100 })}
              onMouseDown={e => e.stopPropagation()}
            />

            {/* Background image */}
            <div>
              <div style={{ marginBottom: 8 }}><UILabel>Imagen de fondo</UILabel></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <UIButton
                  onClick={() => { bgCardId.current = card.id; bgImageRef.current?.click(); }}
                  full
                >
                  + subir imagen
                </UIButton>
                {card.bgImage && (
                  <UIButton onClick={() => updateCard(card.id, { bgImage: "" })} danger full>
                    quitar imagen
                  </UIButton>
                )}
              </div>
            </div>

            {/* Border radius */}
            <UISlider
              label="Redondeado"
              value={card.borderRadius}
              unit="px"
              min={0} max={60}
              onChange={v => updateCard(card.id, { borderRadius: v })}
              onMouseDown={e => e.stopPropagation()}
            />
          </div>
        )}

        {/* ── LAYER tab ───────────────────────────── */}
        {cardMenuTab === "layer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ marginBottom: 6 }}><UILabel>Layer</UILabel></div>

            {([0, 1, 2] as const).map(l => {
              const active = card.layer === l;
              return (
                <button
                  key={l}
                  onClick={() => updateCard(card.id, { layer: l })}
                  style={{
                    padding:      "10px 12px",
                    borderRadius: 3,
                    border:       active
                      ? "1px solid rgba(212,240,196,0.3)"
                      : `1px solid ${UI.colors.border}`,
                    background:  active ? "rgba(212,240,196,0.08)" : "rgba(255,255,255,0.02)",
                    cursor:      "pointer",
                    fontFamily:  SANS,
                    width:       "100%",
                    textAlign:   "left",
                    transition:  `background 0.12s ${EASE}, border-color 0.12s ${EASE}`,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(212,240,196,0.08)" : "rgba(255,255,255,0.02)"; }}
                >
                  <div style={{
                    fontSize:   12,
                    fontWeight: active ? 600 : 400,
                    color:      active ? "rgba(212,240,196,0.92)" : UI.colors.textDim,
                  }}>
                    {LAYER_NAMES[l]}
                  </div>
                  <div style={{
                    fontSize:      9,
                    color:         UI.colors.textFaint,
                    fontFamily:    MONO,
                    marginTop:     3,
                    letterSpacing: "0.5px",
                  }}>
                    {l === 0 ? "slow parallax — background" : l === 1 ? "mid parallax — decoration" : "fast parallax — foreground"}
                  </div>
                </button>
              );
            })}

            <div style={{ marginTop: 8 }}>
              <UISlider
                label="Depth"
                value={Math.round(card.depth * 100)}
                unit=""
                min={0} max={100}
                onChange={v => updateCard(card.id, { depth: v / 100 })}
                onMouseDown={e => e.stopPropagation()}
              />
              <div style={{ textAlign: "right", marginTop: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: UI.colors.textFaint }}>
                  {card.depth.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
