"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedImage {
  id:            string;  // activity_feed.id
  element_id:    string;
  src:           string;
  user_id:       string;
  owner_handle:  string;
  avatar_url:    string | null;
  created_at:    string;
  pin_count:     number;
  comment_count: number;
  score:         number;
}

interface Comment {
  id:             string;
  author_user_id: string;
  author_handle:  string | null;
  content:        string;
  created_at:     string;
}

type FeedTab = "for_you" | "recent";

// ── Feed data hook ────────────────────────────────────────────────────────────

function useFeedImages(currentUserId?: string) {
  const [allImages, setAllImages] = useState<FeedImage[]>([]);
  const [loading,   setLoading]   = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) { setAllImages([]); return; }
    cancelRef.current = false;
    setLoading(true);

    (async () => {
      try {
        const sb = createClient();

        // 1. Get followings
        const { data: follows } = await sb
          .from("followers").select("following_id").eq("follower_id", currentUserId);
        if (cancelRef.current) return;
        const followingIds = (follows ?? []).map(f => f.following_id as string);
        if (!followingIds.length) { setAllImages([]); setLoading(false); return; }

        // 2. Fetch last 7 days of activity
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: activity } = await sb
          .from("activity_feed")
          .select("id, user_id, metadata, created_at")
          .eq("activity_type", "new_image")
          .in("user_id", followingIds)
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(80);

        if (cancelRef.current) return;
        if (!activity?.length) { setAllImages([]); setLoading(false); return; }

        // 3. Enrich with profiles
        const userIds = [...new Set(activity.map(a => a.user_id))];
        const { data: profiles } = await sb
          .from("profiles").select("user_id, handle, avatar_url").in("user_id", userIds);
        if (cancelRef.current) return;
        const pMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

        // Build base images (filter bad URLs)
        const base: Omit<FeedImage, "pin_count" | "comment_count" | "score">[] = activity.flatMap(a => {
          const meta = (a.metadata ?? {}) as Record<string, unknown>;
          const src  = meta.src as string | undefined;
          if (!src || src.startsWith("blob:")) return [];
          const p = pMap.get(a.user_id);
          return [{
            id:           a.id,
            element_id:   (meta.element_id as string) || a.id,
            src,
            user_id:      a.user_id,
            owner_handle: (meta.owner_handle as string) || (p?.handle ?? "?"),
            avatar_url:   p?.avatar_url ?? null,
            created_at:   a.created_at,
          }];
        });

        if (!base.length) { setAllImages([]); setLoading(false); return; }
        const elementIds = base.map(b => b.element_id);

        // 4. Batch-fetch pin counts
        const { data: pinRows } = await sb
          .from("element_pins").select("element_id").in("element_id", elementIds);
        if (cancelRef.current) return;
        const pinMap = new Map<string, number>();
        for (const row of pinRows ?? []) pinMap.set(row.element_id, (pinMap.get(row.element_id) ?? 0) + 1);

        // 5. Batch-fetch comment counts
        const { data: commentRows } = await sb
          .from("feed_comments").select("element_id").in("element_id", elementIds);
        if (cancelRef.current) return;
        const cmtMap = new Map<string, number>();
        for (const row of commentRows ?? []) cmtMap.set(row.element_id, (cmtMap.get(row.element_id) ?? 0) + 1);

        // 6. Compute scores
        const now = Date.now();
        const imgs: FeedImage[] = base.map(b => {
          const pc = pinMap.get(b.element_id) ?? 0;
          const cc = cmtMap.get(b.element_id) ?? 0;
          const age = now - new Date(b.created_at).getTime();
          const recency = age < 86_400_000 ? 10 : 0; // 24h boost
          return { ...b, pin_count: pc, comment_count: cc, score: pc * 3 + cc * 2 + recency };
        });

        setAllImages(imgs);
        setLoading(false);
      } catch { if (!cancelRef.current) setLoading(false); }
    })();

    return () => { cancelRef.current = true; };
  }, [currentUserId]);

  // FOR YOU — last 7 days, sorted by score desc
  const forYou = [...allImages].sort((a, b) => b.score - a.score);

  // RECENT — last 48h, sorted by created_at desc
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  const recent = allImages
    .filter(i => new Date(i.created_at).getTime() > twoDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { allImages, forYou, recent, loading };
}

// ── Pin hook (per feed, multi-owner) ─────────────────────────────────────────

