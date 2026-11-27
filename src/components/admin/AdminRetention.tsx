"use client";
/**
 * Retención (2026-11-27): compiled stats of who comes back and how people use
 * myLand — admin_retention() (one call, ~4 s). Cohorts by sign-up day (next day,
 * 3, 7, 30 days), every account's status, how far the first day got × came back,
 * what predicts coming back, what returning people do, what gets edited, what
 * each visit uses and the last thing before leaving, where people arrive from,
 * Explorar / muro. Nothing personal: counts only.
 */
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { C, fmtN, Box, Stat, Loading, grid, th, td, btn } from "./adminUi";

type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
const pctTxt = (a: number | null | undefined, b: number) => (a == null ? "—" : `${pct(a, b)} %`);

const STAGE: Record<string, string> = { "1": "No editó nada", "2": "Tocó poco (< 10 cambios)", "3": "Card a medias", "4": "Terminó la card" };
const PRED: Record<string, string> = {
  finished: "Terminó la card", fav_given: "Dio un favorito", posts_other: "Escribió en un muro ajeno", fav_recv: "Recibió un favorito",
  posts_recv: "Le escribieron en su muro", views5: "Recibió 5+ visitas", shared: "Compartió su card", explored: "Abrió Explorar / buscó",
  verified: "Cuenta verificada", google: "Entró con Google", phone: "Usa celular", mins20: "Estuvo 20+ minutos",
};
const PART: Record<string, string> = {
  photo: "Foto", name: "Nombre", handle: "@usuario", descriptor: "Frase", location: "Ubicación", bio: "Bio", about: "Sobre mí", views: "Visitas",
  links: "Íconos / redes", buttons: "Botones", logo: "Logo", stickers: "Stickers", cardBg: "Fondo", cardFx: "Efectos", allText: "Todos los textos",
  wallMain: "Muro", wallBg: "Muro: fondo", wallFx: "Muro: efectos", wallText: "Muro: textos", wallButton: "Muro: botón",
};
const TOOL: Record<string, string> = { fx: "Efectos", bg: "Fondo", text: "Texto", photo: "Foto", arrange: "Acomodar", size: "Tamaño", stickers: "Stickers", links: "Redes", buttons: "Botones", border: "Borde", animate: "Animar", all: "Todo" };
/** A visit crumb (visitTrail) in words. */
export function crumbLabel(c: string): string {
  const [k, ...rest] = c.split(":"); const v = rest.join(":");
  if (k === "go") return v === "/dashboard" ? "Editor" : v === "/" ? "Landing" : v === "/login" ? "Login" : v === "/setup" ? "Elegir nombre" : v === "/admin" ? "Admin" : v === "/crear" ? "/crear" : "Un perfil";
  if (k === "tab") return `Celular › ${v === "editar" ? "Editar" : v === "inicio" ? "Inicio" : v === "explorar" ? "Explorar" : v}`;
  if (k === "sheet") return v === "open" ? "Abrió el menú completo" : "Cerró el menú";
  if (k === "part") return `Parte › ${PART[v] ?? v}`;
  if (k === "tool") return `Estudio › ${TOOL[v] ?? v}`;
  if (k === "sec") return `Sección › ${v}`;
  if (k === "panel") return `Panel › ${v === "room" ? "Tu sala" : v === "layers" ? "Capas" : v === "image" ? "Imagen" : v === "text" ? "Texto suelto" : v === "search" ? "Buscar" : v}`;
  if (k === "photo") return v === "pick" ? "Elegir foto" : "Subió foto";
  if (k === "fx") return "Calidad baja automática";
  if (c === "wall") return "Muro (dio vuelta una card)";
  if (c === "explore") return "Explorar";
  if (c === "share") return "Compartir";
  return c;
}

