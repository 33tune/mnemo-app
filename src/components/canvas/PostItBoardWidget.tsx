"use client";
import { useState, useRef, memo } from "react";
import type { PostItBoard, PostItItem, SignalTheme, PostStyleKey, CardStyleKey, ImageDisplayMode } from "@/types";
import { trackRender } from "@/lib/perfDebug";
import { uploadToStorage } from "@/lib/storage";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// ── Theme tokens ───────────────────────────────────────────────────────────────
type ThemeTokens = {
  cardBg:        string;
  cardBorder:    string;
  headerBg:      string;
  headerText:    string;
  feedBg:        string;
  postBg:        string;
  postBorder:    string;
  postText:      string;
  postTextDim:   string;
  composerBg:    string;
  composerBorder:string;
  composerText:  string;
  accent:        string;
  accentBorder:  string;
  dotColor:      string;
  scrollbar:     string;
};

const THEMES: Record<SignalTheme, ThemeTokens> = {
  void: {
    cardBg:         "#000000",     cardBorder:     "rgba(255,255,255,0.07)",
    headerBg:       "#000000",     headerText:     "rgba(255,255,255,0.28)",
    feedBg:         "#000000",     postBg:         "transparent",
    postBorder:     "rgba(255,255,255,0.05)",
    postText:       "rgba(255,255,255,0.82)",   postTextDim: "rgba(255,255,255,0.22)",
    composerBg:     "#000000",     composerBorder: "rgba(255,255,255,0.07)",
    composerText:   "rgba(255,255,255,0.65)",
    accent:         "rgba(255,255,255,0.72)",   accentBorder: "rgba(255,255,255,0.18)",
    dotColor:       "rgba(255,255,255,0.2)",    scrollbar:    "rgba(255,255,255,0.04)",
  },
  graphite: {
    cardBg:         "#111113",     cardBorder:     "rgba(255,255,255,0.09)",
    headerBg:       "#0c0c0e",     headerText:     "rgba(255,255,255,0.35)",
    feedBg:         "#111113",     postBg:         "rgba(255,255,255,0.022)",
    postBorder:     "rgba(255,255,255,0.07)",
    postText:       "rgba(255,255,255,0.82)",   postTextDim: "rgba(255,255,255,0.28)",
    composerBg:     "#0c0c0e",     composerBorder: "rgba(255,255,255,0.08)",
    composerText:   "rgba(255,255,255,0.68)",
    accent:         "rgba(212,240,196,0.8)",    accentBorder: "rgba(212,240,196,0.22)",
    dotColor:       "rgba(255,255,255,0.25)",   scrollbar:    "rgba(255,255,255,0.06)",
  },
  terminal: {
    cardBg:         "#050a05",     cardBorder:     "rgba(0,255,80,0.12)",
    headerBg:       "#030703",     headerText:     "rgba(0,255,80,0.42)",
    feedBg:         "#050a05",     postBg:         "rgba(0,255,80,0.02)",
    postBorder:     "rgba(0,255,80,0.08)",
    postText:       "rgba(0,255,80,0.88)",      postTextDim: "rgba(0,255,80,0.3)",
    composerBg:     "#030703",     composerBorder: "rgba(0,255,80,0.1)",
    composerText:   "rgba(0,255,80,0.72)",
    accent:         "rgba(0,255,80,0.82)",      accentBorder: "rgba(0,255,80,0.28)",
    dotColor:       "rgba(0,255,80,0.38)",      scrollbar:    "rgba(0,255,80,0.05)",
  },
  chrome: {
    cardBg:         "#1a1a1e",     cardBorder:     "rgba(200,210,222,0.13)",
    headerBg:       "#14141a",     headerText:     "rgba(200,210,222,0.42)",
    feedBg:         "#1a1a1e",     postBg:         "rgba(200,210,222,0.03)",
    postBorder:     "rgba(200,210,222,0.09)",
    postText:       "rgba(220,228,238,0.88)",   postTextDim: "rgba(200,210,222,0.35)",
    composerBg:     "#14141a",     composerBorder: "rgba(200,210,222,0.1)",
    composerText:   "rgba(200,210,222,0.75)",
    accent:         "rgba(200,210,222,0.82)",   accentBorder: "rgba(200,210,222,0.24)",
    dotColor:       "rgba(200,210,222,0.36)",   scrollbar:    "rgba(200,210,222,0.06)",
  },
  signal: {
    cardBg:         "#07070a",     cardBorder:     "rgba(255,255,255,0.15)",
    headerBg:       "#07070a",     headerText:     "rgba(255,255,255,0.55)",
    feedBg:         "#07070a",     postBg:         "rgba(255,255,255,0.04)",
    postBorder:     "rgba(255,255,255,0.11)",
    postText:       "rgba(255,255,255,0.92)",   postTextDim: "rgba(255,255,255,0.38)",
    composerBg:     "#07070a",     composerBorder: "rgba(255,255,255,0.12)",
    composerText:   "rgba(255,255,255,0.82)",
    accent:         "rgba(255,255,255,0.92)",   accentBorder: "rgba(255,255,255,0.28)",
    dotColor:       "rgba(255,255,255,0.52)",   scrollbar:    "rgba(255,255,255,0.07)",
  },
  notebook: {
    cardBg:         "#f5f2ea",     cardBorder:     "rgba(60,50,40,0.12)",
    headerBg:       "#ede8dd",     headerText:     "rgba(60,50,40,0.42)",
    feedBg:         "#f5f2ea",     postBg:         "rgba(60,50,40,0.025)",
    postBorder:     "rgba(60,50,40,0.08)",
    postText:       "rgba(40,32,24,0.88)",      postTextDim: "rgba(60,50,40,0.36)",
    composerBg:     "#ede8dd",     composerBorder: "rgba(60,50,40,0.1)",
    composerText:   "rgba(40,32,24,0.75)",
    accent:         "rgba(40,32,24,0.82)",      accentBorder: "rgba(40,32,24,0.2)",
    dotColor:       "rgba(60,50,40,0.36)",      scrollbar:    "rgba(60,50,40,0.07)",
  },
  static: {
    cardBg:         "#0a0a0c",     cardBorder:     "rgba(255,255,255,0.06)",
    headerBg:       "#050507",     headerText:     "rgba(255,255,255,0.2)",
    feedBg:         "#0a0a0c",     postBg:         "rgba(255,255,255,0.018)",
    postBorder:     "rgba(255,255,255,0.05)",
    postText:       "rgba(255,255,255,0.62)",   postTextDim: "rgba(255,255,255,0.18)",
    composerBg:     "#050507",     composerBorder: "rgba(255,255,255,0.06)",
    composerText:   "rgba(255,255,255,0.52)",
    accent:         "rgba(255,255,255,0.52)",   accentBorder: "rgba(255,255,255,0.13)",
    dotColor:       "rgba(255,255,255,0.14)",   scrollbar:    "rgba(255,255,255,0.04)",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) return [0, 1, 2].map(i => parseInt(h[i] + h[i], 16)).join(",");
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(",");
}