function useFeedPins(elementIds: string[], currentUserId?: string) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinCounts, setPinCounts] = useState<Map<string, number>>(new Map());
  const idKey = elementIds.slice().sort().join(",");

  useEffect(() => {
    if (!elementIds.length) return;
    createClient()
      .from("element_pins").select("element_id, pinner_user_id").in("element_id", elementIds)
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
  const { allImages, forYou, recent, loading } = useFeedImages(currentUserId);
  const elementIds = allImages.map(i => i.element_id);
  const { pinnedIds, pinCounts, togglePin } = useFeedPins(elementIds, currentUserId);
  const [modal,   setModal]   = useState<FeedImage | null>(null);
  const [feedTab, setFeedTab] = useState<FeedTab>("for_you");

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

  const displayed = feedTab === "for_you" ? forYou : recent;

  if (!displayed.length) {
    return (
      <div style={{ padding: "20px 20px 0" }}>
        <FeedTabBar feedTab={feedTab} setFeedTab={setFeedTab} forYouCount={forYou.length} recentCount={recent.length} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.06)" }}>── ──</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2.5, color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>
            {feedTab === "recent" ? "NOTHING IN THE LAST 48H" : "NOTHING HERE YET"}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>FOLLOW PEOPLE TO SEE THEIR IMAGES</div>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.06)" }}>── ──</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 60px" }}>
      <FeedTabBar feedTab={feedTab} setFeedTab={setFeedTab} forYouCount={forYou.length} recentCount={recent.length} />

      {/* Masonry grid */}
      <div style={{ columns: "4 200px", columnGap: 12, marginTop: 16 }}>
        {displayed.map(img => (
          <FeedCard
            key={img.id}
            img={img}
            isPinned={pinnedIds.has(img.element_id)}
            pinCount={pinCounts.get(img.element_id) ?? img.pin_count}
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
          pinCount={pinCounts.get(modal.element_id) ?? modal.pin_count}
          onPin={() => togglePin(modal.element_id, modal.user_id, { src: modal.src })}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Feed tab bar ──────────────────────────────────────────────────────────────

function FeedTabBar({ feedTab, setFeedTab, forYouCount, recentCount }: {
  feedTab:     FeedTab;
  setFeedTab:  (t: FeedTab) => void;
  forYouCount: number;
  recentCount: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
      {([
        { key: "for_you" as FeedTab, label: "FOR YOU", count: forYouCount },
        { key: "recent"  as FeedTab, label: "RECENT",  count: recentCount },
      ] as const).map(t => (
        <button
          key={t.key}
          onClick={() => setFeedTab(t.key)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 12px", borderRadius: 5,
            border: feedTab === t.key ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.06)",
            background: feedTab === t.key ? "rgba(255,255,255,0.08)" : "transparent",
            color: feedTab === t.key ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
            fontFamily: MONO, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.1s", userSelect: "none",
          }}
        >
          {t.label}
          {t.count > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 6.5, color: feedTab === t.key ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
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
  const [hov,    setHov]    = useState(false);
  const [imgErr, setImgErr] = useState(false);

  if (imgErr) return null;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        breakInside: "avoid",
        marginBottom: 12,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        border: `1px solid ${hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        transition: "border-color 0.12s, transform 0.12s",
        transform: hov ? "translateY(-1px)" : "none",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <img
        src={img.src}
        alt=""
        draggable={false}
        style={{ width: "100%", display: "block", verticalAlign: "top" }}
        onError={() => setImgErr(true)}
      />

      {/* Bottom gradient overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
        padding: "22px 10px 9px",
        display: "flex", alignItems: "center", gap: 7,
        opacity: hov ? 1 : 0.72, transition: "opacity 0.12s",
      }}>
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

      {/* Pin button — on hover or when pinned/has count */}
      {(hov || isPinned || pinCount > 0) && (
        <div
          onClick={e => { e.stopPropagation(); onPin(); }}
          style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4 }}
        >
          {pinCount > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.62)", borderRadius: 3, padding: "1px 5px", backdropFilter: "blur(6px)" }}>
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

      {/* Score chips (on hover) */}
      {hov && (img.comment_count > 0 || img.pin_count > 0) && (
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
          {img.comment_count > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 6.5, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.62)", borderRadius: 3, padding: "1px 5px", backdropFilter: "blur(6px)" }}>
              {img.comment_count} cmt
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── FeedModal ─────────────────────────────────────────────────────────────────

function FeedModal({ img, isPinned, pinCount, onPin, currentUserId, onClose }: {
  img:            FeedImage;
  isPinned:       boolean;
  pinCount:       number;
  onPin:          () => void;
  currentUserId?: string;
  onClose:        () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex",
          maxWidth: 1100, width: "100%", maxHeight: "90vh",
          background: "rgba(10,10,13,0.97)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Left: image */}
        <div style={{ flex: "0 0 auto", maxWidth: "65%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", minWidth: 200 }}>
          <img src={img.src} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", display: "block", objectFit: "contain" }} />
        </div>

        {/* Right: info + comments */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 260, maxWidth: 380 }}>
          {/* Header */}
          <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {img.avatar_url
                ? <img src={img.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{img.owner_handle.slice(0, 1).toUpperCase()}</span>
              }
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{img.owner_handle}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{ago(img.created_at)}</div>
            </div>
            {/* Pin */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              {pinCount > 0 && <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.28)" }}>{pinCount}</span>}
              <button
                onClick={onPin}
                style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${isPinned ? "rgba(212,240,196,0.45)" : "rgba(255,255,255,0.18)"}`, background: isPinned ? "rgba(212,240,196,0.1)" : "transparent", color: isPinned ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.38)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
                {isPinned ? "★" : "☆"}
              </button>
            </div>
            <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
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

  // Fetch current user's handle once
  useEffect(() => {
    if (!currentUserId) return;
    createClient().from("profiles").select("handle").eq("user_id", currentUserId).maybeSingle()
      .then(({ data }) => { if (data) setHandle(data.handle); });
  }, [currentUserId]);

  // Load comments on mount
  useEffect(() => {
    cancelRef.current = false;
    createClient()
      .from("feed_comments")
      .select("id, author_user_id, author_handle, content, created_at")
      .eq("element_id", elementId)
      .order("created_at", { ascending: true })
      .limit(50)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: any) => { if (!cancelRef.current) setComments((data ?? []) as Comment[]); });
    return () => { cancelRef.current = true; };
  }, [elementId]);

  // Realtime subscription — unique UUID per mount, same pattern as useMessages.ts
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
      .subscribe((status: string, err?: Error) => {
        if (status === "SUBSCRIBED") console.log(`[FeedComments] SUBSCRIBED for element ${elementId}`);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          console.error(`[FeedComments] ${status} for element ${elementId}:`, err?.message ?? "—");
      });
    return () => { sb.removeChannel(channel); };
  }, [elementId]);

  async function submit() {
    if (!currentUserId || !input.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await createClient().from("feed_comments").insert({
      element_id:     elementId,
      author_user_id: currentUserId,
      author_handle:  handle,
      content:        input.trim(),
    });
    if (!error) setInput("");
    else console.error("[FeedComments] submit error", error);
    setSubmitting(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Section header with count */}
      <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>COMMENTS</span>
        {comments.length > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)" }}>{comments.length}</span>
        )}
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {!comments.length && (
          <div style={{ padding: "18px 14px", textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.07)", textTransform: "uppercase" }}>— no comments yet —</span>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ padding: "6px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: 5.5, color: "rgba(255,255,255,0.2)" }}>{(c.author_handle || "?").slice(0, 1).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.32)" }}>{c.author_handle ? `@${c.author_handle}` : "anon"}</span>
                <span style={{ fontFamily: MONO, fontSize: 6.5, color: "rgba(255,255,255,0.1)" }}>{ago(c.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.45, wordBreak: "break-word" }}>{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "9px 12px", flexShrink: 0 }}>
        {currentUserId ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 280))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="add a comment..."
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "5px 9px", fontFamily: MONO, fontSize: 8.5, color: "rgba(255,255,255,0.68)", outline: "none", boxSizing: "border-box" }}
            />
            <button
              onClick={submit}
              disabled={submitting || !input.trim()}
              style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(212,240,196,0.2)", background: "transparent", color: "rgba(212,240,196,0.55)", fontFamily: MONO, fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", cursor: submitting || !input.trim() ? "default" : "pointer", opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? "…" : "POST"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.16)" }}>
              <a href="/login" style={{ color: "rgba(212,240,196,0.4)", textDecoration: "none" }}>sign in</a> to comment
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
