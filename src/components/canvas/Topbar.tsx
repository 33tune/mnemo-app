"use client";
import { useState, useEffect, useRef } from "react";
import type { CanvasMode, PublishState } from "@/types";
import { T, Icon } from "@/ui";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";

/** Editor v3 Phase D: what the EDITOR variant of the topbar needs (only the
 * owner editing their canvas gets it — visitors keep the classic bar). */
export interface EditorTopbarProps {
  /** Mono route next to the wordmark ("@mara / my land"). */
  path: string;
  /** Space taken by the tool rail on the left (0 without rail). */
  left: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** The public profile (Vista previa). */
  previewHref?: string;
  undoKeys: string;
  redoKeys: string;
  /** Narrow viewports (the bottom-sheet layout, design screen 10): wordmark,
   * Deshacer and Publicar at 44px; everything else under "Más" (1.4.10). */
  compact?: boolean;
}

const MONO = "'Space Mono', monospace";

export default function Topbar({
  wallpaper,
  handle,
  onLogout,
  onBack,
  canvasMode,
  onModeChange,
  publishState,
  onPublish,
  isBrowse,
  onBrowse,
  isChats,
  onChats,
  unreadChats,
  unreadSignals,
  onSignals,
  editor,
}: {
  wallpaper: string;
  handle?: string;
  onLogout?: () => Promise<void>;
  onBack?: () => void;
  canvasMode?: CanvasMode;
  onModeChange?: (newMode: CanvasMode) => Promise<void>;
  publishState?: PublishState;
  onPublish?: () => void;
  isBrowse?: boolean;
  onBrowse?: () => void;
  isChats?: boolean;
  onChats?: () => void;
  unreadChats?:   number;
  unreadSignals?: number;
  onSignals?:     () => void;
  /** Editor v3 Phase D: the glass editor topbar. Absent = the classic bar
   * (visitors, Browse, chats) — unchanged. */
  editor?:        EditorTopbarProps;
}) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [pulse, setPulse] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    const next = unreadChats ?? 0;
    if (next > prevUnreadRef.current) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 500);
      prevUnreadRef.current = next;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = next;
  }, [unreadChats]);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" }).toUpperCase());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 3000);
    return () => clearInterval(id);
  }, []);

  const tabs: { key: string; label: string; active: boolean; onClick: () => void }[] = [];
  if (onModeChange && canvasMode) {
    const inSpace = canvasMode === "space" || canvasMode === "space_mobile";
    tabs.push({
      key:    "space",
      label:  "MY LAND",
      active: inSpace && !isBrowse && !isChats,
      onClick: () => { if (!inSpace) onModeChange("space"); },
    });
  }
  if (onChats) tabs.push({ key: "chats", label: "SOCIAL", active: !!isChats, onClick: onChats });

  if (editor) {
    return (
      <EditorTopbar editor={editor} tabs={tabs} publishState={publishState} onPublish={onPublish}
        unreadChats={unreadChats} unreadSignals={unreadSignals} onSignals={onSignals} onLogout={onLogout} />
    );
  }

  return (
    <>
      {(publishState === "publishing" || badgePulse) && (
        <style>{`
          @keyframes mnemo-pub-pulse { 0%,100% { opacity:0.3 } 50% { opacity:0.85 } }
          @keyframes badgePop { 0% { transform:scale(1) } 40% { transform:scale(1.4) } 100% { transform:scale(1) } }
        `}</style>
      )}
      <div suppressHydrationWarning style={{
        position:            "fixed",
        top:                 0,
        left:                0,
        right:               0,
        height:              44,
        zIndex:              800,
        display:             "flex",
        alignItems:          "center",
        padding:             "0 18px",
        background:          wallpaper ? "rgba(0,0,0,0.38)" : "rgba(7,7,9,0.9)",
        backdropFilter:      "blur(28px)",
        WebkitBackdropFilter:"blur(28px)",
        borderBottom:        "1px solid rgba(255,255,255,0.07)",
      }}>

        {/* ── Back ── */}
        {onBack && <BackBtn onClick={onBack} />}

        {/* ── Logo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width:      5,
            height:     5,
            borderRadius:"50%",
            background: pulse ? "rgba(232,224,212,0.92)" : "rgba(232,224,212,0.28)",
            transition: "background 1.8s ease, box-shadow 1.8s ease",
            boxShadow:  pulse ? "0 0 7px rgba(232,224,212,0.55)" : "none",
          }} />
          <span style={{
            fontFamily:    MONO,
            fontSize:      10,
            letterSpacing: 1.5,
            color:         "rgba(255,255,255,0.55)",
            userSelect:    "none",
          }}>
            myLand
          </span>
        </div>

        {/* ── Tabs — centered ── */}
        {tabs.length > 0 && (
          <div style={{
            position:   "absolute",
            left:       "50%",
            transform:  "translateX(-50%)",
            display:    "flex",
            alignItems: "center",
            gap:        1,
            background: "rgba(255,255,255,0.03)",
            border:     "1px solid rgba(255,255,255,0.07)",
            borderRadius: 6,
            padding:    "3px",
          }}>
            {tabs.map(tab => (
              <TabBtn
                key={tab.key}
                active={tab.active}
                onClick={tab.onClick}
                badge={tab.key === "chats" && (unreadChats ?? 0) > 0 ? unreadChats : undefined}
                badgePulse={badgePulse}
              >
                {tab.label}
              </TabBtn>
            ))}
          </div>
        )}

        {/* ── Right side ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto", flexShrink: 0 }}>

          {publishState !== undefined && (
            <button
              onClick={publishState === "pending" ? onPublish : undefined}
              disabled={publishState !== "pending"}
              style={{
                background:    "transparent",
                border:        `1px solid ${
                  publishState === "pending"    ? "rgba(212,240,196,0.32)" :
                  publishState === "success"    ? "rgba(212,240,196,0.18)" :
                                                  "rgba(255,255,255,0.07)"
                }`,
                borderRadius:  4,
                padding:       "3px 10px",
                fontFamily:    MONO,
                fontSize:      8,
                letterSpacing: 1.8,
                color:
                  publishState === "pending"    ? "rgba(212,240,196,0.92)" :
                  publishState === "success"    ? "rgba(212,240,196,0.62)" :
                  publishState === "publishing" ? "rgba(255,255,255,0.35)" :
                                                  "rgba(255,255,255,0.18)",
                textTransform: "uppercase",
                cursor:        publishState === "pending" ? "pointer" : "default",
                transition:    "all 0.1s ease",
                animation:     publishState === "publishing" ? "mnemo-pub-pulse 1.1s ease-in-out infinite" : undefined,
              }}
              onMouseEnter={e => { if (publishState === "pending") { e.currentTarget.style.borderColor = "rgba(212,240,196,0.55)"; e.currentTarget.style.background = "rgba(212,240,196,0.06)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = publishState === "pending" ? "rgba(212,240,196,0.32)" : "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "transparent"; }}
            >
              {publishState === "idle"        ? "published"     :
               publishState === "pending"     ? "publish"       :
               publishState === "publishing"  ? "publishing..." :
                                                "published ✓"}
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.35)" }}>
              {date}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.58)", fontVariantNumeric: "tabular-nums" }}>
              {time}
            </span>
          </div>

          {onSignals && (
            <SignalsBtn count={unreadSignals ?? 0} onClick={onSignals} />
          )}

          {handle && (
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              @{handle}
            </span>
          )}

          {onLogout && (
            <LogoutBtn onClick={onLogout} />
          )}
        </div>
      </div>
    </>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function TabBtn({
  children,
  active,
  onClick,
  badge,
  badgePulse,
}: {
  children:    React.ReactNode;
  active:      boolean;
  onClick:     () => void;
  badge?:      number;
  badgePulse?: boolean;
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
        gap:           5,
        padding:       "4px 13px",
        borderRadius:  4,
        border:        active ? "1px solid rgba(255,255,255,0.13)" : "1px solid transparent",
        background:    active
          ? "rgba(255,255,255,0.11)"
          : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color:         active
          ? "rgba(255,255,255,0.92)"
          : hov ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.38)",
        fontFamily:    "'Space Mono', monospace",
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
      {badge !== undefined && badge > 0 && (
        <span style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.7)",
          color:          "#07070a",
          fontFamily:     "'Space Mono', monospace",
          fontSize:       7,
          fontWeight:     700,
          letterSpacing:  0,
          borderRadius:   2,
          padding:        "1px 4px",
          lineHeight:     1.2,
          minWidth:       14,
          animation:      badgePulse ? "badgePop 0.4s ease-out" : undefined,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Signals button ─────────────────────────────────────────────────────────────
function SignalsBtn({ count, onClick }: { count: number; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const hasUnread = count > 0;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           5,
        background:    "transparent",
        border:        `1px solid ${hov ? "rgba(255,255,255,0.18)" : hasUnread ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
        borderRadius:  4,
        padding:       "3px 8px",
        fontFamily:    "'Space Mono', monospace",
        fontSize:      8,
        letterSpacing: 1.5,
        color:         hov ? "rgba(255,255,255,0.72)" : hasUnread ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.28)",
        textTransform: "uppercase",
        cursor:        "pointer",
        transition:    "all 0.1s ease",
        userSelect:    "none",
      }}
    >
      SIG
      {hasUnread && (
        <span style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     "rgba(255,255,255,0.82)",
          color:          "#07070a",
          fontFamily:     "'Space Mono', monospace",
          fontSize:       7,
          fontWeight:     700,
          letterSpacing:  0,
          borderRadius:   2,
          padding:        "1px 4px",
          lineHeight:     1.2,
          minWidth:       14,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Back button ────────────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Volver"
      style={{
        display:       "flex",
        alignItems:    "center",
        justifyContent:"center",
        width:         26,
        height:        26,
        marginRight:   12,
        borderRadius:  6,
        flexShrink:    0,
        background:    hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
        border:        `1px solid ${hov ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
        color:         hov ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
        cursor:        "pointer",
        transition:    "all 0.1s ease",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
      </svg>
    </button>
  );
}

// ── Logout button ──────────────────────────────────────────────────────────────
function LogoutBtn({ onClick }: { onClick: () => Promise<void> }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:    "transparent",
        border:        `1px solid ${hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`,
        borderRadius:  4,
        padding:       "3px 9px",
        fontFamily:    "'Space Mono', monospace",
        fontSize:      8,
        letterSpacing: 1.5,
        color:         hov ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.28)",
        textTransform: "uppercase",
        cursor:        "pointer",
        transition:    "all 0.1s ease",
        userSelect:    "none",
      }}
    >
      exit
    </button>
  );
}

// ── Editor variant (MYLAND Editor v3 Phase D) ──────────────────────────────────
// Glass topbar of the design (screen 01), only in the owner's editor: an
// editor UI surface ([data-mnemo-ui]) themed Light / Dark / OG. 60px high,
// right of the rail, OVER the canvas (CANVAS_TOP_OFFSET stays 44 — plan R1).
// Keeps every function of the classic bar (MY LAND / SOCIAL, signals,
// logout); adds Deshacer / Rehacer (Phase C history), Vista previa (the
// existing public profile) and Publicar with the existing states — no
// unpublished-change count (out of scope, the design's own fallback).
const PUBLISH_LABEL: Record<PublishState, string> = {
  idle: "Publicado", pending: "Publicar", publishing: "Publicando…", success: "Publicado",
};

function EditorTopbar({ editor, tabs, publishState, onPublish, unreadChats, unreadSignals, onSignals, onLogout }: {
  editor: EditorTopbarProps;
  tabs: { key: string; label: string; active: boolean; onClick: () => void }[];
  publishState?: PublishState;
  onPublish?: () => void;
  unreadChats?: number;
  unreadSignals?: number;
  onSignals?: () => void;
  onLogout?: () => Promise<void>;
}) {
  if (editor.compact) {
    return (
      <CompactEditorTopbar editor={editor} tabs={tabs} publishState={publishState} onPublish={onPublish}
        unreadChats={unreadChats} unreadSignals={unreadSignals} onSignals={onSignals} onLogout={onLogout} />
    );
  }
  return (
    <header
      {...{ [EDITOR_UI_ATTR]: "" }}
      className="mn-topbar"
      style={{
        position: "fixed", top: 0, left: editor.left, right: 0, height: T.ui.size.editorTopbarH, zIndex: 800,
        display: "flex", alignItems: "center", gap: 12, padding: "0 14px 0 20px", boxSizing: "border-box",
        fontFamily: T.uiFont.sans,
      }}
    >
      <span className="mn-topbar__wordmark">myland</span>
      <span className="mn-topbar__path">{editor.path}</span>

      {tabs.length > 0 && (
        <div role="group" aria-label="Sección" className="mn-topbar__tabs">
          {tabs.map(tab => (
            <button key={tab.key} type="button" className="mn-topbar__tab" aria-pressed={tab.active} onClick={tab.onClick}>
              {tab.label}
              {tab.key === "chats" && (unreadChats ?? 0) > 0 && <span className="mn-topbar__count">{unreadChats}</span>}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        {onSignals && (
          <button type="button" className="mn-topbar__btn mn-topbar__btn--text" onClick={onSignals}
            aria-label={(unreadSignals ?? 0) > 0 ? `Señales, ${unreadSignals} sin leer` : "Señales"}>
            Señales
            {(unreadSignals ?? 0) > 0 && <span className="mn-topbar__count">{unreadSignals}</span>}
          </button>
        )}
        <div style={{ display: "flex", gap: 2, marginLeft: 6 }}>
          <button type="button" className="mn-topbar__btn" aria-label="Deshacer" title={`Deshacer ${editor.undoKeys}`}
            aria-keyshortcuts={editor.undoKeys.replace("⌘", "Meta+")} aria-disabled={!editor.canUndo || undefined}
            onClick={() => { if (editor.canUndo) editor.onUndo(); }}>
            <Icon name="undo" size={16} />
          </button>
          <button type="button" className="mn-topbar__btn" aria-label="Rehacer" title={`Rehacer ${editor.redoKeys}`}
            aria-disabled={!editor.canRedo || undefined}
            onClick={() => { if (editor.canRedo) editor.onRedo(); }}>
            <Icon name="redo" size={16} />
          </button>
        </div>
        {editor.previewHref && (
          <a className="mn-topbar__btn mn-topbar__btn--text mn-topbar__btn--filled" href={editor.previewHref} target="_blank" rel="noopener noreferrer"
            aria-label="Vista previa (se abre en otra pestaña)">
            <Icon name="eye" size={15} /> Vista previa
          </a>
        )}
        {publishState !== undefined && (
          <button type="button" className="mn-topbar__publish" data-state={publishState}
            onClick={publishState === "pending" ? onPublish : undefined}
            aria-disabled={publishState !== "pending" || undefined}
            aria-live="polite">
            {publishState === "success" && <Icon name="check" size={15} />}
            {PUBLISH_LABEL[publishState]}
          </button>
        )}
        {onLogout && (
          <button type="button" className="mn-topbar__btn mn-topbar__btn--text" onClick={() => { void onLogout(); }}>Salir</button>
        )}
      </div>
    </header>
  );
}

// Phase D review (1.4.10 Reflow): the editor topbar on narrow viewports —
// design screen 10 keeps the wordmark, Deshacer and Publicar (44px targets);
// every other function of the full bar (MY LAND / SOCIAL, Señales, Rehacer,
// Vista previa, Salir) stays one tap away under "Más", nothing is dropped.
const MORE_MENU_ID = "mnemo-topbar-more";

function CompactEditorTopbar({ editor, tabs, publishState, onPublish, unreadChats, unreadSignals, onSignals, onLogout }: {
  editor: EditorTopbarProps;
  tabs: { key: string; label: string; active: boolean; onClick: () => void }[];
  publishState?: PublishState;
  onPublish?: () => void;
  unreadChats?: number;
  unreadSignals?: number;
  onSignals?: () => void;
  onLogout?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const unread = (unreadChats ?? 0) + (unreadSignals ?? 0);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) requestAnimationFrame(() => moreRef.current?.focus({ preventScroll: true }));
  };
  // A press outside the menu closes it (focus stays where the user went).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !moreRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);
  // Activating an item closes the menu and runs it.
  const run = (fn?: () => void) => () => { close(false); fn?.(); };

  return (
    <header
      {...{ [EDITOR_UI_ATTR]: "" }}
      className="mn-topbar mn-topbar--compact"
      style={{
        position: "fixed", top: 0, left: editor.left, right: 0, height: T.ui.size.editorTopbarH, zIndex: 800,
        display: "flex", alignItems: "center", gap: 4, padding: "0 8px 0 16px", boxSizing: "border-box",
        fontFamily: T.uiFont.sans,
      }}
    >
      <span className="mn-topbar__wordmark">myland</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
        <button type="button" className="mn-topbar__btn mn-topbar__btn--touch" aria-label="Deshacer" title={`Deshacer ${editor.undoKeys}`}
          aria-keyshortcuts={editor.undoKeys.replace("⌘", "Meta+")} aria-disabled={!editor.canUndo || undefined}
          onClick={() => { if (editor.canUndo) editor.onUndo(); }}>
          <Icon name="undo" size={18} />
        </button>
        {publishState !== undefined && (
          <button type="button" className="mn-topbar__publish mn-topbar__publish--touch" data-state={publishState}
            onClick={publishState === "pending" ? onPublish : undefined}
            aria-disabled={publishState !== "pending" || undefined}
            aria-live="polite">
            {publishState === "success" && <Icon name="check" size={15} />}
            {PUBLISH_LABEL[publishState]}
          </button>
        )}
        <button ref={moreRef} type="button" className="mn-topbar__btn mn-topbar__btn--touch"
          aria-label={unread > 0 ? `Más opciones, ${unread} sin leer` : "Más opciones"} title="Más opciones"
          aria-expanded={open} aria-controls={open ? MORE_MENU_ID : undefined}
          onKeyDown={e => { if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); close(false); } }}
          onClick={() => setOpen(o => !o)}>
          <Icon name="more" size={18} />
          {unread > 0 && <span aria-hidden="true" className="mn-topbar__dot" />}
        </button>
      </div>

      {open && (
        <div ref={menuRef} id={MORE_MENU_ID} role="group" aria-label="Más opciones" className="mn-topbar__menu"
          onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); } }}>
          {tabs.map(tab => (
            <button key={tab.key} type="button" className="mn-menuitem" aria-pressed={tab.active} onClick={run(tab.onClick)}>
              <span>{tab.label}</span>
              {tab.key === "chats" && (unreadChats ?? 0) > 0 && <span className="mn-topbar__count">{unreadChats}</span>}
            </button>
          ))}
          {onSignals && (
            <button type="button" className="mn-menuitem" onClick={run(onSignals)}
              aria-label={(unreadSignals ?? 0) > 0 ? `Señales, ${unreadSignals} sin leer` : "Señales"}>
              <span>Señales</span>
              {(unreadSignals ?? 0) > 0 && <span className="mn-topbar__count">{unreadSignals}</span>}
            </button>
          )}
          <button type="button" className="mn-menuitem" aria-disabled={!editor.canRedo || undefined}
            onClick={() => { if (editor.canRedo) run(editor.onRedo)(); }}>
            <span>Rehacer</span><span className="mn-topbar__keys">{editor.redoKeys}</span>
          </button>
          {editor.previewHref && (
            <a className="mn-menuitem" href={editor.previewHref} target="_blank" rel="noopener noreferrer" onClick={() => close(false)}
              aria-label="Vista previa (se abre en otra pestaña)">
              <span>Vista previa</span><Icon name="eye" size={15} />
            </a>
          )}
          {onLogout && (
            <button type="button" className="mn-menuitem" onClick={run(() => { void onLogout(); })}>
              <span>Salir</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
