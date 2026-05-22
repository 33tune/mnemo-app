"use client";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import type { CanvasGuestbook, GuestbookEntry } from "@/types";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

interface Props {
  guestbook:          CanvasGuestbook;
  isSel:              boolean;
  draggingId:         string | null;
  parallaxTransform:  string;
  onMouseDown:        (e: React.MouseEvent) => void;
  onClick:            (e: React.MouseEvent) => void;
  onResizeMD:         (e: React.MouseEvent) => void;
  onRotateMD:         (e: React.MouseEvent) => void;
  locked?:            boolean;
  canInteract?:       boolean;
  ownerUserId?:       string;
  currentUserId?:     string;
  currentUserHandle?: string;
  onToggleLock?:      () => void;
}

function ago(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60_000)     return "ahora";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function GuestbookWidget({
  guestbook, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  locked, canInteract, ownerUserId, currentUserId, currentUserHandle, onToggleLock,
}: Props) {
  const [entries,     setEntries]     = useState<GuestbookEntry[]>([]);
  const [inputText,   setInputText]   = useState("");
  const [inputImg,    setInputImg]    = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const isOwner = !!(ownerUserId && currentUserId && ownerUserId === currentUserId);

  // Load entries
  const fetchEntries = useCallback(async () => {
    if (!ownerUserId) return;
    const sb = createClient();
    const { data } = await sb
      .from("guestbook_entries")
      .select("id, profile_user_id, author_user_id, author_handle, content, image_url, created_at, pinned")
      .eq("profile_user_id", ownerUserId)
      .order("pinned",      { ascending: false })
      .order("created_at",  { ascending: false })
      .limit(10);
    if (!cancelRef.current) setEntries((data ?? []) as GuestbookEntry[]);
  }, [ownerUserId]);

  useEffect(() => {
    cancelRef.current = false;
    fetchEntries();
    return () => { cancelRef.current = true; };
  }, [fetchEntries]);

  // Realtime subscription
  useEffect(() => {
    if (!ownerUserId) return;
    const sb = createClient();
    const channel = sb
      .channel(`guestbook:${ownerUserId}:${crypto.randomUUID()}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "guestbook_entries", filter: `profile_user_id=eq.${ownerUserId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const entry = payload.new as GuestbookEntry;
          setEntries(prev => {
            if (prev.some(e => e.id === entry.id)) return prev;
            return [entry, ...prev].slice(0, 10);
          });
        }
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: "guestbook_entries", filter: `profile_user_id=eq.${ownerUserId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setEntries(prev => prev.filter(e => e.id !== payload.old?.id));
        }
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [ownerUserId]);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const url = await uploadToStorage(file);
      setInputImg(url);
    } catch (err) {
      console.error("[GuestbookWidget] image upload", err);
    } finally {
      setImgUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!currentUserId || (!inputText.trim() && !inputImg) || submitting) return;
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.from("guestbook_entries").insert({
      profile_user_id: ownerUserId,
      author_user_id:  currentUserId,
      author_handle:   currentUserHandle ?? null,
      content:         inputText.trim() || null,
      image_url:       inputImg ?? null,
    });
    if (!error) {
      setInputText("");
      setInputImg(null);
    } else {
      console.error("[GuestbookWidget] submit", error);
    }
    setSubmitting(false);
  }

  async function handleDelete(entryId: string) {
    if (!isOwner) return;
    const sb = createClient();
    await sb.from("guestbook_entries").delete().eq("id", entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }

  const isDragging = draggingId === guestbook.id;
  const canPost    = !!currentUserId && !isOwner;
  const showInput  = canPost || (!currentUserId && !canInteract);

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position:   "absolute",
        left:       guestbook.x,
        top:        guestbook.y,
        width:      guestbook.w,
        height:     guestbook.h,
        zIndex:     guestbook.zIndex,
        transform:  `${parallaxTransform} rotate(${guestbook.rotation ?? 0}deg)`,
        opacity:    isDragging ? 0.85 : 1,
        cursor:     canInteract ? (isDragging ? "grabbing" : "grab") : "default",
        boxSizing:  "border-box",
        display:    "flex",
        flexDirection: "column",
        background: "rgba(8,8,10,0.94)",
        border:     isSel ? "1px solid rgba(212,240,196,0.35)" : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        overflow:   "hidden",
        transition: "border-color 0.1s ease",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>GUESTBOOK</span>
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.08)" }}>{entries.length}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {canInteract && (
            <>
              {locked !== undefined && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onToggleLock?.(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 8, color: locked ? "rgba(212,240,196,0.5)" : "rgba(255,255,255,0.2)", padding: "0 2px" }}
                >{locked ? "🔒" : "🔓"}</button>
              )}
              {/* Resize handle */}
              <div
                onMouseDown={e => { e.stopPropagation(); onResizeMD(e); }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.25)", cursor: "nwse-resize" }}
              />
            </>
          )}
        </div>
      </div>

      {/* Entry list */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {entries.length === 0 && (
          <div style={{ padding: "20px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.07)", textTransform: "uppercase" }}>— be the first to leave a mark —</div>
          </div>
        )}
        {entries.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            isOwner={isOwner}
            onDelete={() => handleDelete(entry.id)}
          />
        ))}
      </div>

      {/* Composer — logged-in non-owner only */}
      {canPost && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {inputImg && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={inputImg} alt="" style={{ maxHeight: 60, maxWidth: "100%", borderRadius: 5, objectFit: "cover" }} />
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setInputImg(null); }}
                style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="leave a mark..."
              maxLength={280}
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5,
                padding: "5px 9px", fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5,
                color: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              disabled={imgUploading}
              style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 5, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {imgUploading ? "…" : "📎"}
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); handleSubmit(); }}
              disabled={submitting || (!inputText.trim() && !inputImg)}
              style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(212,240,196,0.2)", background: "transparent", color: "rgba(212,240,196,0.6)", fontFamily: MONO, fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer", opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? "…" : "SEND"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
        </div>
      )}

      {/* Not logged in — soft nudge */}
      {!currentUserId && !canInteract && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "8px 12px", flexShrink: 0, textAlign: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: "rgba(255,255,255,0.18)" }}>
            <a href="/login" style={{ color: "rgba(212,240,196,0.45)", textDecoration: "none" }}>sign in</a> to leave a mark
          </span>
        </div>
      )}

      {/* Selection handles */}
      {isSel && canInteract && (
        <div
          onMouseDown={e => { e.stopPropagation(); onRotateMD(e); }}
          style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "rgba(212,240,196,0.5)", cursor: "crosshair", zIndex: 10 }}
        />
      )}
    </div>
  );
}

function EntryRow({ entry, isOwner, onDelete }: { entry: GuestbookEntry; isOwner: boolean; onDelete: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ padding: "7px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", position: "relative", transition: "background 0.08s" }}
    >
      {/* Author + time */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: entry.pinned ? "rgba(212,240,196,0.6)" : "rgba(255,255,255,0.3)" }}>
          {entry.pinned ? "📌 " : ""}{entry.author_handle ? `@${entry.author_handle}` : "anon"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.12)" }}>{ago(entry.created_at)}</span>
          {isOwner && hov && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 7, color: "rgba(255,80,60,0.5)", padding: 0, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
      </div>
      {/* Content */}
      {entry.content && (
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, wordBreak: "break-word" }}>
          {entry.content}
        </p>
      )}
      {entry.image_url && (
        <img
          src={entry.image_url}
          alt=""
          style={{ marginTop: 5, maxWidth: "100%", maxHeight: 100, borderRadius: 5, objectFit: "cover", display: "block" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
    </div>
  );
}

function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.guestbook    === next.guestbook &&
    prev.isSel        === next.isSel &&
    prev.draggingId   === next.draggingId &&
    prev.locked       === next.locked &&
    prev.canInteract  === next.canInteract &&
    prev.ownerUserId  === next.ownerUserId &&
    prev.currentUserId === next.currentUserId &&
    prev.currentUserHandle === next.currentUserHandle &&
    prev.parallaxTransform === next.parallaxTransform
  );
}

export default memo(GuestbookWidget, arePropsEqual);