function expiryOpacity(createdAt: number): number {
  const frac = Math.min((Date.now() - createdAt) / 86400000, 1);
  return Math.max(0.07, 1 - frac * 0.93);
}

function relTime(createdAt: number): string {
  const d = Date.now() - createdAt;
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(d / 86400000)}d`;
}

function diaryDate(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

function terminalTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function buildCardBg(board: PostItBoard, tokens: ThemeTokens): React.CSSProperties {
  const style   = board.cardStyle ?? "solid";
  const opacity = board.bgOpacity ?? 1;
  const rgb     = hexToRgb(tokens.cardBg);

  if (style === "glass")       return { background: `rgba(${rgb},${opacity * 0.78})` };
  if (style === "gradient") {
    const from = board.accentColor ? `${board.accentColor}1c` : `rgba(255,255,255,0.04)`;
    return { background: `linear-gradient(160deg, ${from} 0%, ${tokens.cardBg} 62%)` };
  }
  if (style === "transparent") return { background: `rgba(${rgb},${Math.max(0.04, opacity * 0.12)})` };
  return { background: tokens.cardBg };
}

function getPaddingVH(board: PostItBoard): [number, number] {
  const d = board.paddingDensity ?? "normal";
  if (d === "compact")  return [5, 8];
  if (d === "spacious") return [14, 16];
  return [9, 12];
}

// ── Types ──────────────────────────────────────────────────────────────────────
type ConfigTab = "app" | "type" | "feed" | "media" | "fx";
type DragType  = "image" | "card" | "text" | "gallery" | "profile" | "postit" | "media";

interface Props {
  board:             PostItBoard;
  isSel:             boolean;
  multiSel:          boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (id: string, type: DragType, x: number, y: number, e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (id: string, type: DragType, e: React.MouseEvent) => void;
  onRotateMD:        (id: string, type: DragType, e: React.MouseEvent, cx?: number, cy?: number) => void;
  updateBoard:       (id: string, patch: Partial<PostItBoard>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
}

// ── Main component ─────────────────────────────────────────────────────────────
function PostItBoardWidget({
  board, isSel, multiSel, draggingId,
  parallaxTransform, onMouseDown, onClick,
  onResizeMD, onRotateMD, updateBoard,
  locked, onToggleLock,
  canInteract = true,
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("PostItBoardWidget");
  const tokens     = THEMES[board.theme ?? "graphite"];
  const font       = board.signalFont === "mono" ? MONO : SANS;
  const accent     = board.accentColor ?? tokens.accent;
  const textCol    = board.textColor   ?? tokens.postText;
  const radius     = board.cardBorderRadius ?? 6;
  const shadowA    = 0.3 + (board.shadowIntensity ?? 0.5) * 0.5;
  const blurStr    = (board.blurStrength ?? 0) > 0 ? `blur(${board.blurStrength}px)` : undefined;
  const glowPart   = board.glowEnabled ? `0 0 28px ${accent.length === 7 ? accent + "44" : accent.replace(/[\d.]+\)$/, "0.26)")}, ` : "";
  const borderA    = (board.borderIntensity ?? 0.6) * 0.16;
  const cardBgCss  = buildCardBg(board, tokens);

  const HEADER_H   = 36;
  const COMPOSER_H = canInteract ? 68 : 0;

  const [hovLayer,   setHovLayer]   = useState<number | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configTab,  setConfigTab]  = useState<ConfigTab>("app");
  const [text,       setText]       = useState("");
  const [photoUrl,   setPhotoUrl]   = useState("");
  const photoRef  = useRef<HTMLInputElement>(null);
  const bgImgRef  = useRef<HTMLInputElement>(null);
  const feedRef   = useRef<HTMLDivElement>(null);

  const posts = [...board.posts].sort((a, b) => b.createdAt - a.createdAt);

  function publish() {
    if (!text.trim() && !photoUrl) return;
    updateBoard(board.id, {
      posts: [...board.posts, {
        id: crypto.randomUUID(), text: text.trim(), photo: photoUrl, createdAt: Date.now(),
      }],
    });
    setText(""); setPhotoUrl("");
    // Scroll to top so new post is visible (feed is newest-first)
    requestAnimationFrame(() => {
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setPhotoUrl(await uploadToStorage(f));
    if (photoRef.current) photoRef.current.value = "";
  }

  async function handleBgImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const url = await uploadToStorage(f);
    updateBoard(board.id, { bgImageUrl: url, cardStyle: "image" });
    if (bgImgRef.current) bgImgRef.current.value = "";
  }

  return (
    <div
      style={{
        position:   "absolute",
        left:       board.x,
        top:        board.y,
        width:      board.w,
        height:     board.h,
        zIndex:     board.zIndex + board.layer * 100,
        transform:  `${parallaxTransform} rotate(${board.rotation}deg)`,
        willChange: "transform",
        userSelect: "none",
        cursor:     locked ? "default" : draggingId === board.id ? "grabbing" : "grab",
      }}
      onMouseDown={e => onMouseDown(board.id, "postit", board.x, board.y, e)}
      onClick={onClick}
    >
      <style>{`
        @keyframes signalPostIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* ── Card shell ── */}
      <div style={{
        position:             "absolute",
        inset:                0,
        borderRadius:         radius,
        ...cardBgCss,
        border:               isSel ? "1px solid rgba(255,255,255,0.22)" : `1px solid rgba(255,255,255,${borderA})`,
        backdropFilter:       blurStr,
        WebkitBackdropFilter: blurStr,
        overflow:             "hidden",
        boxShadow:            `${glowPart}0 12px 48px rgba(0,0,0,${shadowA}), 0 2px 8px rgba(0,0,0,0.28)`,
      }}>

        {/* Background overlays */}
        {board.cardStyle === "image" && board.bgImageUrl && (
          <div style={{
            position:           "absolute", inset: 0, zIndex: 0,
            backgroundImage:    `url(${board.bgImageUrl})`,
            backgroundSize:     "cover", backgroundPosition: "center",
            opacity:            0.32,
          }} />
        )}
        {board.cardStyle === "noise" && <NoiseOverlay />}

        {/* ── Header ── */}
        <div
          onMouseDown={e => onMouseDown(board.id, "postit", board.x, board.y, e)}
          style={{
            position:     "relative",
            zIndex:       4,
            height:       HEADER_H,
            background:   board.cardStyle === "transparent" ? "transparent" : tokens.headerBg,
            borderBottom: `1px solid rgba(255,255,255,${borderA})`,
            display:      "flex",
            alignItems:   "center",
            padding:      "0 10px",
            gap:          8,
            cursor:       draggingId === board.id ? "grabbing" : "grab",
            flexShrink:   0,
          }}
        >
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: tokens.dotColor, flexShrink: 0 }} />
          <span style={{
            fontFamily:    MONO, fontSize: 8, letterSpacing: 2.5,
            color:         tokens.headerText, textTransform: "uppercase", flex: 1, userSelect: "none",
          }}>
            {board.titleLabel?.trim() || "SIGNAL"}
          </span>
          {posts.length > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: tokens.postTextDim, userSelect: "none" }}>
              {posts.length}
            </span>
          )}
          {canInteract && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setConfigOpen(o => !o); }}
              style={{
                background:    configOpen ? "rgba(255,255,255,0.07)" : "transparent",
                border:        `1px solid ${configOpen ? "rgba(255,255,255,0.16)" : "transparent"}`,
                borderRadius:  3,
                padding:       "2px 6px",
                cursor:        "pointer",
                color:         configOpen ? tokens.accent : tokens.postTextDim,
                fontFamily:    MONO, fontSize: 7, letterSpacing: 1.5,
                textTransform: "uppercase",
                transition:    "all 0.1s ease",
              }}
            >
              CFG
            </button>
          )}
        </div>

        {/* ── Config panel ── */}
        {configOpen && (
          <SignalStudio
            board={board}
            tokens={tokens}
            accent={accent}
            updateBoard={updateBoard}
            onBgImgClick={() => bgImgRef.current?.click()}
            tab={configTab}
            onTab={setConfigTab}
            headerH={HEADER_H}
            composerH={COMPOSER_H}
          />
        )}

        {/* ── Feed ── */}
        {!configOpen && (
          <div
            ref={feedRef}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position:      "absolute",
              top:           HEADER_H,
              bottom:        COMPOSER_H,
              left:          0, right: 0,
              overflowY:     "auto",
              overflowX:     "hidden",
              background:    board.cardStyle === "transparent" ? "transparent" : tokens.feedBg,
              zIndex:        1,
              scrollbarWidth:"thin",
              scrollbarColor:`${tokens.scrollbar} transparent`,
            }}
          >
            {posts.length === 0
              ? <EmptyFeed tokens={tokens} />
              : posts.map(post => (
                <SignalPost
                  key={post.id}
                  post={post}
                  board={board}
                  tokens={tokens}
                  font={font}
                  accent={accent}
                  textCol={textCol}
                  onDelete={() => updateBoard(board.id, { posts: board.posts.filter(p => p.id !== post.id) })}
                  canDelete={canInteract}
                />
              ))
            }
          </div>
        )}

        {/* ── Composer ── */}
        {canInteract && !configOpen && (
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              position:      "absolute",
              bottom:        0, left: 0, right: 0,
              height:        COMPOSER_H,
              background:    board.cardStyle === "transparent" ? "transparent" : tokens.composerBg,
              borderTop:     `1px solid ${tokens.composerBorder}`,
              display:       "flex",
              flexDirection: "column",
              justifyContent:"center",
              padding:       "0 10px",
              gap:           6,
              zIndex:        4,
            }}
          >
            {photoUrl && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <img src={photoUrl} style={{ width:20, height:20, objectFit:"cover", borderRadius:2, flexShrink:0, opacity:0.8 }} />
                <span style={{ fontFamily:MONO, fontSize:7, color:tokens.postTextDim, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:1 }}>
                  photo attached
                </span>
                <button onClick={() => setPhotoUrl("")} style={{ border:"none", background:"transparent", color:tokens.postTextDim, cursor:"pointer", fontSize:11, padding:0 }}>×</button>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button
                onClick={() => photoRef.current?.click()}
                style={{
                  width:22, height:22, borderRadius:3, flexShrink:0,
                  border:`1px solid ${tokens.composerBorder}`, background:"transparent",
                  color:tokens.postTextDim, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"border-color 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = tokens.composerBorder}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              <input
                value={text}
                onChange={e => setText(e.target.value.slice(0, 160))}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); publish(); } e.stopPropagation(); }}
                placeholder="signal..."
                style={{
                  flex:1, background:"transparent", border:"none", outline:"none",
                  color:tokens.composerText, fontSize:11,
                  fontFamily: board.postStyle === "terminal" ? MONO : font,
                  padding:0, minWidth:0,
                }}
              />
              <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                {text.length > 0 && (
                  <span style={{ fontFamily:MONO, fontSize:7, letterSpacing:0.5, color: text.length > 128 ? "rgba(255,100,100,0.6)" : tokens.postTextDim }}>
                    {160 - text.length}
                  </span>
                )}
                <button
                  onClick={publish}
                  disabled={!text.trim() && !photoUrl}
                  style={{
                    padding:"3px 9px", borderRadius:3,
                    border:`1px solid ${(text.trim()||photoUrl) ? "rgba(255,255,255,0.18)" : tokens.composerBorder}`,
                    background:(text.trim()||photoUrl) ? "rgba(255,255,255,0.07)" : "transparent",
                    color:(text.trim()||photoUrl) ? tokens.accent : tokens.postTextDim,
                    cursor:(text.trim()||photoUrl) ? "pointer" : "default",
                    fontFamily:MONO, fontSize:7, letterSpacing:1.5, textTransform:"uppercase",
                    transition:"all 0.1s ease",
                  }}
                >
                  POST
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Canvas handles ── */}
      {isSel && !multiSel && (
        <>
          <div
            style={{
              position:"absolute", top:-22, left:0, display:"flex", gap:4, padding:4,
              background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, backdropFilter:"blur(6px)",
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            {([0, 1, 2] as const).map(l => (
              <div key={l}
                onClick={e => { e.stopPropagation(); updateBoard(board.id, { layer: l }); }}
                onMouseEnter={() => setHovLayer(l)}
                onMouseLeave={() => setHovLayer(null)}
                style={{
                  padding:"4px 8px", borderRadius:4, cursor:"pointer",
                  fontFamily:MONO, fontSize:11, letterSpacing:"1px",
                  background:board.layer===l ? "white" : "transparent",
                  color:board.layer===l ? "black" : "rgba(255,255,255,0.4)",
                  transition:"all 0.12s ease",
                  transform:hovLayer===l ? "scale(1.05)" : undefined,
                  opacity:hovLayer===l ? 1 : undefined,
                }}
              >
                {["FO","ME","FR"][l]}
              </div>
            ))}
          </div>

          {onToggleLock && (
            <div
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onToggleLock(); }}
              style={{
                position:"absolute", top:-22, right:0, width:16, height:16,
                borderRadius:4, cursor:"pointer", zIndex:20,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:locked ? "rgba(255,180,60,0.15)" : "rgba(255,255,255,0.06)",
                border:locked ? "1px solid rgba(255,180,60,0.3)" : "1px solid rgba(255,255,255,0.07)",
                color:locked ? "rgba(255,180,60,0.9)" : "rgba(255,255,255,0.32)",
              }}
            >
              {locked
                ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              }
            </div>
          )}

          {!locked && (
            <div
              onMouseDown={e => {
                e.stopPropagation();
                const el = e.currentTarget.parentElement;
                if (el) { const r = el.getBoundingClientRect(); onRotateMD(board.id, "postit", e, r.left + r.width/2, r.top + r.height/2); }
                else onRotateMD(board.id, "postit", e);
              }}
              style={{
                position:"absolute", top:-10, right:-10, width:20, height:20,
                borderRadius:"50%", background:"rgba(12,12,14,0.96)",
                border:"1px solid rgba(255,255,255,0.1)", cursor:"crosshair",
                zIndex:20, display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 2px 8px rgba(0,0,0,0.4)", transition:"border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(212,240,196,0.4)"; e.currentTarget.style.background="rgba(212,240,196,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.background="rgba(12,12,14,0.96)"; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/>
              </svg>
            </div>
          )}

          {!locked && (
            <div
              onMouseDown={e => { e.stopPropagation(); onResizeMD(board.id, "postit", e); }}
              style={{
                position:"absolute", bottom:-5, right:-5,
                width:10, height:10, borderRadius:"50%",
                background:"rgba(255,255,255,0.5)", cursor:"nwse-resize",
                border:"1.5px solid rgba(0,0,0,0.2)", zIndex:10,
              }}
            />
          )}
        </>
      )}

      <input ref={photoRef}  type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto} />
      <input ref={bgImgRef}  type="file" accept="image/*" style={{ display:"none" }} onChange={handleBgImg} />
    </div>
  );
}

