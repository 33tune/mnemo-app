"use client";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { createClient } from "@/lib/supabase/client";
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
  if (d < 60_000)     return "now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function initials(handle: string | null): string {
  if (!handle) return "?";
  return handle.slice(0, 2).toUpperCase();
}

function GuestbookWidget({
  guestbook, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  locked, canInteract, ownerUserId, currentUserId, currentUserHandle, onToggleLock,
}: Props) {
  const [entries,    setEntries]    = useState<GuestbookEntry[]>([]);
  const [inputText,  setInputText]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cancelRef = useRef(false);

  const isOwner  = !!(ownerUserId && currentUserId && ownerUserId === currentUserId);
  const canPost   = !!currentUserId && !isOwner;
  const isDragging = draggingId === guestbook.id;

  const fetchEntries = useCallback(async () => {
    if (!ownerUserId) return;
    const sb = createClient();
    const { data } = await sb
      .from("guestbook_entries")
      .select("id, profile_user_id, author_user_id, author_handle, content, image_url, created_at, pinned")
      .eq("profile_user_id", ownerUserId)
      .order("pinned",     { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (!cancelRef.current) setEntries((data ?? []) as GuestbookEntry[]);
  }, [ownerUserId]);

  useEffect(() => {
    cancelRef.current = false;
    fetchEntries();
    return () => { cancelRef.current = true; };
  }, [fetchEntries]);

  // Realtime
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
          setEntries(prev => prev.some(e => e.id === entry.id) ? prev : [entry, ...prev].slice(0, 20));
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

  async function handleSubmit() {
    if (!currentUserId || !inputText.trim() || submitting) return;
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.from("guestbook_entries").insert({
      profile_user_id: ownerUserId,
      author_user_id:  currentUserId,
      author_handle:   currentUserHandle ?? null,
      content:         inputText.trim(),
      image_url:       null,
    });
    if (!error) setInputText("");
    else console.error("[GuestbookWidget] submit", error);
    setSubmitting(false);
  }

  async function handleDelete(entryId: string) {
    if (!isOwner) return;
    const sb = createClient();
    await sb.from("guestbook_entries").delete().eq("id", entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position:    "absolute",
        left:        guestbook.x,
        top:         guestbook.y,
        width:       guestbook.w,
        height:      guestbook.h,
        zIndex:      guestbook.zIndex,
        transform:   `${parallaxTransform} rotate(${guestbook.rotation ?? 0}deg)`,
        opacity:     isDragging ? 0.85 : 1,
        cursor:      canInteract ? (isDragging ? "grabbing" : "grab") : "default",
        display:     "flex",
        flexDirection: "column",
        background:  "rgba(8,8,10,0.95)",
        border:      isSel ? "1px solid rgba(212,240,196,0.3)" : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow:    "hidden",
        userSelect:  "none",
        boxSizing:   "border-box",
      }}
    >
      {/* Header */}
      <div style={{ padding: "7px 11px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>GUESTBOOK</span>
          {entries.length > 0 && <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)" }}>{entries.length}</span>}
        </div>
        {canInteract && (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {locked !== undefined && (
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onToggleLock?.(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: locked ? "rgba(212,240,196,0.45)" : "rgba(255,255,255,0.18)", fontFamily: MONO, fontSize: 8, padding: "0 2px" }}
              >{locked ? "🔒" : "🔓"}</button>
            )}
            <div
              onMouseDown={e => { e.stopPropagation(); onResizeMD(e); }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.2)", cursor: "nwse-resize" }}
            />
          </div>
        )}
      </div>

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {entries.length === 0 && (
          <div style={{ padding: "18px 12px", textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.07)", textTransform: "uppercase" }}>— no messages yet —</span>
          </div>
        )}
        {entries.map(entry => (
          <EntryRow key={entry.id} entry={entry} isOwner={isOwner} onDelete={() => handleDelete(entry.id)} />
        ))}
      </div>

      {/* Composer */}
      {canPost && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "7px 9px", flexShrink: 0, display: "flex", gap: 6, alignItems: "center" }}>
          <input
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            value={inputText}
            onChange={e => setInputText(e.target.value.slice(0, 280))}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="leave a message..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 5,
              padding: "5px 8px",
              fontFamily: MONO,
              fontSize: 8.5,
              color: "rgba(255,255,255,0.7)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); handleSubmit(); }}
            disabled={submitting || !inputText.trim()}
            style={{
              flexShrink: 0,
              padding: "4px 10px",
              borderRadius: 5,
              border: "1px solid rgba(212,240,196,0.2)",
              background: "transparent",
              color: "rgba(212,240,196,0.55)",
              fontFamily: MONO,
              fontSize: 7.5,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              cursor: submitting || !inputText.trim() ? "default" : "pointer",
              opacity: submitting ? 0.5 : 1,
            }}
          >{submitting ? "…" : "POST"}</button>
        </div>
      )}

      {/* Not logged in nudge */}
      {!currentUserId && !canInteract && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "7px 11px", flexShrink: 0, textAlign: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.15)" }}>
            <a href="/login" style={{ color: "rgba(212,240,196,0.4)", textDecoration: "none" }}>sign in</a>
            {" "}to leave a message
          </span>
        </div>
      )}

      {/* Rotate handle */}
      {isSel && canInteract && (
        <div
          onMouseDown={e => { e.stopPropagation(); onRotateMD(e); }}
          style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 7, height: 7, borderRadius: "50%", background: "rgba(212,240,196,0.4)", cursor: "crosshair", zIndex: 10 }}
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
      style={{ padding: "7px 11px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", gap: 8, alignItems: "flex-start" }}
    >
      {/* Avatar */}
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.3)" }}>{initials(entry.author_handle)}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Handle + time */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.5, color: "rgba(255,255,255,0.35)" }}>
            {entry.author_handle ? `@${entry.author_handle}` : "anon"}
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
        {/* Text */}
        {entry.content && (
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, wordBreak: "break-word" }}>
            {entry.content}
          </p>
        )}
      </div>
    </div>
  );
}

function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.guestbook         === next.guestbook &&
    prev.isSel             === next.isSel &&
    prev.draggingId        === next.draggingId &&
    prev.locked            === next.locked &&
    prev.canInteract       === next.canInteract &&
    prev.ownerUserId       === next.ownerUserId &&
    prev.currentUserId     === next.currentUserId &&
    prev.currentUserHandle === next.currentUserHandle &&
    prev.parallaxTransform === next.parallaxTransform
  );
}

export default memo(GuestbookWidget, arePropsEqual);