function Bar({ value, max, color = C.pink }: { value: number; max: number; color?: string }) {
  return <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden", minWidth: 60 }}>
    <div style={{ width: `${Math.max(2, (100 * value) / Math.max(1, max))}%`, height: "100%", background: color, borderRadius: 4 }} />
  </div>;
}
function Rows({ items, label, value, sub, color }: { items: J[]; label: (x: J) => React.ReactNode; value: (x: J) => number; sub?: (x: J) => React.ReactNode; color?: string }) {
  const max = Math.max(1, ...items.map(value));
  if (!items.length) return <span style={{ color: C.dim }}>Sin datos todavía.</span>;
  return <div style={{ display: "grid", gap: 7 }}>{items.map((x, i) => (
    <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(60px, 1fr) auto", gap: 10, alignItems: "center", fontSize: 13 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label(x)}</span>
      <Bar value={value(x)} max={max} color={color} />
      <span style={{ color: C.dim, whiteSpace: "nowrap" }}>{sub ? sub(x) : fmtN(value(x))}</span>
    </div>))}</div>;
}
const Note = ({ children }: { children: React.ReactNode }) => <div style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>{children}</div>;

export default function Retention() {
  const [d, setD] = useState<J | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true; setErr(null);
    createClient().rpc("admin_retention").then(({ data, error }) => { if (!alive) return; if (error) setErr(error.message); else setD(data as J); });
    return () => { alive = false; };
  }, [tick]);
  if (!d) return <Loading err={err} />;
  return <RetentionView d={d} onReload={() => { setD(null); setTick(t => t + 1); }} />;
}

