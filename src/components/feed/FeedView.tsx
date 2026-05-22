"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedImage {
  id:           string;
  element_id:   string;
  src:          string;
  user_id:      string;
  owner_handle: string;
  avatar_url:   string | null;
  created_at:   string;
}

interface Comment {
  id:              string;
  author_user_id:  string;
  author_handle:   string | null;
  content:         string;
  created_at:      string;
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useFeedImages(currentUserId?: string) {
  const [images,  setImages]  = useState<FeedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) { setImages([]); return; }
    cancelRef.current = false;
    setLoading(true);

    (async () => {
      try {
        const sb = createClient();

        const { data: follows } = await sb
          .from("followers")
          .select("following_id")
          .eq("follower_id", currentUserId);

        if (cancelRef.current) return;
        const followingIds = (follows ?? []).map(f => f.following_id as string);
        if (!followingIds.length) { setImages([]); setLoading(false); return; }

        const { data: activity } = await sb
          .from("activity_feed")
          .select("id, user_id, metadata, created_at")
          .eq("activity_type", "new_image")
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(50);

        if (cancelRef.current) return;
        if (!activity?.length) { setImages([]); setLoading(false); return; }

        const userIds = [...new Set(activity.map(a => a.user_id))];
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, handle, avatar_url")
          .in("user_id", userIds);

        if (cancelRef.current) return;
        const pMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

        const imgs: FeedImage[] = activity.flatMap(a => {
          const meta = (a.metadata ?? {}) as Record<string, unknown>;
          const src = meta.src as string | undefined;
          if (!src || src.startsWith("blob:")) return [];
          const p = pMap.get(a.user_id);
          return [{
            id:           a.id,
            element_id:   (meta.element_id as string) ?? a.id,
            src,
            user_id:      a.user_id,
            owner_handle: (meta.owner_handle as string) || (p?.handle ?? "?"),
            avatar_url:   p?.avatar_url ?? null,
            created_at:   a.created_at,
          }];
        });

        setImages(imgs);
        setLoading(false);
      } catch { if (!cancelRef.current) setLoading(false); }
    })();

    return () => { cancelRef.current = true; };
  }, [currentUserId]);

  return { images, loading };
}

