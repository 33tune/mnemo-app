"use client";
/**
 * Presencia (2026-11-28): "En vivo" (green dot) or "Activo hace 3 h" (grey dot)
 * next to the owner of the room. Re-read every 2 minutes while visible.
 */
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isLive, presenceLabel } from "@/lib/presence";

export function useLastSeen(userId: string | undefined | null): number | null {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const read = () => createClient().rpc("last_seen_of", { p_user: userId }).then(({ data }) => {
      if (alive) setT(typeof data === "string" ? Date.parse(data) : null);
    }, () => {});
    read();
    const iv = window.setInterval(() => { if (document.visibilityState === "visible") read(); }, 120_000);
    return () => { alive = false; window.clearInterval(iv); };
  }, [userId]);
  return t;
}

/** Grafito (2026-11-28): live = the lime gem; otherwise a graphite one. */
export function PresenceDot({ live, size = 8 }: { live: boolean; size?: number }) {
  return <span aria-hidden className={live ? "gf-gem" : "gf-gem gf-gem--off"} style={{ width: size, height: size, borderRadius: size }} />;
}

/** The inline label (inside a pill). */
export function PresenceLabel({ userId }: { userId?: string | null }) {
  const t = useLastSeen(userId);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(iv); }, []);
  const label = presenceLabel(t, now);
  if (!label) return null;
  const live = isLive(t, now);
  return (
    <span data-presence="" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 650,
      color: "inherit", opacity: live ? 0.9 : 0.62 }}>
      <PresenceDot live={live} />{label}
    </span>
  );
}

/** Phones: a small floating pill at the top of the room. */
export function PresencePill({ userId }: { userId?: string | null }) {
  const t = useLastSeen(userId);
  const label = presenceLabel(t);
  if (!label) return null;
  return (
    <div data-export-skip="" data-mnemo-ui="" className="gf-glass" style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 2147480000,
      display: "flex", alignItems: "center", gap: 7, height: 32, padding: "0 13px", borderRadius: 999,
      font: "500 13px var(--gf-font)", color: isLive(t) ? "#15171A" : "rgba(21,23,26,.7)", pointerEvents: "none" }}>
      <PresenceDot live={isLive(t)} />{label}
    </div>
  );
}

/** The owner's switch (Tu sala): show when I'm connected. */
export function usePresenceSetting(viewer: string | null | undefined): { shown: boolean; loaded: boolean; set: (v: boolean) => void } {
  const [st, setSt] = useState({ shown: true, loaded: false });
  useEffect(() => {
    if (!viewer) return;
    createClient().from("profiles").select("presence_hidden").eq("user_id", viewer).maybeSingle()
      .then(({ data }) => setSt({ shown: !data?.presence_hidden, loaded: true }), () => {});
  }, [viewer]);
  const set = (v: boolean) => {
    setSt(s => ({ ...s, shown: v }));
    createClient().rpc("set_presence_hidden", { p_hidden: !v }).then(({ error }) => { if (error) setSt(s => ({ ...s, shown: !v })); });
  };
  return { ...st, set };
}