// ── Signal post ────────────────────────────────────────────────────────────────
function SignalPost({
  post, board, tokens, font, accent, textCol, onDelete, canDelete,
}: {
  post:       PostItItem;
  board:      PostItBoard;
  tokens:     ThemeTokens;
  font:       string;
  accent:     string;
  textCol:    string;
  onDelete:   () => void;
  canDelete:  boolean;
}) {
  const [hov, setHov] = useState(false);
  const opacity       = expiryOpacity(post.createdAt);
  const isFresh       = Date.now() - post.createdAt < 8_000;
  const ps            = board.postStyle ?? "minimal";
  const imgMode       = board.imageDisplayMode ?? "natural";
  const [pV, pH]      = getPaddingVH(board);

  const isTerminal   = ps === "terminal";
  const isTumblr     = ps === "tumblr";
  const isDiary      = ps === "diary";
  const isMediaHeavy = ps === "media-heavy";
  const isCompact    = ps === "compact";

  const useFont  = isTerminal ? MONO : font;
  const fontSize = board.fontSize ?? (isCompact || isTerminal ? 10 : isDiary ? 14 : isMediaHeavy ? 9 : 12);
  const lineH    = board.lineSpacing ?? (isDiary ? 1.85 : isCompact ? 1.3 : 1.6);

  const hasPhoto = !!post.photo;

  // For tumblr/media-heavy: image flush to edges
  const imgFlush = isTumblr || isMediaHeavy;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        opacity,
        position:     "relative",
        animation:    isFresh ? "signalPostIn 0.2s ease-out both" : undefined,
        borderBottom: isDiary
          ? `1px dashed ${tokens.postBorder}`
          : `1px solid ${tokens.postBorder}`,
        background:   ps === "minimal" ? "transparent" : tokens.postBg,
        transition:   "background 0.08s ease",
      }}
    >
      {/* Diary date header */}
      {isDiary && (
        <div style={{
          padding:       `${pV + 2}px ${pH}px 2px`,
          fontFamily:    MONO,
          fontSize:      7,
          letterSpacing: 2.5,
          color:         tokens.postTextDim,
          textTransform: "uppercase",
        }}>
          {diaryDate(post.createdAt)}
        </div>
      )}

      {/* Cinematic image */}
      {hasPhoto && (
        <PostImage
          src={post.photo}
          mode={imgMode}
          flush={imgFlush}
          isMediaHeavy={isMediaHeavy}
          tokens={tokens}
        />
      )}

      {/* Text + meta */}
      <div style={{
        padding: hasPhoto && imgFlush
          ? `${pV - 2}px ${pH}px ${pV}px`
          : `${hasPhoto ? pV - 2 : pV}px ${pH}px ${pV}px`,
      }}>
        {post.text && (
          <div style={{
            fontFamily:  useFont,
            fontSize,
            lineHeight:  lineH,
            color:       textCol,
            marginBottom: isMediaHeavy ? 3 : 5,
            wordBreak:   "break-word",
            whiteSpace:  "pre-wrap",
          }}>
            {isTerminal && <span style={{ color: tokens.accent, marginRight: 4 }}>{">"}</span>}
            {post.text}
          </div>
        )}

        {!isDiary && !isMediaHeavy && (
          <div style={{
            fontFamily:    MONO,
            fontSize:      isCompact || isTerminal ? 6 : 7,
            color:         tokens.postTextDim,
            letterSpacing: isTerminal ? 0.5 : 0.8,
            textAlign:     "right",
            opacity:       0.7,
          }}>
            {isTerminal ? `[${terminalTime(post.createdAt)}]` : relTime(post.createdAt)}
          </div>
        )}
      </div>

      {/* Delete on hover */}
      {canDelete && hov && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:"absolute", top:6, right:6,
            width:18, height:18, borderRadius:3,
            border:`1px solid ${tokens.postBorder}`,
            background:tokens.composerBg,
            color:tokens.postTextDim,
            cursor:"pointer", fontSize:12,
            display:"flex", alignItems:"center", justifyContent:"center",
            lineHeight:1, zIndex:5,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Post image renderer ────────────────────────────────────────────────────────
function PostImage({ src, mode, flush, isMediaHeavy, tokens }: {
  src: string; mode: ImageDisplayMode; flush: boolean; isMediaHeavy: boolean; tokens: ThemeTokens;
}) {
  if (mode === "natural") {
    return (
      <img
        src={src} draggable={false}
        style={{
          display:     "block",
          width:       "100%",
          height:      "auto",
          maxHeight:   isMediaHeavy ? 220 : undefined,
          objectFit:   isMediaHeavy ? "cover" : undefined,
        }}
      />
    );
  }

  const ratio = isMediaHeavy ? "21/9" : "16/9";
  return (
    <div style={{
      width: "100%", aspectRatio: ratio, overflow: "hidden", flexShrink: 0,
      background: mode === "contain" ? tokens.cardBg : undefined,
    }}>
      <img
        src={src} draggable={false}
        style={{
          width:"100%", height:"100%",
          objectFit: mode === "cover" ? "cover" : "contain",
          display:"block",
        }}
      />
    </div>
  );
}

// ── Noise overlay ──────────────────────────────────────────────────────────────
function NoiseOverlay() {
  return (
    <div style={{
      position:        "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`,
      backgroundSize:  "180px 180px",
    }} />
  );
}

// ── Empty feed ─────────────────────────────────────────────────────────────────
function EmptyFeed({ tokens }: { tokens: ThemeTokens }) {
  return (
    <div style={{
      height:"100%", minHeight:80, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:6,
    }}>
      <div style={{ fontFamily:MONO, fontSize:8, letterSpacing:3, color:tokens.postTextDim, textTransform:"uppercase", opacity:0.6 }}>
        NO SIGNAL
      </div>
      <div style={{ fontFamily:MONO, fontSize:7, letterSpacing:2, color:tokens.postTextDim, textTransform:"uppercase", opacity:0.3 }}>
        feed empty
      </div>
    </div>
  );
}

// ── Signal Studio (config panel) ───────────────────────────────────────────────
function SignalStudio({
  board, tokens, accent, updateBoard, onBgImgClick, tab, onTab, headerH, composerH,
}: {
  board:        PostItBoard;
  tokens:       ThemeTokens;
  accent:       string;
  updateBoard:  (id: string, patch: Partial<PostItBoard>) => void;
  onBgImgClick: () => void;
  tab:          ConfigTab;
  onTab:        (t: ConfigTab) => void;
  headerH:      number;
  composerH:    number;
}) {
  const u = (patch: Partial<PostItBoard>) => updateBoard(board.id, patch);

  const TABS: { key: ConfigTab; label: string }[] = [
    { key: "app",   label: "LOOK"  },
    { key: "type",  label: "TEXT"  },
    { key: "feed",  label: "FEED"  },
    { key: "media", label: "MEDIA" },
    { key: "fx",    label: "THEME" },
  ];

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position:      "absolute",
        top:           headerH,
        bottom:        composerH,
        left:          0, right: 0,
        zIndex:        8,
        display:       "flex",
        flexDirection: "column",
        background:    tokens.composerBg,
        overflow:      "hidden",
      }}
    >
      {/* ── Tab bar ── */}
      <div style={{
        display:      "flex",
        borderBottom: `1px solid ${tokens.composerBorder}`,
        flexShrink:   0,
        height:       42,
        padding:      "0 2px",
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onTab(t.key)}
            style={{
              flex:          1,
              height:        "100%",
              background:    "transparent",
              border:        "none",
              borderBottom:  t.key === tab
                ? `2px solid ${accent}`
                : "2px solid transparent",
              color:         t.key === tab ? tokens.postText : tokens.postTextDim,
              fontFamily:    MONO,
              fontSize:      9,
              letterSpacing: 2,
              textTransform: "uppercase",
              cursor:        "pointer",
              transition:    "color 0.1s ease, border-color 0.1s ease",
              marginBottom:  "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{
        flex:           1,
        overflowY:      "auto",
        padding:        "16px 16px 20px",
        scrollbarWidth: "thin",
        scrollbarColor: `${tokens.scrollbar} transparent`,
      }}>
        {tab === "app"   && <AppearanceTab board={board} tokens={tokens} accent={accent} u={u} onBgImgClick={onBgImgClick} />}
        {tab === "type"  && <TypographyTab board={board} tokens={tokens} accent={accent} u={u} />}
        {tab === "feed"  && <FeedTab       board={board} tokens={tokens} accent={accent} u={u} />}
        {tab === "media" && <MediaTab      board={board} tokens={tokens} accent={accent} u={u} onBgImgClick={onBgImgClick} />}
        {tab === "fx"    && <EffectsTab    board={board} tokens={tokens} accent={accent} u={u} />}
      </div>
    </div>
  );
}

