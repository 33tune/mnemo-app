"use client";
/**
 * Admin insights (2026-11-15): En vivo (online now, when people come, sessions), Actividad (everything that
 * happens, as a feed), Relaciones (who favorites / visits whom, link clicks), Espacio (database and files)
 * and the per-person detail used inside Usuarios. All data comes from the admin_* functions (is_admin()
 * checked in the database).
 */
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  C, EVENT_LABEL, EDIT_LABEL, fmtN, fmtB, fmtD, fmtT, ago, pathLabel, deviceLabel, who,
  Box, Stat, Loading, Profile, grid, chip, input, th, td, row,
} from "./adminUi";

type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function useRpc<T = J>(fn: string, args: Record<string, unknown>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setErr(null);
    createClient().rpc(fn, args).then(({ data: d, error }) => {
      if (!alive) return;
      if (error) setErr(error.message); else setData(d as T);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, err, reload: () => setTick(t => t + 1) };
}

function Days({ value, onChange, options = [1, 7, 14, 30] }: { value: number; onChange: (d: number) => void; options?: number[] }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {options.map(d => <button key={d} onClick={() => onChange(d)} style={chip(value === d)}>{d === 1 ? "hoy" : `${d} días`}</button>)}
    </div>
  );
}

// ── En vivo ──────────────────────────────────────────────────────────────────
const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export function Live() {
  const [days, setDays] = useState(14);
  const { data: d, err, reload } = useRpc("admin_online", { p_days: days }, [days]);
  useEffect(() => { const iv = setInterval(reload, 30_000); return () => clearInterval(iv); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <Loading err={err} />;
  const heat: { dow: number; hour: number; n: number }[] = d.heat ?? [];
  const max = Math.max(1, ...heat.map(h => h.n));
  const cellOf = (dw: number, h: number) => heat.find(x => x.dow === dw && x.hour === h)?.n ?? 0;
  const sessions: J[] = d.sessions ?? [];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Days value={days} onChange={setDays} options={[7, 14, 30, 90]} />
      <div style={grid(170)}>
        <Stat label="Conectados ahora" value={(d.now ?? []).length} hint="con la página abierta (últ. 3 min)" />
        <Stat label="Visitas (sesiones)" value={d.sessions_count ?? 0} hint={`en ${days} días`} />
        <Stat label="Tiempo promedio" value={`${d.avg_minutes ?? 0} min`} hint="por visita" />
        <Stat label="Midiendo desde" value={d.tracking_since ? fmtD(d.tracking_since).slice(0, 8) : "hoy"} hint="sesiones y tiempo" />
      </div>
      <Box title="Conectados ahora" right={<span style={{ color: C.dim, fontSize: 12 }}>se actualiza cada 30 s</span>}>
        {(d.now ?? []).length === 0 && <span style={{ color: C.dim }}>Nadie en este momento.</span>}
        {(d.now ?? []).map((s: J, i: number) => (
          <div key={i} style={row}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: C.green, display: "inline-block" }} />
            <Profile handle={s.handle} actor={s.actor} />
            <span style={{ color: C.dim }}>en {pathLabel(s.path)} · {deviceLabel(s.device)}</span>
            <span style={{ marginLeft: "auto", color: C.dim }}>desde {new Date(s.since).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
          </div>
        ))}
      </Box>
      <Box title="Cuándo se conectan" right={<span style={{ color: C.dim, fontSize: 12 }}>personas distintas por día y hora (hora de Argentina)</span>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 3, fontSize: 11 }}>
            <thead><tr><th />{Array.from({ length: 24 }, (_, h) => <th key={h} style={{ color: C.dim, fontWeight: 500, width: 26 }}>{h}</th>)}</tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map(dw => (
                <tr key={dw}>
                  <td style={{ color: C.dim, paddingRight: 6 }}>{DOW[dw]}</td>
                  {Array.from({ length: 24 }, (_, h) => { const n = cellOf(dw, h); return (
                    <td key={h} title={`${DOW[dw]} ${h} h: ${n}`} style={{ width: 26, height: 22, borderRadius: 5, textAlign: "center",
                      background: n ? `rgba(255,79,163,${0.12 + 0.88 * (n / max)})` : "rgba(255,255,255,.04)", color: n / max > .5 ? "#fff" : C.dim }}>{n || ""}</td>
                  ); })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
      <Box title="Últimas visitas" right={<span style={{ color: C.dim, fontSize: 12 }}>cada visita = desde que abre hasta que cierra o deja la pestaña 5 min</span>}>
        {sessions.length === 0 && <span style={{ color: C.dim }}>Todavía no hay sesiones: se empiezan a medir desde hoy.</span>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            {sessions.length > 0 && <thead><tr style={{ color: C.dim }}><th style={th}>Cuándo</th><th style={th}>Quién</th><th style={th}>Dispositivo</th><th style={th}>Duración</th><th style={th}>Entró a → terminó en</th></tr></thead>}
            <tbody>
              {sessions.map((s, i) => (
                <tr key={i}>
                  <td style={td}>{fmtT(s.started_at)}</td>
                  <td style={td}><Profile handle={s.handle} actor={s.actor} /></td>
                  <td style={td}>{deviceLabel(s.device)}</td>
                  <td style={td}>{s.minutes} min</td>
                  <td style={{ ...td, color: C.dim }}>{pathLabel(s.first_path)}{s.last_path !== s.first_path ? ` → ${pathLabel(s.last_path)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </div>
  );
}

// ── Actividad (feed) ─────────────────────────────────────────────────────────
const KINDS: [string, string][] = [["", "Todo"], ["session", "Entradas"], ["event", "Acciones"], ["edits", "Ediciones"], ["view", "Visitas"], ["favorite", "Favoritos"], ["click", "Clics en links"]];
export function feedText(e: J): React.ReactNode {
  const W = <Profile handle={e.who} actor={e.actor} />;
  const Tg = e.target ? <Profile handle={e.target} /> : null;
  switch (e.kind) {
    case "session": return <>{W} entró desde {deviceLabel(e.device)} a {pathLabel(e.path)}{e.last_path && e.last_path !== e.path ? <> y terminó en {pathLabel(e.last_path)}</> : null} · <b>{e.minutes} min</b></>;
    case "event": {
      const extra = e.name === "favorite_add" || e.name === "favorite_remove" ? null : e.path ? <span style={{ color: C.dim }}> · {pathLabel(e.path)}</span> : null;
      return <>{W} {(EVENT_LABEL[e.name] ?? e.name).toLowerCase()}{extra}</>;
    }
    case "edits": {
      const types: string[] = (e.types ?? []).map((t: string) => EDIT_LABEL[t] ?? t);
      return <>{W} hizo <b>{e.count}</b> {e.count === 1 ? "edición" : "ediciones"}: {types.join(", ")}</>;
    }
    case "view": return <>{e.who ? W : <span style={{ color: C.dim }}>alguien sin sesión</span>} visitó a {Tg} <span style={{ color: C.dim }}>· {deviceLabel(e.device)}</span></>;
    case "favorite": return <>{W} le dio favorito a {Tg}</>;
    case "click": return <>alguien tocó «{e.label}» en el perfil de {Tg} <span style={{ color: C.dim, overflowWrap: "anywhere" }}>· {e.url}</span></>;
    default: return JSON.stringify(e);
  }
}
const KIND_COLOR: Record<string, string> = { session: C.green, event: C.pink, edits: C.amber, view: "rgba(242,238,246,.5)", favorite: C.red, click: C.blue };

export function FeedList({ items }: { items: J[] }) {
  if (items.length === 0) return <span style={{ color: C.dim }}>Nada en este período.</span>;
  let lastDay = "";
  return (
    <div>
      {items.map((e, i) => {
        const day = new Date(e.at).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" });
        const head = day !== lastDay; lastDay = day;
        return (
          <React.Fragment key={i}>
            {head && <div style={{ color: C.dim, fontSize: 12, fontWeight: 700, textTransform: "capitalize", margin: "14px 0 4px" }}>{day}</div>}
            <div style={{ ...row, flexWrap: "nowrap", alignItems: "flex-start" }}>
              <span style={{ color: C.dim, width: 46, flex: "none", fontVariantNumeric: "tabular-nums" }}>{new Date(e.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              <span style={{ width: 8, height: 8, borderRadius: 8, marginTop: 6, flex: "none", background: KIND_COLOR[e.kind] ?? C.dim }} />
              <span style={{ minWidth: 0 }}>{feedText(e)}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function Feed() {
  const [days, setDays] = useState(7);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [hideAnon, setHideAnon] = useState(false);
  const { data, err, reload } = useRpc<J[]>("admin_feed", { p_limit: 1000, p_days: days }, [days]);
  const items = useMemo(() => (data ?? []).filter(e =>
    (!kind || e.kind === kind) && (!hideAnon || e.who || e.target) &&
    (!q || `${e.who ?? ""} ${e.target ?? ""}`.toLowerCase().includes(q.toLowerCase().replace(/^@/, "")))), [data, kind, q, hideAnon]);
  if (!data) return <Loading err={err} />;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Days value={days} onChange={setDays} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por @usuario" style={{ ...input, flex: "1 1 200px" }} />
        <button onClick={reload} style={chip(false)}>Actualizar</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {KINDS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} style={chip(kind === k)}>{l}</button>)}
        <label style={{ marginLeft: "auto", color: C.dim, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={hideAnon} onChange={e => setHideAnon(e.target.checked)} /> ocultar anónimos
        </label>
      </div>
      <Box title={`${fmtN(items.length)} cosas`}><FeedList items={items} /></Box>
    </div>
  );
}

// ── Relaciones ───────────────────────────────────────────────────────────────
export function Relations() {
  const [days, setDays] = useState(30);
  const { data: d, err } = useRpc("admin_relations", { p_days: days }, [days]);
  if (!d) return <Loading err={err} />;
  const favs: J[] = d.favorites ?? [], visits: J[] = d.visits ?? [], anon: J[] = d.anonymous ?? [], clicks: J[] = d.clicks ?? [];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Days value={days} onChange={setDays} options={[7, 30, 90, 365]} />
      <div style={grid(420)}>
        <Box title={`Favoritos (${fmtN(favs.length)})`} right={<span style={{ color: C.dim, fontSize: 12 }}>todos, siempre</span>}>
          {favs.length === 0 && <span style={{ color: C.dim }}>Nadie dio favoritos todavía.</span>}
          {favs.map((f, i) => (
            <div key={i} style={row}><Profile handle={f.from} /><span style={{ color: C.dim }}>→</span><Profile handle={f.to} />
              {f.pinned && <span style={{ color: C.amber, fontSize: 12 }}>fijado</span>}{f.hidden && <span style={{ color: C.dim, fontSize: 12 }}>oculto</span>}
              <span style={{ marginLeft: "auto", color: C.dim, fontSize: 12.5 }}>{fmtD(f.at)}</span></div>
          ))}
        </Box>
        <Box title="Quién visita a quién" right={<span style={{ color: C.dim, fontSize: 12 }}>con sesión iniciada</span>}>
          {visits.length === 0 && <span style={{ color: C.dim }}>Sin visitas con sesión en este período.</span>}
          {visits.map((v, i) => (
            <div key={i} style={row}><Profile handle={v.from} /><span style={{ color: C.dim }}>→</span><Profile handle={v.to} />
              <b style={{ marginLeft: "auto" }}>{fmtN(v.n)}</b><span style={{ color: C.dim, fontSize: 12.5, width: 110, textAlign: "right" }}>{ago(v.last)}</span></div>
          ))}
        </Box>
      </div>
      <div style={grid(420)}>
        <Box title="Visitas sin sesión" right={<span style={{ color: C.dim, fontSize: 12 }}>gente de afuera (no se sabe quién)</span>}>
          {anon.map((v, i) => (
            <div key={i} style={row}><Profile handle={v.to} />
              <span style={{ color: C.dim, fontSize: 12.5 }}>{v.n ? Math.round((100 * v.mobile) / v.n) : 0}% celular</span>
              <b style={{ marginLeft: "auto" }}>{fmtN(v.n)}</b><span style={{ color: C.dim, fontSize: 12.5, width: 110, textAlign: "right" }}>{ago(v.last)}</span></div>
          ))}
        </Box>
        <Box title="Clics en links" right={<span style={{ color: C.dim, fontSize: 12 }}>botones de los perfiles</span>}>
          {clicks.length === 0 && <span style={{ color: C.dim }}>Sin clics registrados en este período.</span>}
          {clicks.map((c, i) => (
            <div key={i} style={row}><Profile handle={c.to} /><span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{c.label}</span>
              <b style={{ marginLeft: "auto" }}>{fmtN(c.n)}</b></div>
          ))}
        </Box>
      </div>
    </div>
  );
}

// ── Espacio ──────────────────────────────────────────────────────────────────
export function Space() {
  const { data: d, err } = useRpc("admin_space", {}, []);
  if (!d) return <Loading err={err} />;
  const DB = 8e9, FILES = 100e9; // Supabase Pro (2026-11-27)
  const meter = (label: string, used: number, limit: number, detail: string) => {
    const pct = Math.min(100, (100 * used) / limit); const color = pct > 80 ? C.red : pct > 60 ? C.amber : C.green;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", fontSize: 13, marginBottom: 4 }}><span>{label}</span><span style={{ marginLeft: "auto" }}><b>{fmtB(used)}</b> de {fmtB(limit)} · {pct.toFixed(1)}%</span></div>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)" }}><div style={{ height: "100%", width: `${Math.max(1, pct)}%`, background: color, borderRadius: 5 }} /></div>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>{detail}</div>
      </div>
    );
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Box title="Uso del plan gratis de Supabase">
        {meter("Base de datos", d.db, DB, "cards, ediciones, métricas, cuentas")}
        {meter("Archivos (imágenes, GIFs, fuentes)", d.files, FILES, `${fmtN(d.file_count)} archivos${d.root_files ? ` · ${d.root_files} sueltos fuera de carpetas` : ""} · la limpieza diaria borra lo que nadie usa`)}
      </Box>
      <div style={grid(420)}>
        <Box title="Tablas más pesadas">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ color: C.dim }}><th style={th}>Tabla</th><th style={{ ...th, textAlign: "right" }}>Filas</th><th style={{ ...th, textAlign: "right" }}>Tamaño</th></tr></thead>
            <tbody>{(d.tables ?? []).map((t: J) => (
              <tr key={t.name}><td style={td}>{t.name.replace(/^public\./, "")}</td><td style={{ ...td, textAlign: "right" }}>{fmtN(t.rows)}</td><td style={{ ...td, textAlign: "right" }}>{fmtB(t.bytes)}</td></tr>
            ))}</tbody>
          </table>
        </Box>
        <Box title="Archivos por persona">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ color: C.dim }}><th style={th}>Quién</th><th style={{ ...th, textAlign: "right" }}>Archivos</th><th style={{ ...th, textAlign: "right" }}>Tamaño</th></tr></thead>
            <tbody>{(d.by_user ?? []).map((u: J) => (
              <tr key={u.folder}><td style={td}>{u.handle ? <Profile handle={u.handle} /> : <span style={{ color: C.dim }}>{u.folder.slice(0, 8)}… (cuenta borrada)</span>}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmtN(u.files)}</td><td style={{ ...td, textAlign: "right" }}>{fmtB(u.bytes)}</td></tr>
            ))}</tbody>
          </table>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>Tope por persona: 100 archivos.</div>
        </Box>
      </div>
    </div>
  );
}

// ── everything about one person (inside Usuarios) ────────────────────────────
export function UserDetail({ userId }: { userId: string }) {
  const { data: d, err } = useRpc("admin_user_detail", { p_user: userId }, [userId]);
  const { data: feed } = useRpc<J[]>("admin_feed", { p_limit: 80, p_user: userId, p_days: 60 }, [userId]);
  if (!d) return <span style={{ color: err ? C.red : C.dim }}>{err ?? "Cargando…"}</span>;
  const hours: Record<string, number> = d.hours ?? {};
  const hmax = Math.max(1, ...Object.values(hours));
  const list = (items: J[], empty: string, render: (x: J) => React.ReactNode) =>
    items.length === 0 ? <span style={{ color: C.dim }}>{empty}</span> : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{items.map((x, i) => <span key={i} style={{ background: "rgba(255,255,255,.05)", borderRadius: 8, padding: "4px 8px" }}>{render(x)}</span>)}</div>;
  const editTypes = Object.entries(d.edit_types ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={grid(150)}>
        <MiniStat label="Última actividad" value={ago(d.last_seen)} hint={fmtD(d.last_seen)} />
        <MiniStat label="Días que entró" value={fmtN(d.days_active)} />
        <MiniStat label="Ediciones" value={fmtN(d.edits)} />
        <MiniStat label="Publicaciones" value={fmtN(d.publishes)} hint={d.published ? "card publicada" : "nunca publicó"} />
        <MiniStat label="Visitas que recibió" value={fmtN((d.visitors ?? []).reduce((s: number, v: J) => s + v.n, 0) + (d.anon_visits ?? 0))} hint={`${fmtN(d.anon_visits ?? 0)} sin sesión`} />
      </div>
      <Sub title="A qué hora entra">
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 48 }}>
          {Array.from({ length: 24 }, (_, h) => { const n = hours[h] ?? 0; return (
            <div key={h} title={`${h} h: ${n}`} style={{ flex: 1, height: `${Math.max(3, (100 * n) / hmax)}%`, background: n ? C.pink : "rgba(255,255,255,.06)", borderRadius: 3 }} />
          ); })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 11, marginTop: 3 }}><span>0 h</span><span>6</span><span>12</span><span>18</span><span>23 h</span></div>
      </Sub>
      {editTypes.length > 0 && <Sub title="Qué edita">{list(editTypes.map(([t, n]) => ({ t, n })), "", x => <>{EDIT_LABEL[x.t] ?? x.t} · <b>{x.n}</b></>)}</Sub>}
      <div style={grid(260)}>
        <Sub title="Favoritos que dio">{list(d.fav_given ?? [], "Ninguno.", x => <Profile handle={x.handle} />)}</Sub>
        <Sub title="Favoritos que recibió">{list(d.fav_received ?? [], "Ninguno.", x => <Profile handle={x.handle} />)}</Sub>
        <Sub title="Perfiles que visitó">{list(d.visited ?? [], "Ninguno (o sin sesión).", x => <><Profile handle={x.handle} /> · {x.n}</>)}</Sub>
        <Sub title="Quién lo visitó (con sesión)">{list(d.visitors ?? [], "Nadie con sesión.", x => <><Profile handle={x.handle} /> · {x.n}</>)}</Sub>
      </div>
      <Sub title="Últimas visitas a myLand">
        {(d.sessions ?? []).length === 0 && <span style={{ color: C.dim }}>Sin sesiones medidas todavía (se miden desde el 15/11).</span>}
        {(d.sessions ?? []).slice(0, 10).map((s: J, i: number) => (
          <div key={i} style={row}><span style={{ color: C.dim, width: 130 }}>{fmtT(s.started_at)}</span><span>{deviceLabel(s.device)}</span>
            <b>{s.minutes} min</b><span style={{ color: C.dim }}>{pathLabel(s.first_path)}{s.last_path !== s.first_path ? ` → ${pathLabel(s.last_path)}` : ""}</span></div>
        ))}
      </Sub>
      <Sub title="Todo lo que hizo (60 días)">{feed ? <FeedList items={feed} /> : <span style={{ color: C.dim }}>Cargando…</span>}</Sub>
    </div>
  );
}
function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ color: C.dim, fontSize: 12 }}>{label}</div><div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{value}</div>
      {hint && <div style={{ color: C.dim, fontSize: 11.5 }}>{hint}</div>}
    </div>
  );
}
function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>{children}</div>;
}
export { who };
