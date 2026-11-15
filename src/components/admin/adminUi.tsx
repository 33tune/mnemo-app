"use client";
/** Shared look and formatters of the admin panel (AdminPanel + AdminInsights). */
import React from "react";

export const C = {
  bg: "#0E0C12", panel: "#17141d", line: "rgba(255,255,255,.08)", text: "#f2eef6", dim: "rgba(242,238,246,.58)",
  pink: "#ff4fa3", green: "#4ade80", red: "#ff5b6b", amber: "#fbbf24", blue: "#60a5fa",
};
export const FONT = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const STEP_LABEL: Record<string, string> = {
  landing_view: "Entró a la landing", claim_click: "Tocó Reclamar", login_view: "Abrió login / registro",
  signup_submit: "Envió el registro", setup_done: "Eligió su nombre", editor_open: "Abrió el editor",
  tour_done: "Terminó el tutorial", publish: "Publicó",
};
export const EVENT_LABEL: Record<string, string> = {
  ...STEP_LABEL, signup_google: "Entró con Google", login_done: "Inició sesión", tour_skip: "Saltó el tutorial",
  note_post: "Escribió una nota", favorite_add: "Dio favorito", favorite_remove: "Sacó favorito",
  share_open: "Abrió Compartir", share_save: "Guardó la historia", share_copy_link: "Copió su link", bug_report: "Reportó un error",
  setup_view: "Abrió elegir nombre", search: "Buscó", profile_view: "Vio un perfil",
};
/** What an edit (canvas op type) means, in words. */
export const EDIT_LABEL: Record<string, string> = {
  update_profile: "la card", add_profile: "creó la card", update_image: "imágenes", add_image: "agregó imágenes", delete_image: "borró imágenes",
  update_card: "widgets", update_placement: "posiciones", update_links: "links", move_elements: "movió cosas", update_text: "textos",
  add_text: "agregó texto", delete_text: "borró texto", set_wallpaper: "fondo de la sala", set_wallpaper_vignette: "viñeta del fondo",
  set_bg: "color de la sala", update_social: "redes", update_music: "música", hide_widget: "ocultó algo",
};

export const fmtN = (n: number) => (n ?? 0).toLocaleString("es-AR");
export const fmtB = (b: number) => b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;
export const fmtD = (s: string | null | undefined) => s ? new Date(s).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
export const fmtT = (s: string | null | undefined) => s ? new Date(s).toLocaleString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
export const ago = (s: string | null | undefined) => {
  if (!s) return "nunca";
  const m = (Date.now() - new Date(s).getTime()) / 6e4;
  return m < 2 ? "recién" : m < 60 ? `hace ${Math.round(m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};
/** A page path in words: "/" = landing, "/dashboard" = editor, "/<handle>" = that profile. */
export const pathLabel = (p: string | null | undefined) => {
  if (!p) return "—";
  if (p === "/") return "landing";
  if (p.startsWith("/dashboard")) return "editor";
  if (p.startsWith("/login")) return "login";
  if (p.startsWith("/setup")) return "elegir nombre";
  if (p.startsWith("/reset-password")) return "recuperar contraseña";
  return `perfil @${p.slice(1).split("/")[0]}`;
};
export const deviceLabel = (d: string | null | undefined) => d === "mobile" ? "celular" : d === "desktop" ? "compu" : d === "tablet" ? "tablet" : d ?? "";
/** "@handle" or "anónimo abc123" */
export const who = (handle: string | null | undefined, actor?: string | null) => handle ? `@${handle}` : actor ? `anónimo ${actor}` : "anónimo";

export function Box({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, minWidth: 0 }}>
      {title && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}><h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2><div style={{ marginLeft: "auto" }}>{right}</div></div>}
      {children}
    </section>
  );
}
export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Box>
      <div style={{ color: C.dim, fontSize: 12.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.5px", marginTop: 4 }}>{typeof value === "number" ? fmtN(value) : value}</div>
      {hint && <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{hint}</div>}
    </Box>
  );
}
export function Loading({ err }: { err?: string | null }) {
  return <Box>{err ? <span style={{ color: C.red }}>{err}</span> : <span style={{ color: C.dim }}>Cargando…</span>}</Box>;
}
export function Profile({ handle, actor }: { handle?: string | null; actor?: string | null }) {
  return handle
    ? <a href={`/${handle}`} target="_blank" rel="noreferrer" style={{ color: C.text, fontWeight: 700, textDecoration: "none" }}>@{handle}</a>
    : <span style={{ color: C.dim }}>{who(null, actor)}</span>;
}

export const grid = (min: number): React.CSSProperties => ({ display: "grid", gap: 14, gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` });
export const chip = (on: boolean): React.CSSProperties => ({ border: `1px solid ${on ? C.text : C.line}`, background: on ? C.text : "transparent", color: on ? C.bg : C.text, borderRadius: 999, padding: "6px 12px", cursor: "pointer", font: `600 12.5px ${FONT}` });
export const btn = (color?: string): React.CSSProperties => ({
  border: `1px solid ${color ? color : C.line}`, background: color && color !== C.text ? "transparent" : color ? C.text : "rgba(255,255,255,.04)",
  color: color && color !== C.text ? color : color ? C.bg : C.text, borderRadius: 10, padding: "8px 12px", cursor: "pointer", font: `600 13px ${FONT}`,
});
export const input: React.CSSProperties = { background: "rgba(255,255,255,.05)", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", color: C.text, font: `500 14px ${FONT}`, outline: "none", minWidth: 0 };
export const badge = (color: string): React.CSSProperties => ({ marginLeft: 8, padding: "2px 7px", borderRadius: 6, border: `1px solid ${color}`, color, fontSize: 10, fontWeight: 700, letterSpacing: ".05em" });
export const cell: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 13 };
export const th: React.CSSProperties = { padding: "6px 4px", fontWeight: 600, fontSize: 12, textAlign: "left" };
export const td: React.CSSProperties = { padding: "6px 4px", borderTop: `1px solid ${C.line}` };
export const row: React.CSSProperties = { display: "flex", gap: 10, alignItems: "baseline", padding: "7px 0", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" };