// ── Shared tab props ───────────────────────────────────────────────────────────
type TabProps = {
  board:  PostItBoard;
  tokens: ThemeTokens;
  accent: string;
  u:      (patch: Partial<PostItBoard>) => void;
};

// ── LOOK tab ───────────────────────────────────────────────────────────────────
function AppearanceTab({ board, tokens, accent, u, onBgImgClick }: TabProps & { onBgImgClick: () => void }) {
  const cs = board.cardStyle ?? "solid";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      <Section label="SURFACE" tokens={tokens}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5 }}>
          {([
            { value:"solid",       label:"Solid",       hint:"Flat" },
            { value:"glass",       label:"Glass",       hint:"Blur" },
            { value:"gradient",    label:"Gradient",    hint:"Tint" },
            { value:"noise",       label:"Noise",       hint:"Grain" },
            { value:"transparent", label:"Transparent", hint:"Open" },
            { value:"image",       label:"Image",       hint:"Photo" },
          ] as { value: CardStyleKey; label: string; hint: string }[]).map(o => (
            <StyleBtn key={o.value} active={cs === o.value} tokens={tokens} onClick={() => u({ cardStyle: o.value })}>
              <span style={{ display:"block", fontSize:10, fontFamily:MONO, letterSpacing:0.5, fontWeight: cs === o.value ? 600 : 400 }}>{o.label}</span>
              <span style={{ display:"block", fontSize:8, fontFamily:SANS, opacity:0.5, marginTop:1 }}>{o.hint}</span>
            </StyleBtn>
          ))}
        </div>
        {cs === "image" && (
          <div style={{ marginTop:8 }}>
            <WideBtn tokens={tokens} onClick={onBgImgClick}>
              {board.bgImageUrl ? "Change Background" : "Upload Background"}
            </WideBtn>
          </div>
        )}
      </Section>

      <Section label="SHAPE" tokens={tokens}>
        <StudioSlider label="Corner Radius" value={board.cardBorderRadius ?? 6} min={0} max={24} step={1} unit="px" tokens={tokens} onChange={v => u({ cardBorderRadius: v })} />
        <StudioSlider label="Border" value={board.borderIntensity ?? 0.6} min={0} max={2} step={0.05} unit="" tokens={tokens} onChange={v => u({ borderIntensity: v })} />
      </Section>

      <Section label="DEPTH" tokens={tokens}>
        <StudioSlider label="Shadow" value={board.shadowIntensity ?? 0.5} min={0} max={1} step={0.05} unit="" tokens={tokens} onChange={v => u({ shadowIntensity: v })} />
        <StudioSlider label="Opacity" value={board.bgOpacity ?? 1} min={0} max={1} step={0.05} unit="" tokens={tokens} onChange={v => u({ bgOpacity: v })} />
        <StudioSlider label="Backdrop Blur" value={board.blurStrength ?? 0} min={0} max={40} step={1} unit="px" tokens={tokens} onChange={v => u({ blurStrength: v })} />
      </Section>
    </div>
  );
}