export function RetentionView({ d, onReload }: { d: J; onReload: () => void }) {
  const st = d.status ?? {};
  const total = (st.active ?? 0) + (st.risk ?? 0) + (st.gone ?? 0) + (st.dead ?? 0) + (st.never ?? 0);
  const stages: J[] = d.stages ?? [];
  const stN = stages.reduce((s, x) => s + x.n, 0), stB = stages.reduce((s, x) => s + x.back, 0);
  const preds: J[] = (d.predictors ?? []).filter((p: J) => p.yes_n >= 5 && p.no_n >= 5)
    .map((p: J) => ({ ...p, yes: pct(p.yes_back, p.yes_n), no: pct(p.no_back, p.no_n) }))
    .sort((a: J, b: J) => (b.yes - b.no) - (a.yes - a.no));
  const back: J = d.back_do ?? {};
  const cohorts: J[] = (d.cohorts ?? []).filter((c: J) => c.n >= 3);
  const feats: J[] = (d.features ?? []).slice(0, 24);
  const fb: J[] = (d.features_back ?? []).filter((x: J) => x.back + x.gone >= 8).map((x: J) => ({ ...x, r: pct(x.back, x.back + x.gone) })).sort((a: J, b: J) => b.r - a.r).slice(0, 20);
  const visits: J[] = d.visits ?? [];
  const so: J = d.social ?? {};
  const best = preds.slice(0, 3);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: C.dim, fontSize: 13 }}>Los días se cuentan en hora de Argentina. "Volvió" = hizo algo otro día (entró, editó, escribió o dio favorito).</span>
        <button style={btn()} onClick={onReload}>Actualizar</button>
      </div>

      <Box title="En corto">
        <div style={{ display: "grid", gap: 6, fontSize: 14, lineHeight: 1.5 }}>
          <div>• De los que se registraron (30 días, sin contar hoy), <b>volvió el {pct(stB, stN)} %</b>.</div>
          {stages.find(s => s.stage === "4") && stages.find(s => s.stage === "1") && (
            <div>• Los que terminaron su card el primer día vuelven el <b>{pct(stages.find(s => s.stage === "4")!.back, stages.find(s => s.stage === "4")!.n)} %</b>; los que no tocaron nada, el {pct(stages.find(s => s.stage === "1")!.back, stages.find(s => s.stage === "1")!.n)} %.</div>
          )}
          {best.map(p => <div key={p.key}>• <b>{PRED[p.key] ?? p.key}</b> el primer día: vuelve el <b>{p.yes} %</b> (sin eso, el {p.no} %).</div>)}
          {(d.exits ?? [])[0] && <div>• Lo último que más hacen antes de irse: <b>{crumbLabel(d.exits[0].what)}</b>.</div>}
        </div>
      </Box>

      <div style={grid(150)}>
        <Stat label="Activas (≤ 3 días)" value={fmtN(st.active)} hint={`${pct(st.active, total)} % de ${fmtN(total)}`} />
        <Stat label="En riesgo (4–7 días)" value={fmtN(st.risk)} />
        <Stat label="Se fueron (8–30 días)" value={fmtN(st.gone)} />
        <Stat label="Perdidas (> 30 días)" value={fmtN(st.dead)} />
        <Stat label="Nunca hicieron nada" value={fmtN(st.never)} />
      </div>

      <Box title="Vuelven después de registrarse" right={<span style={{ color: C.dim, fontSize: 12 }}>por día de registro · — = todavía no pasó ese tiempo</span>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ color: C.dim }}><th style={th}>Día</th><th style={th}>Registros</th><th style={th}>Terminaron card</th><th style={th}>Al día siguiente</th><th style={th}>En 3 días</th><th style={th}>En 7 días</th><th style={th}>En 30 días</th></tr></thead>
            <tbody>{cohorts.map(c => (
              <tr key={c.day}>
                <td style={td}>{new Date(c.day + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                <td style={td}>{fmtN(c.n)}</td><td style={td}>{pctTxt(c.finished, c.n)}</td>
                <td style={td}><b>{pctTxt(c.d1, c.n)}</b></td><td style={td}>{pctTxt(c.r3, c.n)}</td><td style={td}>{pctTxt(c.r7, c.n)}</td><td style={td}>{pctTxt(c.r30, c.n)}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <Note>Solo días con 3 registros o más.</Note>
      </Box>

      <div style={grid(360)}>
        <Box title="Hasta dónde llegaron el primer día">
          <Rows items={stages} label={x => STAGE[x.stage] ?? x.stage} value={x => pct(x.back, x.n)} sub={x => `${pct(x.back, x.n)} % volvió · ${fmtN(x.n)} personas`} color={C.green} />
          <Note>Registros de los últimos 30 días (sin hoy).</Note>
        </Box>
        <Box title="Qué hacen los que vuelven">
          <Rows items={[
            { l: "Editan su card otra vez", n: back.edited }, { l: "Exploran / buscan cards", n: back.explored },
            { l: "Escriben en muros", n: back.posted }, { l: "Dan favoritos", n: back.faved }, { l: "Solo miran", n: back.only_looked },
          ]} label={x => x.l} value={x => x.n ?? 0} sub={x => `${pct(x.n ?? 0, back.people ?? 0)} % · ${fmtN(x.n ?? 0)}`} color={C.blue} />
          <Note>{fmtN(back.people ?? 0)} personas que volvieron (registradas en 30 días). Explorar se mide desde hoy.</Note>
        </Box>
      </div>

      <Box title="Qué hace que vuelvan" right={<span style={{ color: C.dim, fontSize: 12 }}>primer día · volvieron con eso / sin eso</span>}>
        <div style={{ display: "grid", gap: 8 }}>{preds.map(p => (
          <div key={p.key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 1fr 1fr", gap: 10, alignItems: "center", fontSize: 13 }}>
            <span>{PRED[p.key] ?? p.key} <span style={{ color: C.dim }}>· {fmtN(p.yes_n)}</span></span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Bar value={p.yes} max={100} color={C.green} /><b style={{ minWidth: 40 }}>{p.yes} %</b></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Bar value={p.no} max={100} color="rgba(255,255,255,.35)" /><span style={{ color: C.dim, minWidth: 40 }}>{p.no} %</span></div>
          </div>))}</div>
        <Note>Ordenado por la diferencia. Que dos cosas vayan juntas no prueba que una cause la otra, pero dice dónde empujar.</Note>
      </Box>

      <div style={grid(360)}>
        <Box title="Qué editan (7 días)">
          <Rows items={feats} label={x => x.part} value={x => x.people} sub={x => x.ops == null ? `${fmtN(x.people)} personas lo prendieron` : `${fmtN(x.people)} personas · ${fmtN(x.ops)} cambios`} />
        </Box>
        <Box title="Qué tocaron el primer día: los que volvieron vs. los que no">
          <Rows items={fb} label={x => x.part} value={x => x.r} sub={x => `${x.r} % volvió · ${fmtN(x.back + x.gone)}`} color={C.green} />
          <Note>De quienes tocaron esa parte (o prendieron ese efecto) el primer día, cuántos volvieron. Promedio general: {pct(stB, stN)} %.</Note>
        </Box>
      </div>

      <div style={grid(360)}>
        <Box title="Qué usan en cada visita (7 días)">
          <Rows items={(d.used ?? []).slice(0, 25)} label={x => crumbLabel(x.what)} value={x => x.visits} sub={x => `${fmtN(x.visits)} visitas · ${fmtN(x.people)} personas`} color={C.blue} />
          <Note>Se mide desde el 27/11.</Note>
        </Box>
        <Box title="Lo último antes de irse (7 días)">
          <Rows items={(d.exits ?? []).slice(0, 20)} label={x => crumbLabel(x.what)} value={x => x.n} color={C.red} />
          <Note>Dónde se cierra la página o se cambia de app. Si algo aparece mucho acá y poco en "Qué usan", ahí se aburren o se traban.</Note>
        </Box>
      </div>

      <div style={grid(260)}>
        <Box title="Cuánto dura una visita">
          {visits.length === 0 ? <span style={{ color: C.dim }}>Sin datos todavía.</span> : visits.map(v => (
            <div key={String(v.phone)} style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 6 }}>
              <b>{v.phone ? "Celular" : "Compu"}</b> · {fmtN(v.n)} visitas<br />
              <span style={{ color: C.dim }}>mitad dura menos de <b style={{ color: C.text }}>{Math.round(v.median)} s</b> · 3 de 4, menos de {Math.round(v.p75)} s · {pct(v.under30, v.n)} % menos de 30 s · {pct(v.over5m, v.n)} % más de 5 min</span>
            </div>))}
        </Box>
        <Box title="De dónde llegan (14 días)">
          <Rows items={d.arrivals ?? []} label={x => x.from} value={x => x.devices} sub={x => `${fmtN(x.devices)} · ${fmtN(x.signed_up)} se registraron`} />
          <Note>Por dispositivo, la primera vez que entra. Se mide desde el 27/11.</Note>
        </Box>
        <Box title="Explorar, muros y compartir (7 días)">
          <div style={{ display: "grid", gap: 5, fontSize: 13.5 }}>
            <div>Abrieron Explorar: <b>{fmtN(so.explore_open)}</b> veces · {fmtN(so.explore_people)} personas</div>
            <div>Abrieron una card desde Explorar: <b>{fmtN(so.explore_card)}</b>{so.explore_tabs && Object.keys(so.explore_tabs).length > 0 && <span style={{ color: C.dim }}> ({Object.entries(so.explore_tabs).map(([t, n]) => `${t === "para" ? "Para vos" : t === "fav" ? "favoritos" : t}: ${n}`).join(" · ")})</span>}</div>
            <div>Dieron vuelta su card: <b>{fmtN(so.wall_flip_own)}</b> · una ajena: <b>{fmtN(so.wall_flip_other)}</b></div>
            <div>Posts en su muro: <b>{fmtN(so.wall_post_own)}</b> · en muros ajenos: <b>{fmtN(so.wall_post_other)}</b> · me gusta: {fmtN(so.wall_like)}</div>
            <div>Favoritos: <b>{fmtN(so.favorite_add)}</b> · compartir: {fmtN(so.share)} · búsquedas: {fmtN(so.search)}</div>
            <div style={{ color: so.crash ? C.amber : C.dim }}>Cierres inesperados de la página: {fmtN(so.crash)}</div>
          </div>
          <Note>Explorar y muro se miden desde el 27/11.</Note>
        </Box>
      </div>
    </div>
  );
}
