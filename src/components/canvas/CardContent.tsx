"use client";
import { useState } from "react";
import type { CanvasCard, TextFont } from "@/types";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const FONT_MAP: Record<TextFont, string> = {
  "DM Sans":          "'DM Sans', sans-serif",
  "Space Mono":       "'Space Mono', monospace",
  "Impact":           "Impact, sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Bebas Neue":       "'Bebas Neue', sans-serif",
  "Syne":             "'Syne', sans-serif",
};

function cardFontStyle(font?: TextFont): string {
  return font ? (FONT_MAP[font] ?? SANS) : SANS;
}

function getLuminance(hex: string): number {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function isLight(bg: string): boolean {
  return getLuminance(bg) > 0.5;
}

export function textColor(bg: string): string {
  if (!bg || bg === "") return "rgba(255,255,255,0.88)";
  return getLuminance(bg) > 0.5 ? "rgba(15,15,15,0.85)" : "rgba(255,255,255,0.88)";
}

type UpdateCard = (id: string, patch: Partial<CanvasCard>) => void;

export function renderContent(card: CanvasCard, tc: string, isEdit: boolean, updateCard?: UpdateCard) {
  const fontFamily = cardFontStyle(card.cardFont);
  const fontSize = card.cardFontSize ?? 14;

  switch (card.type) {
    case "text": return (
      <textarea
        value={card.content ?? ""}
        readOnly={!isEdit}
        onChange={e => { if (isEdit) updateCard?.(card.id, { content: e.target.value }); }}
        placeholder="..."
        onMouseDown={e => { if (isEdit) e.stopPropagation(); }}
        onClick={e => { if (isEdit) e.stopPropagation(); }}
        style={{
          width: "100%", height: "100%",
          background: "transparent", border: "none", outline: "none", resize: "none",
          color: tc, fontSize, lineHeight: 1.75, fontFamily,
          cursor: isEdit ? "text" : "grab",
        }}
      />
    );
    case "list":  return <CardList  card={card} tc={tc} isEdit={isEdit} updateCard={updateCard} fontFamily={fontFamily} fontSize={fontSize} />;
    case "links": return <CardLinks card={card} tc={tc} isEdit={isEdit} updateCard={updateCard} fontFamily={fontFamily} fontSize={fontSize} />;
    default: return null;
  }
}

function CardList({ card, tc, isEdit, updateCard, fontFamily, fontSize }: {
  card: CanvasCard; tc: string; isEdit: boolean; updateCard?: UpdateCard; fontFamily: string; fontSize: number;
}) {
  const items = card.listItems ?? [];
  const [input, setInput] = useState("");
  const borderC = tc === "rgba(15,15,15,0.85)" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.18)";

  function addItem() {
    if (!input.trim() || !updateCard) return;
    updateCard(card.id, { listItems: [...items, { id: crypto.randomUUID(), text: input.trim(), checked: false }] });
    setInput("");
  }

  function toggleItem(id: string) {
    if (!updateCard) return;
    updateCard(card.id, { listItems: items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 2, fontFamily }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 2px" }}>
            <div
              onClick={() => isEdit && toggleItem(item.id)}
              onMouseDown={e => e.stopPropagation()}
              style={{
                width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
                border: item.checked ? "none" : `1px solid ${borderC}`,
                background: item.checked ? tc : "transparent",
                cursor: isEdit ? "pointer" : "grab",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {item.checked && (
                <svg width="7" height="7" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3l2 2 4-4" stroke={tc === "rgba(15,15,15,0.85)" ? "#fff" : "#000"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontSize, color: item.checked ? `${tc.slice(0, -2)}0.25)` : tc, textDecoration: item.checked ? "line-through" : "none", lineHeight: 1.5 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
      {isEdit && (
        <div style={{ borderTop: items.length > 0 ? `1px solid ${tc === "rgba(15,15,15,0.85)" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}` : "none", paddingTop: items.length > 0 ? 6 : 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && input.trim()) addItem(); }}
            onMouseDown={e => e.stopPropagation()}
            placeholder="agregar..."
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: `${tc.slice(0, -2)}0.4)`, fontSize: Math.max(10, fontSize - 2), fontFamily }} />
        </div>
      )}
    </div>
  );
}

function CardLinks({ card, tc, isEdit, updateCard, fontFamily, fontSize }: {
  card: CanvasCard; tc: string; isEdit: boolean; updateCard?: UpdateCard; fontFamily: string; fontSize: number;
}) {
  const links = card.linkItems ?? [];
  const [input, setInput] = useState("");
  const isDark = tc !== "rgba(15,15,15,0.85)";

  function add() {
    if (!input.trim() || !updateCard) return;
    const url = input.startsWith("http") ? input : `https://${input}`;
    let title = input;
    try { title = new URL(url).hostname.replace("www.", ""); } catch {}
    updateCard(card.id, { linkItems: [...links, { id: crypto.randomUUID(), url, title }] });
    setInput("");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 3, fontFamily }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {links.map(link => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
            onMouseDown={e => e.stopPropagation()}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8,
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
              color: tc, fontSize, textDecoration: "none",
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}>
            <img src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=32`} width={14} height={14} alt="" style={{ borderRadius: 3, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.title}</span>
          </a>
        ))}
      </div>
      {isEdit && (
        <div style={{ borderTop: links.length > 0 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}` : "none", paddingTop: links.length > 0 ? 6 : 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") add(); }}
            onMouseDown={e => e.stopPropagation()}
            placeholder="pegar link..."
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: `${tc.slice(0, -2)}0.38)`, fontSize: Math.max(10, fontSize - 2), fontFamily }} />
        </div>
      )}
    </div>
  );
}