function useFeedPins(elementIds: string[], currentUserId?: string) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinCounts, setPinCounts] = useState<Map<string, number>>(new Map());
  const idKey = elementIds.slice().sort().join(",");

  useEffect(() => {
    if (!elementIds.length) return;
    const sb = createClient();
    sb.from("element_pins")
      .select("element_id, pinner_user_id")
      .in("element_id", elementIds)
      .then(({ data }) => {
        const counts = new Map<string, number>();
        const mine   = new Set<string>();
        for (const row of data ?? []) {
          counts.set(row.element_id, (counts.get(row.element_id) ?? 0) + 1);
          if (currentUserId && row.pinner_user_id === currentUserId) mine.add(row.element_id);
        }
        setPinCounts(counts);
        setPinnedIds(mine);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, currentUserId]);

  const togglePin = useCallback(async (
    elementId:   string,
    ownerUserId: string,
    snapshot:    Record<string, unknown>,
  ) => {
    if (!currentUserId) { window.location.href = "/login"; return; }
    const sb = createClient();
    const already = pinnedIds.has(elementId);

    setPinnedIds(prev => { const ns = new Set(prev); already ? ns.delete(elementId) : ns.add(elementId); return ns; });
    setPinCounts(prev => { const ns = new Map(prev); ns.set(elementId, Math.max(0, (ns.get(elementId) ?? 0) + (already ? -1 : 1))); return ns; });

    if (already) {
      const { error } = await sb.from("element_pins").delete().eq("element_id", elementId).eq("pinner_user_id", currentUserId);
      if (error) {
        setPinnedIds(prev => new Set([...prev, elementId]));
        setPinCounts(prev => { const ns = new Map(prev); ns.set(elementId, (ns.get(elementId) ?? 0) + 1); return ns; });
      }
    } else {
      const { error } = await sb.from("element_pins").insert({ element_id: elementId, element_type: "image", owner_user_id: ownerUserId, pinner_user_id: currentUserId, content: snapshot });
      if (error) {
        setPinnedIds(prev => { const ns = new Set(prev); ns.delete(elementId); return ns; });
        setPinCounts(prev => { const ns = new Map(prev); ns.set(elementId, Math.max(0, (ns.get(elementId) ?? 1) - 1)); return ns; });
      }
    }
  }, [currentUserId, pinnedIds]);

  return { pinnedIds, pinCounts, togglePin };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function ago(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60_000)     return "now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

// ── FeedView ──────────────────────────────────────────────────────────────────

export default function FeedView({ currentUserId, userHandle: _ }: { currentUserId?: string; userHandle?: string }) {
  const { images, loading } = useFeedImages(currentUserId);
  const elementIds = images.map(i => i.element_id);
  const { pinnedIds, pinCounts, togglePin } = useFeedPins(elementIds, currentUserId);
  const [modal, setModal] = useState<FeedImage | null>(null);

  // ESC closes modal
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal]);

  if (!currentUserId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2.5, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>SIGN IN TO SEE THE FEED</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.1)", textTransform: "uppercase" }}>LOADING…</span>
      </div>
    );
  }

  if (!images.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.06)" }}>── ──</div>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2.5, color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>NOTHING HERE YET</div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>FOLLOW PEOPLE TO SEE THEIR IMAGES</div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.06)" }}>── ──</div>
      </div>
    );
  }

  // 4-column masonry via CSS columns
  return (
    <div style={{ padding: "20px 20px 60px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>FEED</span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)" }}>{images.length} images</span>
      </div>

      {/* Masonry grid */}
      <div style={{
        columns: "4 200px",
        columnGap: 12,
      }}>
        {images.map(img => (
          <FeedCard
            key={img.id}
            img={img}
            isPinned={pinnedIds.has(img.element_id)}
            pinCount={pinCounts.get(img.element_id) ?? 0}
            onPin={() => togglePin(img.element_id, img.user_id, { src: img.src })}
            onClick={() => setModal(img)}
          />
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <FeedModal
          img={modal}
          isPinned={pinnedIds.has(modal.element_id)}
          pinCount={pinCounts.get(modal.element_id) ?? 0}
          onPin={() => togglePin(modal.element_id, modal.user_id, { src: modal.src })}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── FeedCard ──────────────────────────────────────────────────────────────────

function FeedCard({ img, isPinned, pinCount, onPin, onClick }: {
  img:      FeedImage;
  isPinned: boolean;
  pinCount: number;
  onPin:    () => void;
  onClick:  () => void;
}) {
  const [hov,     setHov]     = useState(false);
  const [imgErr,  setImgErr]  = useState(false);

  if (imgErr) return null;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        breakInside:   "avoid",
        marginBottom:  12,
        borderRadius:  8,
        overflow:      "hidden",
        position:      "relative",
        cursor:        "pointer",
        border:        `1px solid ${hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        transition:    "border-color 0.12s, transform 0.12s",
        transform:     hov ? "translateY(-1px)" : "none",
        background:    "rgba(255,255,255,0.02)",
      }}
    >
      <img
        src={img.src}
        alt=""
        draggable={false}
        style={{ width: "100%", display: "block", verticalAlign: "top" }}
        onError={() => setImgErr(true)}
      />

      {/* Bottom overlay — always visible */}
      <div style={{
        position:   "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
        padding:    "20px 10px 9px",
        display:    "flex",
        alignItems: "center",
        gap:        7,
        opacity:    hov ? 1 : 0.7,
        transition: "opacity 0.12s",
      }}>
        {/* Avatar */}
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {img.avatar_url
            ? <img src={img.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <span style={{ fontFamily: MONO, fontSize: 5, color: "rgba(255,255,255,0.4)" }}>{img.owner_handle.slice(0, 1).toUpperCase()}</span>
          }
        </div>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 0.5, color: "rgba(255,255,255,0.6)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          @{img.owner_handle}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 6.5, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{ago(img.created_at)}</span>
      </div>

      {/* Pin button — visible on hover or if pinned/has count */}
      {(hov || isPinned || pinCount > 0) && (
        <div
          onClick={e => { e.stopPropagation(); onPin(); }}
          style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4 }}
        >
          {pinCount > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.6)", borderRadius: 3, padding: "1px 5px", backdropFilter: "blur(6px)" }}>
              {pinCount}
            </span>
          )}
          <button style={{
            width: 26, height: 26, borderRadius: "50%",
            border: `1px solid ${isPinned ? "rgba(212,240,196,0.5)" : "rgba(255,255,255,0.3)"}`,
            background: isPinned ? "rgba(212,240,196,0.15)" : "rgba(0,0,0,0.55)",
            color: isPinned ? "rgba(212,240,196,0.9)" : "rgba(255,255,255,0.65)",
            fontSize: 11, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)", transition: "all 0.1s",
          }}>
            {isPinned ? "★" : "☆"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── FeedModal ─────────────────────────────────────────────────────────────────

function FeedModal({ img, isPinned, pinCount, onPin, currentUserId, onClose }: {
  img:          FeedImage;
  isPinned:     boolean;
  pinCount:     number;
  onPin:        () => void;
  currentUserId?: string;
  onClose:      () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        gap: 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex",
          maxWidth: 1100,
          width: "100%",
          maxHeight: "90vh",
          background: "rgba(10,10,13,0.97)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Left: image */}
        <div style={{ flex: "0 0 auto", maxWidth: "65%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", minWidth: 200 }}>
          <img src={img.src} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", display: "block", objectFit: "contain" }} />
        </div>

        {/* Right: info + comments */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 240, maxWidth: 380 }}>
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {img.avatar_url
                ? <img src={img.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{img.owner_handle.slice(0, 1).toUpperCase()}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{img.owner_handle}</div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{ago(img.created_at)}</div>
            </div>
            {/* Pin */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {pinCount > 0 && <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{pinCount}</span>}
              <button
                onClick={onPin}
                style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${isPinned ? "rgba(212,240,196,0.45)" : "rgba(255,255,255,0.18)"}`, background: isPinned ? "rgba(212,240,196,0.1)" : "transparent", color: isPinned ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
                {isPinned ? "★" : "☆"}
              </button>
            </div>
            {/* Close */}
            <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
          </div>

          {/* Comments */}
          <ModalComments elementId={img.element_id} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}

// ── ModalComments ─────────────────────────────────────────────────────────────

function ModalComments({ elementId, currentUserId }: { elementId: string; currentUserId?: string }) {
  const [comments,   setComments]   = useState<Comment[]>([]);
  const [input,      setInput]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [handle,     setHandle]     = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Fetch current user's handle for comment display
  useEffect(() => {
    if (!currentUserId) return;
    createClient().from("profiles").select("handle").eq("user_id", currentUserId).maybeSingle()
      .then(({ data }) => { if (data) setHandle(data.handle); });
  }, [currentUserId]);

  // Load comments
  useEffect(() => {
    cancelRef.current = false;
    const sb = createClient();
    sb.from("feed_comments")
      .select("id, author_user_id, author_handle, content, created_at")
      .eq("element_id", elementId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => { if (!cancelRef.current) setComments((data ?? []) as Comment[]); });
    return () => { cancelRef.current = true; };
  }, [elementId]);

  // Realtime
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`feed-comments:${elementId}:${crypto.randomUUID()}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "feed_comments", filter: `element_id=eq.${elementId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const c = payload.new as Comment;
          setComments(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c]);
        }
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [elementId]);

  async function submit() {
    if (!currentUserId || !input.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await createClient().from("feed_comments").insert({
      element_id:      elementId,
      author_user_id:  currentUserId,
      author_handle:   handle,
      content:         input.trim(),
    });
    if (!error) setInput("");
    setSubmitting(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Comment list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {!comments.length && (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>— no comments yet —</span>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(255,255,255,0.2)" }}>{(c.author_handle || "?").slice(0,1).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.35)" }}>{c.author_handle ? `@${c.author_handle}` : "anon"}</span>
                <span style={{ fontFamily: MONO, fontSize: 6.5, color: "rgba(255,255,255,0.1)" }}>{ago(c.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.45, wordBreak: "break-word" }}>{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px", flexShrink: 0 }}>
        {currentUserId ? (
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 280))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="add a comment..."
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px", fontFamily: MONO, fontSize: 8.5, color: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" }}
            />
            <button
              onClick={submit}
              disabled={submitting || !input.trim()}
              style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(212,240,196,0.2)", background: "transparent", color: "rgba(212,240,196,0.55)", fontFamily: MONO, fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", cursor: submitting || !input.trim() ? "default" : "pointer", opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? "…" : "POST"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.18)" }}>
              <a href="/login" style={{ color: "rgba(212,240,196,0.4)", textDecoration: "none" }}>sign in</a> to comment
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
