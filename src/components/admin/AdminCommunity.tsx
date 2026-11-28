"use client";
/**
 * Comunidad (2026-11-28, pedido del usuario: "métricas sobre lo que repostea la
 * gente y cómo usan estas funciones"): Fragmentos / reposts / descargas, the
 * Feed and En vivo — from admin_community_stats().
 */
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { C, Box, Stat, Loading, grid, fmtN } from "./adminUi";

type Stats = {
  reposts_resource_24h: number; reposts_resource_7d: number; reposts_post_24h: number; reposts_post_7d: number; reposters_7d: number; reposts_total: number;
  rlikes_7d: number; rcomments_7d: number; downloads_total: number; locked_owners: number; hidden_owners: number; presence_hidden: number; live_now: number;
  events_7d: Record<string, number>; users_7d: Record<string, number>;
  by_day: { day: string; reposts: number; opens: number; feed: number; downloads: number }[];
  top_resources: { handle: string | null; src: string | null; reposts: number }[];
  top_reposters: { handle: string | null; reposts: number }[];
};

export default function AdminCommunity() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => createClient().rpc("admin_community_stats").then(({ data, error }) => { if (error) setErr(error.message); else setS(data as Stats); });
  useEffect(() => { load(); }, []);
  if (!s) return <Loading err={err} />;
  const ev = (k: string) => s.events_7d?.[k] ?? 0;
  const us = (k: string) => s.users_7d?.[k] ?? 0;
  const max = Math.max(1, ...s.by_day.map(d => Math.max(d.reposts, d.opens, d.feed, d.downloads)));
  const bars: [keyof Stats["by_day"][number], string, string][] = [["opens", "Recursos abiertos", "#7aa7ff"], ["reposts", "Reposts", "#ff4f94"], ["downloads", "Descargas", "#5fe39a"], ["feed", "Feed abierto", "#ffd60a"]];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={grid(170)}>
        <Stat label="En vivo ahora" value={s.live_now} hint={`${fmtN(s.presence_hidden)} ocultan su conexión`} />
        <Stat label="Reposts de recursos" value={s.reposts_resource_7d} hint={`7 días · ${fmtN(s.reposts_resource_24h)} en 24 h`} />
        <Stat label="Reposts de posts" value={s.reposts_post_7d} hint={`7 días · ${fmtN(s.reposts_post_24h)} en 24 h`} />
        <Stat label="Personas que repostean" value={s.reposters_7d} hint={`7 días · ${fmtN(s.reposts_total)} reposts en total`} />
        <Stat label="Descargas" value={s.downloads_total} hint={`en total · ${fmtN(ev("resource_download"))} en 7 días (${fmtN(us("resource_download"))} personas)`} />
        <Stat label="Recursos abiertos" value={ev("resource_open")} hint={`7 días · ${fmtN(us("resource_open"))} personas`} />
        <Stat label="Me gusta / comentarios en recursos" value={`${fmtN(s.rlikes_7d)} / ${fmtN(s.rcomments_7d)}`} hint="7 días" />
        <Stat label="Feed abierto" value={ev("feed_open")} hint={`7 días · ${fmtN(us("feed_open"))} personas · ${fmtN(ev("feed_refresh"))} actualizaciones`} />
        <Stat label="Publicado desde el Feed" value={ev("feed_post")} hint={`7 días · ${fmtN(ev("feed_reply"))} respuestas desde el Feed / reposts`} />
        <Stat label="Pestaña En vivo" value={ev("live_open")} hint={`7 días · ${fmtN(us("live_open"))} personas`} />
        <Stat label="Descargas bloqueadas" value={s.locked_owners} hint={`dueños con "Ninguna" · ${fmtN(s.hidden_owners)} ocultan sus recursos`} />
      </div>

      <Box title="Últimos 14 días">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 12.5, color: C.dim }}>
          {bars.map(([, l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.by_day.length}, 1fr)`, gap: 6, alignItems: "end", height: 150 }}>
          {s.by_day.map(d => (
            <div key={d.day} title={`${d.day}: ${d.opens} abiertos · ${d.reposts} reposts · ${d.downloads} descargas · ${d.feed} feed`} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 3, height: "100%" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2 }}>
                {bars.map(([k, , c]) => <div key={k} style={{ flex: 1, height: `${(Number(d[k]) / max) * 100}%`, minHeight: Number(d[k]) ? 2 : 0, background: c, borderRadius: 2 }} />)}
              </div>
              <span style={{ fontSize: 10, color: C.dim, textAlign: "center" }}>{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </Box>

      <div style={grid(320)}>
        <Box title="Recursos más reposteados">
          {s.top_resources.length === 0 && <span style={{ color: C.dim }}>Todavía nada.</span>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
            {s.top_resources.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: C.dim }}>
                {r.src && <img src={r.src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", borderRadius: 8, background: "#222" }} />}
                <div>{r.handle ? `@${r.handle}` : "?"} · {fmtN(r.reposts)}</div>
              </div>
            ))}
          </div>
        </Box>
        <Box title="Quiénes más repostean">
          {s.top_reposters.length === 0 && <span style={{ color: C.dim }}>Todavía nada.</span>}
          {s.top_reposters.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
              <span>{r.handle ? `@${r.handle}` : "?"}</span><span style={{ color: C.dim }}>{fmtN(r.reposts)}</span>
            </div>
          ))}
        </Box>
      </div>
    </div>
  );
}