// ── TEXT tab ───────────────────────────────────────────────────────────────────
function TypographyTab({ board, tokens, accent, u }: TabProps) {
  const curFont = board.signalFont ?? "sans";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      <Section label="TYPEFACE" tokens={tokens}>
        <div style={{ display:"flex", gap:5 }}>
          {([
            { value:"sans" as const, family:SANS,  label:"DM Sans",    sz:14 },
            { value:"mono" as const, family:MONO,  label:"SPACE MONO", sz:10 },
          ]).map(f => (
            <button
              key={f.value}
              onClick={() => u({ signalFont: f.value })}
              style={{
                flex:1, padding:"14px 10px", borderRadius:5, cursor:"pointer",
                border:`1px solid ${f.value === curFont ? "rgba(255,255,255,0.22)" : tokens.postBorder}`,
                background: f.value === curFont ? "rgba(255,255,255,0.07)" : "transparent",
                color: f.value === curFont ? tokens.postText : tokens.postTextDim,
                fontFamily: f.family, fontSize: f.sz,
                letterSpacing: f.value === "mono" ? 1.5 : 0,
                transition:"all 0.12s ease", textAlign:"center",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="SIZE & RHYTHM" tokens={tokens}>
        <StudioSlider label="Font Size" value={board.fontSize ?? 12} min={9} max={22} step={1} unit="px" tokens={tokens} onChange={v => u({ fontSize: v })} />
        <StudioSlider label="Line Height" value={board.lineSpacing ?? 1.6} min={1.1} max={2.5} step={0.05} unit="×" tokens={tokens} onChange={v => u({ lineSpacing: v })} />
      </Section>

      <Section label="CARD TITLE" tokens={tokens}>
        <input
          value={board.titleLabel ?? ""}
          placeholder="SIGNAL"
          onChange={e => u({ titleLabel: e.target.value.slice(0, 32) })}
          onKeyDown={e => e.stopPropagation()}
          style={{
            width:"100%", background:"rgba(255,255,255,0.03)", boxSizing:"border-box",
            border:`1px solid ${tokens.composerBorder}`, borderRadius:5,
            padding:"11px 14px", color:tokens.composerText,
            fontFamily:MONO, fontSize:11, letterSpacing:2,
            textTransform:"uppercase", outline:"none",
            transition:"border-color 0.1s ease",
          }}
        />
      </Section>

      <Section label="TEXT COLOR" tokens={tokens}>
        <ColorRow
          label="Override color" value={board.textColor ?? ""}
          tokens={tokens}
          onChange={v => u({ textColor: v })}
          onReset={() => u({ textColor: undefined })}
        />
      </Section>
    </div>
  );
}

// ── FEED tab ───────────────────────────────────────────────────────────────────
const POST_STYLE_META: { value: PostStyleKey; label: string; desc: string }[] = [
  { value:"minimal",     label:"Minimal",     desc:"Clean, editorial" },
  { value:"compact",     label:"Compact",     desc:"Dense, info-heavy" },
  { value:"tumblr",      label:"Tumblr",      desc:"Visual-first, photo" },
  { value:"terminal",    label:"Terminal",    desc:"Monospace, technical" },
  { value:"diary",       label:"Diary",       desc:"Personal, journaled" },
  { value:"media-heavy", label:"Media",       desc:"Gallery-like, cinematic" },
];

function FeedTab({ board, tokens, accent, u }: TabProps) {
  const cur = board.postStyle ?? "minimal";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      <Section label="POST STYLE" tokens={tokens}>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {POST_STYLE_META.map(s => (
            <button
              key={s.value}
              onClick={() => u({ postStyle: s.value })}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 14px", borderRadius:5, cursor:"pointer",
                border:`1px solid ${s.value === cur ? "rgba(255,255,255,0.2)" : tokens.postBorder}`,
                background: s.value === cur ? "rgba(255,255,255,0.06)" : "transparent",
                transition:"all 0.1s ease", textAlign:"left",
              }}
            >
              <div style={{
                width:6, height:6, borderRadius:"50%", flexShrink:0,
                background: s.value === cur ? accent : tokens.postTextDim,
                opacity: s.value === cur ? 1 : 0.3,
                transition:"background 0.1s ease, opacity 0.1s ease",
              }} />
              <div>
                <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:1, color: s.value === cur ? tokens.postText : tokens.postTextDim, textTransform:"uppercase", marginBottom:2, transition:"color 0.1s ease" }}>
                  {s.label}
                </div>
                <div style={{ fontFamily:SANS, fontSize:10, color:tokens.postTextDim, opacity:0.65 }}>
                  {s.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section label="SPACING" tokens={tokens}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5 }}>
          {([
            { value:"compact",  label:"Tight"   },
            { value:"normal",   label:"Normal"  },
            { value:"spacious", label:"Loose"   },
          ] as const).map(o => (
            <StyleBtn
              key={o.value}
              active={(board.paddingDensity ?? "normal") === o.value}
              tokens={tokens}
              onClick={() => u({ paddingDensity: o.value })}
            >
              <span style={{ fontFamily:SANS, fontSize:11 }}>{o.label}</span>
            </StyleBtn>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── MEDIA tab ──────────────────────────────────────────────────────────────────
const IMG_MODES: { value: ImageDisplayMode; label: string; desc: string; detail: string }[] = [
  { value:"natural", label:"Natural",  desc:"Full height preserved", detail:"Portrait photos stay tall. No cropping. Adaptive height." },
  { value:"cover",   label:"Cover",    desc:"Cinematic 16:9 crop",   detail:"Always fills the frame. Images may crop at top/bottom." },
  { value:"contain", label:"Contain",  desc:"Full image, no crop",   detail:"Entire image visible, letterboxed. Nothing hidden." },
];

function MediaTab({ board, tokens, accent, u, onBgImgClick }: TabProps & { onBgImgClick: () => void }) {
  const cur = board.imageDisplayMode ?? "natural";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      <Section label="IMAGE MODE" tokens={tokens}>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {IMG_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => u({ imageDisplayMode: m.value })}
              style={{
                display:"flex", flexDirection:"column", alignItems:"flex-start",
                padding:"12px 14px", borderRadius:5, cursor:"pointer", textAlign:"left",
                border:`1px solid ${m.value === cur ? "rgba(255,255,255,0.2)" : tokens.postBorder}`,
                background: m.value === cur ? "rgba(255,255,255,0.05)" : "transparent",
                transition:"all 0.1s ease",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, width:"100%" }}>
                <div style={{
                  width:6, height:6, borderRadius:"50%", flexShrink:0,
                  background: m.value === cur ? accent : tokens.postTextDim,
                  opacity: m.value === cur ? 1 : 0.3,
                  transition:"all 0.1s ease",
                }} />
                <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:1, color: m.value === cur ? tokens.postText : tokens.postTextDim, textTransform:"uppercase", flex:1, transition:"color 0.1s ease" }}>
                  {m.label}
                </span>
                <span style={{ fontFamily:SANS, fontSize:10, color:tokens.postTextDim, opacity:0.55 }}>
                  {m.desc}
                </span>
              </div>
              <div style={{ fontFamily:SANS, fontSize:10, color:tokens.postTextDim, lineHeight:1.5, opacity:0.5, paddingLeft:14 }}>
                {m.detail}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section label="CARD BACKGROUND" tokens={tokens}>
        <WideBtn tokens={tokens} onClick={onBgImgClick}>
          {board.bgImageUrl ? "Change Background Image" : "Upload Background Image"}
        </WideBtn>
        {board.bgImageUrl && (
          <div style={{ marginTop:6 }}>
            <WideBtn tokens={tokens} onClick={() => u({ bgImageUrl: undefined, cardStyle: "solid" })}>
              Remove Background
            </WideBtn>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── THEME tab ──────────────────────────────────────────────────────────────────
const THEME_DEFS: { key: SignalTheme; label: string }[] = [
  { key:"void",     label:"Void"     },
  { key:"graphite", label:"Graphite" },
  { key:"terminal", label:"Terminal" },
  { key:"chrome",   label:"Chrome"   },
  { key:"signal",   label:"Signal"   },
  { key:"notebook", label:"Notebook" },
  { key:"static",   label:"Static"   },
];

function EffectsTab({ board, tokens, accent, u }: TabProps) {
  const cur = board.theme ?? "graphite";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      <Section label="COLOR THEME" tokens={tokens}>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {THEME_DEFS.map(t => {
            const tk = THEMES[t.key];
            const isActive = t.key === cur;
            return (
              <button
                key={t.key}
                onClick={() => u({ theme: t.key })}
                style={{
                  display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                  borderRadius:5, cursor:"pointer", textAlign:"left",
                  border:`1px solid ${isActive ? "rgba(255,255,255,0.2)" : tokens.postBorder}`,
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  transition:"all 0.1s ease",
                }}
              >
                {/* Color swatch */}
                <div style={{
                  width:28, height:20, borderRadius:4, flexShrink:0,
                  background:   tk.cardBg,
                  border:       `1px solid ${tk.cardBorder}`,
                  position:     "relative",
                  overflow:     "hidden",
                }}>
                  <div style={{
                    position:"absolute", bottom:3, right:3,
                    width:5, height:5, borderRadius:"50%",
                    background: tk.accent,
                    boxShadow: `0 0 4px ${tk.accent}`,
                  }} />
                </div>
                <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:1, color: isActive ? tokens.postText : tokens.postTextDim, textTransform:"uppercase", flex:1, transition:"color 0.1s ease" }}>
                  {t.label}
                </span>
                {isActive && (
                  <div style={{ width:5, height:5, borderRadius:"50%", background:accent, flexShrink:0 }} />
                )}
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="ACCENT" tokens={tokens}>
        <ColorRow
          label="Custom accent" value={board.accentColor ?? ""}
          tokens={tokens}
          onChange={v => u({ accentColor: v })}
          onReset={() => u({ accentColor: undefined })}
        />
      </Section>

      <Section label="EFFECTS" tokens={tokens}>
        <GlowToggle value={!!board.glowEnabled} tokens={tokens} accent={accent} onChange={v => u({ glowEnabled: v })} />
      </Section>
    </div>
  );
}

// ── Studio primitives ──────────────────────────────────────────────────────────
function Section({ label, tokens, children }: { label: string; tokens: ThemeTokens; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontFamily:    MONO,
        fontSize:      8,
        letterSpacing: 2.5,
        color:         tokens.postTextDim,
        textTransform: "uppercase",
        opacity:       0.55,
        marginBottom:  10,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function StyleBtn({ active, tokens, onClick, children }: {
  active: boolean; tokens: ThemeTokens; onClick: () => void; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"10px 6px", borderRadius:5, cursor:"pointer",
        border:`1px solid ${active ? "rgba(255,255,255,0.2)" : hov ? "rgba(255,255,255,0.12)" : tokens.postBorder}`,
        background: active ? "rgba(255,255,255,0.08)" : hov ? "rgba(255,255,255,0.03)" : "transparent",
        color: active ? tokens.postText : tokens.postTextDim,
        textAlign:"center", transition:"all 0.1s ease",
      }}
    >
      {children}
    </button>
  );
}

function WideBtn({ tokens, onClick, children }: {
  tokens: ThemeTokens; onClick: () => void; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:"100%", padding:"11px 14px", borderRadius:5, cursor:"pointer",
        border:`1px solid ${hov ? "rgba(255,255,255,0.18)" : tokens.postBorder}`,
        background: hov ? "rgba(255,255,255,0.05)" : "transparent",
        color: hov ? tokens.postText : tokens.postTextDim,
        fontFamily:SANS, fontSize:11, transition:"all 0.1s ease", textAlign:"center",
      }}
    >
      {children}
    </button>
  );
}

function StudioSlider({ label, value, min, max, step, unit, tokens, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; tokens: ThemeTokens; onChange: (v: number) => void;
}) {
  const display = step < 0.1 ? value.toFixed(2) : step < 1 ? value.toFixed(1) : String(Math.round(value));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontFamily:SANS, fontSize:11, color:tokens.postTextDim, fontWeight:400 }}>
          {label}
        </span>
        <span style={{ fontFamily:MONO, fontSize:10, color:tokens.postText, opacity:0.65, letterSpacing:0.5 }}>
          {display}{unit}
        </span>
      </div>
      <input
        type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:"100%", accentColor:"rgba(255,255,255,0.6)", cursor:"pointer" }}
      />
    </div>
  );
}

function ColorRow({ label, value, tokens, onChange, onReset }: {
  label: string; value: string; tokens: ThemeTokens;
  onChange: (v: string) => void; onReset: () => void;
}) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, minHeight:40 }}>
      <span style={{ fontFamily:SANS, fontSize:11, color:tokens.postTextDim, flex:1 }}>
        {label}
      </span>
      {value && (
        <button
          onClick={onReset}
          style={{
            background:"transparent", border:`1px solid ${tokens.postBorder}`, borderRadius:4,
            color:tokens.postTextDim, fontFamily:MONO, fontSize:8, letterSpacing:1.2,
            cursor:"pointer", padding:"5px 9px", transition:"all 0.1s ease",
          }}
        >
          RESET
        </button>
      )}
      <div style={{ position:"relative", width:34, height:34, borderRadius:5, overflow:"hidden", border:`1px solid ${tokens.postBorder}`, flexShrink:0 }}>
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={e => onChange(e.target.value)}
          style={{ position:"absolute", inset:"-5px", width:"calc(100% + 10px)", height:"calc(100% + 10px)", cursor:"pointer", border:"none", padding:0 }}
        />
      </div>
    </div>
  );
}

