"use client";
/**
 * The owner's panel (/admin, 2026-11-07): Resumen (own metrics), Usuarios
 * (search; ban / unban, delete, rename, delete the note), Reportes (the
 * "Reportar un error" messages) and Historial (what was done, by whom, when).
 * Everything goes through the admin_* functions, which check is_admin() in the
 * database themselves.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Metrics = {
  totals: { users: number; real_profiles: number; banned: number; new_in_range: number; notes_active: number; favorites: number; views_in_range: number };
  active: { dau: number; wau: number; mau: number; dau_users: number; wau_users: number; mau_users: number };
  daily: { day: string; active: number; active_users: number; signups: number; views: number }[];
  funnel: { step: string; n: number }[];
  events: Record<string, number>;
  retention: { week: string; size: number; weeks: number[] }[];
  top_profiles: { handle: string; views: number }[];
  storage: { db: number; events: number; activity: number; files: number; file_count: number };
};
type UserRow = {
  user_id: string; handle: string | null; display_name: string | null; email: string | null; provider: string;
  created_at: string; last_sign_in_at: string | null; onboarding_completed: boolean | null;
  banned: boolean; ban_reason: string | null; views: number; favorites: number; has_note: boolean; total: number;
};
type Report = { id: number; created_at: string; handle: string | null; email: string | null; message: string; page: string | null; user_agent: string | null };
type Action = { id: number; at: string; action: string; target_handle: string | null; detail: Record<string, unknown> | null };

const C = {
  bg: "#0E0C12", panel: "#17141d", line: "rgba(255,255,255,.08)", text: "#f2eef6", dim: "rgba(242,238,246,.58)",
  pink: "#ff4fa3", green: "#4ade80", red: "#ff5b6b", amber: "#fbbf24",
};
const FONT = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

const STEP_LABEL: Record<string, string> = {
  landing_view: "Entró a la landing", claim_click: "Tocó Reclamar", login_view: "Abrió login / registro",
  signup_submit: "Envió el registro", setup_done: "Eligió su nombre", editor_open: "Abrió el editor",
  tour_done: "Terminó el tutorial", publish: "Publicó",
};
const EVENT_LABEL: Record<string, string> = {
  ...STEP_LABEL, signup_google: "Entró con Google", login_done: "Inició sesión", tour_skip: "Saltó el tutorial",
  note_post: "Escribió una nota", favorite_add: "Dio favorito", favorite_remove: "Sacó favorito",
  share_open: "Abrió Compartir", share_save: "Guardó la historia", share_copy_link: "Copió su link", bug_report: "Reportó un error",
};
const ACTION_LABEL: Record<string, string> = { ban: "Baneó", unban: "Desbaneó", delete: "Eliminó", rename: "Renombró", delete_note: "Borró la nota de" };

const fmtN = (n: number) => n.toLocaleString("es-AR");
const fmtB = (b: number) => b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;
const fmtD = (s: string | null) => s ? new Date(s).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const ago = (s: string | null) => {
  if (!s) return "nunca";
  const d = (Date.now() - new Date(s).getTime()) / 864e5;
  return d < 1 / 24 ? "recién" : d < 1 ? `hace ${Math.round(d * 24)} h` : `hace ${Math.round(d)} d`;
};
const ERR: Record<string, string> = {
  handle_taken: "Ese nombre ya lo tiene otra cuenta.", invalid_handle: "Nombre inválido: 3 a 20, minúsculas, números, _ o -.",
  cannot_ban_self: "No te podés banear a vos.", cannot_delete_self: "No te podés eliminar a vos.", cannot_delete_admin: "No se puede eliminar a un admin.",
  no_profile: "Esa cuenta no tiene perfil.", not_admin: "No sos admin.",
};
const errText = (m: string) => Object.entries(ERR).find(([k]) => m.includes(k))?.[1] ?? m;

export default function AdminPanel() {
  const [tab, setTab] = useState<"resumen" | "usuarios" | "reportes" | "historial">("resumen");
  useEffect(() => {
    const b = document.body; const prev = b.style.background;
    b.style.background = C.bg;
    return () => { b.style.background = prev; };
  }, []);
  return (
    // Its own scroller: the app keeps html/body from scrolling (canvas pages).
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: C.bg, color: C.text, fontFamily: FONT, fontSize: 14 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 16px 64px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, color: C.text, textDecoration: "none" }}>
            <img src="/logo.png" alt="" width={34} height={34} />
            <b style={{ fontSize: 18 }}>myLand</b>
          </a>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: C.pink, color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: ".08em" }}>ADMIN</span>
          <nav role="tablist" style={{ display: "flex", gap: 4, marginLeft: "auto", background: C.panel, padding: 4, borderRadius: 999, border: `1px solid ${C.line}` }}>
            {(["resumen", "usuarios", "reportes", "historial"] as const).map(t => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                style={{ border: 0, borderRadius: 999, padding: "8px 14px", cursor: "pointer", font: `600 13px ${FONT}`,
                  background: tab === t ? C.text : "transparent", color: tab === t ? C.bg : C.dim }}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </header>
        {tab === "resumen" && <Summary />}
        {tab === "usuarios" && <Users />}
        {tab === "reportes" && <Reports />}
        {tab === "historial" && <History />}
      </div>
    </div>
  );
}

function Box({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, minWidth: 0 }}>
      {title && <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2><div style={{ marginLeft: "auto" }}>{right}</div></div>}
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Box>
      <div style={{ color: C.dim, fontSize: 12.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.5px", marginTop: 4 }}>{typeof value === "number" ? fmtN(value) : value}</div>
      {hint && <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{hint}</div>}
    </Box>
  );
}

function Summary() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setErr(null);
    createClient().rpc("admin_metrics", { p_days: days }).then(({ data, error }) => {
      if (!alive) return;
      if (error) setErr(error.message); else setM(data as Metrics);
    });
    return () => { alive = false; };
  }, [days]);
  if (err) return <Box><span style={{ color: C.red }}>{err}</span></Box>;
  if (!m) return <Box><span style={{ color: C.dim }}>Cargando…</span></Box>;
  const funnelTop = Math.max(1, ...m.funnel.map(f => f.n));
  const DB_LIMIT = 500e6, FILES_LIMIT = 1e9; // Supabase free plan
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: C.dim, marginRight: 4 }}>Período:</span>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)} style={chip(days === d)}>{d} días</button>
        ))}
      </div>
      <div style={grid(170)}>
        <Stat label="Cuentas" value={m.totals.users} hint={`${fmtN(m.totals.new_in_range)} nuevas en ${days} d`} />
        <Stat label="Activos hoy" value={m.active.dau} hint={`${fmtN(m.active.dau_users)} con sesión`} />
        <Stat label="Activos 7 días" value={m.active.wau} hint={`${fmtN(m.active.wau_users)} con sesión`} />
        <Stat label="Activos 30 días" value={m.active.mau} hint={`${fmtN(m.active.mau_users)} con sesión`} />
        <Stat label="Visitas a perfiles" value={m.totals.views_in_range} hint={`en ${days} d`} />
        <Stat label="Favoritos" value={m.totals.favorites} hint={`${fmtN(m.totals.notes_active)} notas activas`} />
      </div>
      <Box title="Por día">
        <DailyChart rows={m.daily} />
        <div style={{ display: "flex", gap: 16, marginTop: 10, color: C.dim, fontSize: 12, flexWrap: "wrap" }}>
          <Legend color={C.pink} label="Activos" /><Legend color={C.green} label="Registros" /><Legend color="rgba(242,238,246,.35)" label="Visitas a perfiles" />
          <span>Los activos se cuentan desde el 07/11/2026.</span>
        </div>
      </Box>
      <div style={grid(340)}>
        <Box title="Dónde abandonan" right={<span style={{ color: C.dim, fontSize: 12 }}>dispositivos distintos</span>}>
          <div style={{ display: "grid", gap: 8 }}>
            {m.funnel.map((f, i) => {
              const prev = i ? m.funnel[i - 1].n : 0;
              const drop = i && prev ? Math.round(100 - (100 * f.n) / prev) : null;
              return (
                <div key={f.step}>
                  <div style={{ display: "flex", fontSize: 13, marginBottom: 3 }}>
                    <span>{STEP_LABEL[f.step] ?? f.step}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 700 }}>{fmtN(f.n)}</span>
                    {drop !== null && drop > 0 && <span style={{ color: C.red, width: 56, textAlign: "right" }}>−{drop}%</span>}
                    {(drop === null || drop <= 0) && <span style={{ width: 56 }} />}
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.06)" }}>
                    <div style={{ height: "100%", width: `${(100 * f.n) / funnelTop}%`, background: C.pink, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Box>
        <Box title="¿Vuelven?" right={<span style={{ color: C.dim, fontSize: 12 }}>% activos N semanas después</span>}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ color: C.dim, textAlign: "left" }}><th style={th}>Se registró</th><th style={th}>Cuentas</th>{[1, 2, 3, 4].map(w => <th key={w} style={th}>S{w}</th>)}</tr></thead>
            <tbody>
              {m.retention.length === 0 && <tr><td colSpan={6} style={{ ...td, color: C.dim }}>Sin registros en las últimas semanas.</td></tr>}
              {m.retention.map(r => (
                <tr key={r.week}>
                  <td style={td}>{new Date(r.week + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}</td>
                  <td style={td}>{r.size}</td>
                  {[0, 1, 2, 3].map(i => {
                    const v = r.weeks[i];
                    return <td key={i} style={{ ...td, background: v === undefined ? "transparent" : `rgba(255,79,163,${0.08 + (v / 100) * 0.7})`, textAlign: "center" }}>{v === undefined ? "" : `${v}%`}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>Cuenta desde el 07/11/2026: las semanas anteriores salen en 0 %.</div>
        </Box>
      </div>
      <div style={grid(340)}>
        <Box title="Qué hace la gente" right={<span style={{ color: C.dim, fontSize: 12 }}>veces, en {days} d</span>}>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.keys(m.events).length === 0 && <span style={{ color: C.dim }}>Todavía no hay eventos.</span>}
            {Object.entries(m.events).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", borderBottom: `1px solid ${C.line}`, padding: "6px 0" }}>
                <span>{EVENT_LABEL[k] ?? k}</span><b style={{ marginLeft: "auto" }}>{fmtN(v)}</b>
              </div>
            ))}
          </div>
        </Box>
        <Box title="Perfiles más vistos" right={<span style={{ color: C.dim, fontSize: 12 }}>en {days} d</span>}>
          <div style={{ display: "grid", gap: 6 }}>
            {m.top_profiles.map(p => (
              <div key={p.handle} style={{ display: "flex", borderBottom: `1px solid ${C.line}`, padding: "6px 0" }}>
                <a href={`/${p.handle}`} target="_blank" rel="noreferrer" style={{ color: C.text }}>@{p.handle}</a><b style={{ marginLeft: "auto" }}>{fmtN(p.views)}</b>
              </div>
            ))}
          </div>
        </Box>
      </div>
      <Box title="Espacio en Supabase" right={<span style={{ color: C.dim, fontSize: 12 }}>plan gratis: 500 MB base · 1 GB archivos</span>}>
        <Meter label="Base de datos" used={m.storage.db} limit={DB_LIMIT} detail={`métricas: ${fmtB(m.storage.events + m.storage.activity)}`} />
        <Meter label="Archivos (imágenes, GIFs, MP3)" used={m.storage.files} limit={FILES_LIMIT} detail={`${fmtN(m.storage.file_count)} archivos`} />
      </Box>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />{label}</span>;
}

function Meter({ label, used, limit, detail }: { label: string; used: number; limit: number; detail: string }) {
  const pct = Math.min(100, (100 * used) / limit);
  const color = pct > 80 ? C.red : pct > 60 ? C.amber : C.green;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span><span style={{ marginLeft: "auto" }}><b>{fmtB(used)}</b> de {fmtB(limit)} · {pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)" }}>
        <div style={{ height: "100%", width: `${Math.max(1, pct)}%`, background: color, borderRadius: 5 }} />
      </div>
      <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>{detail}</div>
    </div>
  );
}

function DailyChart({ rows }: { rows: Metrics["daily"] }) {
  const W = 1000, H = 180, pad = 4;
  const max = Math.max(1, ...rows.map(r => Math.max(r.active, r.signups, r.views)));
  const bw = (W - pad * 2) / Math.max(1, rows.length);
  const [hover, setHover] = useState<number | null>(null);
  const line = (key: "active" | "signups") => rows.map((r, i) => `${i ? "L" : "M"}${pad + bw * i + bw / 2},${H - (r[key] / max) * (H - 10)}`).join(" ");
  const h = hover !== null ? rows[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 180, display: "block" }}
        onMouseLeave={() => setHover(null)}>
        {rows.map((r, i) => (
          <rect key={r.day} x={pad + bw * i + bw * 0.15} width={bw * 0.7} y={H - (r.views / max) * (H - 10)} height={(r.views / max) * (H - 10)}
            fill={hover === i ? "rgba(242,238,246,.5)" : "rgba(242,238,246,.18)"} onMouseEnter={() => setHover(i)} />
        ))}
        <path d={line("signups")} fill="none" stroke={C.green} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        <path d={line("active")} fill="none" stroke={C.pink} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        {rows.map((r, i) => <rect key={"h" + r.day} x={pad + bw * i} width={bw} y={0} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {h && (
        <div style={{ position: "absolute", top: 0, right: 0, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontSize: 12 }}>
          <b>{new Date(h.day + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })}</b>
          <div>Activos: {h.active} ({h.active_users} con sesión)</div><div>Registros: {h.signups}</div><div>Visitas: {h.views}</div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 11, marginTop: 4 }}>
        <span>{rows[0]?.day.slice(5).split("-").reverse().join("/")}</span><span>{rows[rows.length - 1]?.day.slice(5).split("-").reverse().join("/")}</span>
      </div>
    </div>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (query: string, offset = 0) => {
    setLoading(true);
    const { data, error } = await createClient().rpc("admin_users", { p_q: query, p_limit: 50, p_offset: offset });
    setLoading(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    const list = (data ?? []) as UserRow[];
    setRows(r => (offset ? [...r, ...list] : list));
    setTotal(list[0]?.total ?? (offset ? total : 0));
  }, [total]);

  useEffect(() => {
    const t = setTimeout(() => { void load(q.trim()); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const act = async (fn: string, args: Record<string, unknown>, okText: string) => {
    setMsg(null);
    const { error } = await createClient().rpc(fn, args);
    if (error) { setMsg({ ok: false, text: errText(error.message) }); return false; }
    setMsg({ ok: true, text: okText });
    await load(q.trim());
    return true;
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por @usuario, nombre o mail"
          style={{ ...input, flex: "1 1 280px" }} />
        <span style={{ color: C.dim }}>{loading ? "Buscando…" : `${fmtN(total)} cuentas`}</span>
      </div>
      {msg && <div role="status" style={{ padding: "10px 14px", borderRadius: 12, background: msg.ok ? "rgba(74,222,128,.12)" : "rgba(255,91,107,.12)", color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map(u => (
          <UserCard key={u.user_id} u={u} open={open === u.user_id} onToggle={() => setOpen(o => (o === u.user_id ? null : u.user_id))} act={act} />
        ))}
      </div>
      {rows.length < total && <button onClick={() => load(q.trim(), rows.length)} style={btn()}>Ver más</button>}
    </div>
  );
}

function UserCard({ u, open, onToggle, act }: {
  u: UserRow; open: boolean; onToggle: () => void;
  act: (fn: string, args: Record<string, unknown>, okText: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"" | "rename" | "ban" | "delete">("");
  const [val, setVal] = useState("");
  useEffect(() => { if (!open) { setMode(""); setVal(""); } }, [open]);
  const name = u.handle ? `@${u.handle}` : "(sin perfil)";
  return (
    <div style={{ background: C.panel, border: `1px solid ${u.banned ? "rgba(255,91,107,.4)" : C.line}`, borderRadius: 14 }}>
      <button onClick={onToggle} aria-expanded={open}
        style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.4fr) repeat(3, minmax(64px,.5fr))", gap: 10, alignItems: "center", padding: "12px 14px" }}>
        <span style={{ minWidth: 0 }}>
          <b>{name}</b>{u.banned && <span style={badge(C.red)}>BANEADO</span>}{u.handle?.startsWith("temp_") && <span style={badge(C.amber)}>SIN NOMBRE</span>}
          <div style={{ color: C.dim, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.display_name ?? ""}</div>
        </span>
        <span style={{ minWidth: 0, color: C.dim, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}<span style={{ opacity: .7 }}> · {u.provider}</span></span>
        <span style={cell}><b>{fmtN(u.views)}</b><small style={{ color: C.dim }}>visitas</small></span>
        <span style={cell}><b>{fmtN(u.favorites)}</b><small style={{ color: C.dim }}>favoritos</small></span>
        <span style={cell}><b>{ago(u.last_sign_in_at)}</b><small style={{ color: C.dim }}>últ. entrada</small></span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.line}`, padding: 14, display: "grid", gap: 12 }}>
          <div style={{ color: C.dim, fontSize: 12.5 }}>
            Se registró {fmtD(u.created_at)} · última entrada {fmtD(u.last_sign_in_at)} · {u.has_note ? "tiene nota activa" : "sin nota"}
            {u.banned && u.ban_reason ? ` · motivo del baneo: ${u.ban_reason}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {u.handle && !u.banned && <a href={`/${u.handle}`} target="_blank" rel="noreferrer" style={{ ...btn(), textDecoration: "none" }}>Ver perfil</a>}
            {u.handle && <button style={btn()} onClick={() => { setMode("rename"); setVal(u.handle ?? ""); }}>Cambiar nombre</button>}
            {u.has_note && <button style={btn()} onClick={() => act("admin_delete_note", { p_user: u.user_id }, `Nota de ${name} borrada.`)}>Borrar nota</button>}
            {u.banned
              ? <button style={btn(C.green)} onClick={() => act("admin_unban", { p_user: u.user_id }, `${name} desbaneado.`)}>Desbanear</button>
              : <button style={btn(C.amber)} onClick={() => { setMode("ban"); setVal(""); }}>Banear</button>}
            <button style={btn(C.red)} onClick={() => { setMode("delete"); setVal(""); }}>Eliminar cuenta</button>
          </div>
          {mode === "rename" && (
            <Confirm label="Nombre nuevo (el viejo queda libre en el acto)" value={val} onChange={v => setVal(v.toLowerCase())}
              action="Guardar nombre" onCancel={() => setMode("")}
              onGo={async () => { if (await act("admin_rename", { p_user: u.user_id, p_handle: val }, `${name} ahora es @${val}.`)) setMode(""); }} />
          )}
          {mode === "ban" && (
            <Confirm label="Motivo (opcional, solo lo ves vos). Su perfil deja de existir y no puede entrar." value={val} onChange={setVal}
              action="Banear" color={C.amber} onCancel={() => setMode("")}
              onGo={async () => { if (await act("admin_ban", { p_user: u.user_id, p_reason: val }, `${name} baneado.`)) setMode(""); }} />
          )}
          {mode === "delete" && (
            <Confirm label={`Esto borra la cuenta, su card, notas y favoritos para siempre. Escribí ${u.handle ?? "ELIMINAR"} para confirmar.`}
              value={val} onChange={setVal} action="Eliminar para siempre" color={C.red} disabled={val !== (u.handle ?? "ELIMINAR")}
              onCancel={() => setMode("")}
              onGo={async () => { if (await act("admin_delete_user", { p_user: u.user_id }, `${name} eliminado.`)) setMode(""); }} />
          )}
        </div>
      )}
    </div>
  );
}

function Confirm({ label, value, onChange, action, onGo, onCancel, color, disabled }: {
  label: string; value: string; onChange: (v: string) => void; action: string;
  onGo: () => void; onCancel: () => void; color?: string; disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async e => { e.preventDefault(); if (disabled || busy) return; setBusy(true); await onGo(); setBusy(false); }}
      style={{ display: "grid", gap: 8, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.line}` }}>
      <label style={{ color: C.dim, fontSize: 12.5 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input autoFocus value={value} onChange={e => onChange(e.target.value)} style={{ ...input, flex: "1 1 220px" }} />
        <button type="submit" disabled={disabled || busy} style={{ ...btn(color ?? C.text), opacity: disabled || busy ? .45 : 1 }}>{busy ? "…" : action}</button>
        <button type="button" onClick={onCancel} style={btn()}>Cancelar</button>
      </div>
    </form>
  );
}

function Reports() {
  const [rows, setRows] = useState<Report[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    createClient().rpc("admin_reports", { p_limit: 200 }).then(({ data, error }) => { if (error) setErr(error.message); else setRows((data ?? []) as Report[]); });
  }, []);
  if (err) return <Box><span style={{ color: C.red }}>{err}</span></Box>;
  if (!rows) return <Box><span style={{ color: C.dim }}>Cargando…</span></Box>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.length === 0 && <Box><span style={{ color: C.dim }}>No hay reportes.</span></Box>}
      {rows.map(r => (
        <Box key={r.id}>
          <div style={{ display: "flex", gap: 10, color: C.dim, fontSize: 12.5, flexWrap: "wrap" }}>
            <span>{fmtD(r.created_at)}</span><span>{r.handle ? `@${r.handle}` : "sin sesión"}</span>{r.email && <span>{r.email}</span>}
            <span style={{ marginLeft: "auto" }}>{deviceOf(r.user_agent)}</span>
          </div>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}>{r.message}</div>
          {r.page && <div style={{ marginTop: 6, color: C.dim, fontSize: 12, overflowWrap: "anywhere" }}>{r.page}</div>}
        </Box>
      ))}
    </div>
  );
}

function deviceOf(ua: string | null): string {
  if (!ua) return "";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, br].filter(Boolean).join(" · ");
}

function History() {
  const [rows, setRows] = useState<Action[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    createClient().rpc("admin_action_log", { p_limit: 300 }).then(({ data, error }) => { if (error) setErr(error.message); else setRows((data ?? []) as Action[]); });
  }, []);
  const text = useMemo(() => (a: Action) => {
    const who = a.target_handle ? `@${a.target_handle}` : "una cuenta";
    if (a.action === "rename") return `Renombró @${a.detail?.from} → @${a.detail?.to}`;
    if (a.action === "ban" && a.detail?.reason) return `Baneó a ${who} (${a.detail.reason})`;
    if (a.action === "delete_note" && a.detail?.body) return `Borró la nota de ${who}: “${a.detail.body}”`;
    return `${ACTION_LABEL[a.action] ?? a.action} ${a.action === "ban" || a.action === "unban" ? "a " : ""}${who}`;
  }, []);
  if (err) return <Box><span style={{ color: C.red }}>{err}</span></Box>;
  if (!rows) return <Box><span style={{ color: C.dim }}>Cargando…</span></Box>;
  return (
    <Box>
      {rows.length === 0 && <span style={{ color: C.dim }}>Todavía no hiciste nada desde el panel.</span>}
      {rows.map(a => (
        <div key={a.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ color: C.dim, width: 120, flex: "none" }}>{fmtD(a.at)}</span><span>{text(a)}</span>
        </div>
      ))}
    </Box>
  );
}

const grid = (min: number): React.CSSProperties => ({ display: "grid", gap: 14, gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` });
const chip = (on: boolean): React.CSSProperties => ({ border: `1px solid ${on ? C.text : C.line}`, background: on ? C.text : "transparent", color: on ? C.bg : C.text, borderRadius: 999, padding: "6px 12px", cursor: "pointer", font: `600 12.5px ${FONT}` });
const btn = (color?: string): React.CSSProperties => ({
  border: `1px solid ${color ? color : C.line}`, background: color && color !== C.text ? "transparent" : color ? C.text : "rgba(255,255,255,.04)",
  color: color && color !== C.text ? color : color ? C.bg : C.text, borderRadius: 10, padding: "8px 12px", cursor: "pointer", font: `600 13px ${FONT}`,
});
const input: React.CSSProperties = { background: "rgba(255,255,255,.05)", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", color: C.text, font: `500 14px ${FONT}`, outline: "none", minWidth: 0 };
const badge = (color: string): React.CSSProperties => ({ marginLeft: 8, padding: "2px 7px", borderRadius: 6, border: `1px solid ${color}`, color, fontSize: 10, fontWeight: 700, letterSpacing: ".05em" });
const cell: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 13 };
const th: React.CSSProperties = { padding: "6px 4px", fontWeight: 600, fontSize: 12 };
const td: React.CSSProperties = { padding: "6px 4px", borderTop: `1px solid ${C.line}` };
