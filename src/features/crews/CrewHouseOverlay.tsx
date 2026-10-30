"use client";
/**
 * Crews › Visitar (2026-10-30): the crew's house over the whole editor — still
 * the dashboard, nothing navigates away. Esc or "Cerrar" goes back.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { createClient } from "@/lib/supabase/client";
import { crewApi } from "./crewApi";
import CrewHouseView from "./CrewHouseView";
import type { CrewHouse } from "./crewTypes";

export function CrewHouseOverlay({ slug, viewerId, onClose, onManage, inEditor = true }: {
  slug: string;
  viewerId?: string;
  onClose: () => void;
  onManage?: (crewId: string) => void;
  /** Over the editor (Crews › Visitar): profiles open in a new tab. Over a
   * public profile (its crew chip): they open here. */
  inEditor?: boolean;
}) {
  const [me, setMe] = useState<string | undefined>(viewerId);
  useEffect(() => {
    if (viewerId) return;
    createClient().auth.getUser().then(({ data }) => setMe(data.user?.id)).catch(() => {});
  }, [viewerId]);
  const [house, setHouse] = useState<CrewHouse | null | undefined>(undefined);
  useEffect(() => { crewApi.house(slug).then(setHouse).catch(() => setHouse(null)); }, [slug]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  const isMember = !!me && !!house?.members.some(m => m.user_id === me);
  return createPortal(
    <div {...{ [EDITOR_UI_ATTR]: "" }} role="dialog" aria-modal="true" aria-label={house ? `Sala de ${house.crew.name}` : "Sala del crew"}
      onKeyDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 2147481800, // over the dock and the beta bits; under the first-time tour
       overflowY: "auto", overscrollBehavior: "contain", background: "#0E0C12" }}>
      {house === undefined ? null : house === null ? (
        <div style={{ minHeight: "100%", display: "grid", placeItems: "center", color: "#fff", font: "600 15px var(--font-sans)" }}>
          No se pudo abrir la sala. <button type="button" onClick={onClose} style={{ marginTop: 12 }}>Cerrar</button>
        </div>
      ) : (
        <CrewHouseView house={house} viewerIsMember={isMember} viewerIsOwner={!!me && me === house.crew.owner_id}
          onClose={onClose} onManage={onManage} newTabProfiles={inEditor} />
      )}
    </div>,
    document.body,
  );
}