function GlowToggle({ value, tokens, accent, onChange }: {
  value: boolean; tokens: ThemeTokens; accent: string; onChange: (v: boolean) => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onChange(!value)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:"100%", display:"flex", alignItems:"center", gap:12,
        padding:"12px 14px", borderRadius:5, cursor:"pointer",
        border:`1px solid ${value ? "rgba(255,255,255,0.2)" : hov ? "rgba(255,255,255,0.12)" : tokens.postBorder}`,
        background: value ? "rgba(255,255,255,0.06)" : "transparent",
        transition:"all 0.12s ease", textAlign:"left",
      }}
    >
      <div style={{
        width:10, height:10, borderRadius:"50%", flexShrink:0,
        background: value ? accent : tokens.postTextDim,
        boxShadow:  value ? `0 0 8px ${accent}` : "none",
        opacity:    value ? 1 : 0.3,
        transition: "all 0.15s ease",
      }} />
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:1, color: value ? tokens.postText : tokens.postTextDim, textTransform:"uppercase", marginBottom:2, transition:"color 0.1s ease" }}>
          Glow Effect
        </div>
        <div style={{ fontFamily:SANS, fontSize:10, color:tokens.postTextDim, opacity:0.5 }}>
          {value ? "Soft light emanating from card edges" : "No glow — flat, contained"}
        </div>
      </div>
      <span style={{ fontFamily:MONO, fontSize:9, letterSpacing:1.5, color: value ? tokens.postText : tokens.postTextDim, opacity: value ? 0.8 : 0.35 }}>
        {value ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function arePostItPropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.board             === next.board &&
    prev.isSel             === next.isSel &&
    prev.multiSel          === next.multiSel &&
    prev.draggingId        === next.draggingId &&
    prev.locked            === next.locked &&
    prev.canInteract       === next.canInteract &&
    prev.parallaxTransform === next.parallaxTransform
  );
}
export default memo(PostItBoardWidget, arePostItPropsEqual);
