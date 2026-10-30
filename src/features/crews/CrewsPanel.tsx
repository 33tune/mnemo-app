"use client";
/**
 * Crews in the editor (rail › Crews, 2026-10-30): the dock panel, built with
 * the editor's own parts (InspectorShell, MenuSection, fields) so it follows
 * the editor's theme. Without crews: create one or join one by pasting its
 * invite link. With crews: each one opens its page here — a preview, Visitar
 * (the house, full screen, still in the dashboard), open it in a new tab.
 * The owner gets shortcuts (members with a search, the invite link) and
 * "Editar": the crew's room unfolds full screen and is edited live there
 * (CrewHouseOverlay + CrewEditPanel). Only the owner edits.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { InspectorShell, MenuSection, Accordion, MenuNote, TextInput, ActionButton, Icon, T } from "@/ui";
import { crewApi, inviteUrl } from "./crewApi";
import { CREW_FONTS, crewFontStyle, googleFontsHref } from "./crewLook";
import {
  CREW_LIMITS, CREW_MAX_MEMBERS, CREW_MAX_PER_USER, CREW_SLUG_RE, crewErrorText, inkOn, isFounder,
  memberNumber, parseInvite, slugify, type Crew, type CrewHouse, type MyCrew,
} from "./crewTypes";
import { CrewHouseOverlay } from "./CrewHouseOverlay";

export interface CrewsPanelProps {
  userId?: string;
  /** Open this crew's page when the panel opens (?crews=<id>). */
  initialCrewId?: string | null;
  /** …and open its editor (?crews=<id>&edit, the house's "Editar crew"). */
  initialEdit?: boolean;
  // Shell
  id?: string;
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

const ALL_FONTS_HREF = googleFontsHref(CREW_FONTS);

export default function CrewsPanel(p: CrewsPanelProps) {
  const [crews, setCrews] = useState<MyCrew[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(p.initialCrewId ?? null);
  const [visiting, setVisiting] = useState<Visit | null>(null);
  const autoEdit = useRef(!!p.initialEdit);

  const reload = useCallback(async () => {
    if (!p.userId) return;
    try { setCrews(await crewApi.mine(p.userId)); setError(""); }
    catch (e) { setError(crewErrorText(e)); setCrews([]); }
  }, [p.userId]);
  useEffect(() => { void reload(); }, [reload]);

  const open = crews?.find(c => c.crew.id === openId) ?? null;

  return (
    <InspectorShell
      id={p.id}
      title={open ? open.crew.name : "Crews"}
      icon="crew"
      path={open ? `crews / ${open.crew.slug}` : `tus círculos · ${crews?.length ?? 0} de ${CREW_MAX_PER_USER}`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      {ALL_FONTS_HREF && <link rel="stylesheet" href={ALL_FONTS_HREF} precedence="default" />}
      <div className="mn-swap" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <MenuNote tone="warn">{error}</MenuNote>}
        {crews === null ? (
          <MenuNote>Cargando…</MenuNote>
        ) : open ? (
          <CrewPage key={open.crew.id} mine={open} userId={p.userId!} onBack={() => setOpenId(null)}
            autoEdit={autoEdit} onVisit={setVisiting} onChanged={reload} />
        ) : (
          <CrewList crews={crews} userId={p.userId!} onOpen={setOpenId} onChanged={reload} />
        )}
      </div>
      {visiting && <CrewHouseOverlay key={visiting.slug} slug={visiting.slug} viewerId={p.userId} from={visiting.from} initial={visiting.house}
        onClose={() => { setVisiting(null); void reload(); }}
        edit={{ start: visiting.edit, onSaved: () => void reload(), onGone: () => { setOpenId(null); void reload(); } }} />}
    </InspectorShell>
  );
}

interface Visit { slug: string; from: DOMRect | null; edit: boolean; house: CrewHouse | null }

// ── The list: your crews, create, join ─────────────────────────────────────

function CrewList({ crews, userId, onOpen, onChanged }: {
  crews: MyCrew[]; userId: string; onOpen: (id: string) => void; onChanged: () => Promise<void>;
}) {
  const full = crews.length >= CREW_MAX_PER_USER;
  const [mode, setMode] = useState<"none" | "create" | "join">(crews.length ? "none" : "create");
  return (
    <>
      {crews.length === 0 && <MenuNote>Un crew es un círculo cerrado con su propia sala. Solo se entra con invitación, y cada miembro tiene su número.</MenuNote>}
      {crews.length > 0 && (
        <div role="list" aria-label="Tus crews" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {crews.map(m => (
            <button key={m.crew.id} type="button" role="listitem" onClick={() => onOpen(m.crew.id)} className="mn-crewrow"
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 60, padding: "8px 12px", border: "none", borderRadius: 16,
                background: T.ui.surface.control, color: T.ui.text.primary, cursor: "pointer", textAlign: "left", font: "inherit" }}>
              <Emblem crew={m.crew} size={40} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontFamily: crewFontStyle(m.crew.font), fontWeight: 800, fontSize: 16, lineHeight: 1.1, color: m.crew.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.crew.name}</span>
                <span style={{ font: `500 12px ${T.uiFont.mono}`, color: T.ui.text.tertiary }}>
                  {memberNumber(m.number)}{isFounder(m.number) ? " · fundador" : ""} · {m.members}/{CREW_MAX_MEMBERS}{m.crew.owner_id === userId ? " · dueño" : ""}
                </span>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
          ))}
        </div>
      )}

      {full ? (
        <MenuNote>Estás en {CREW_MAX_PER_USER} crews, el máximo.</MenuNote>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><ActionButton variant={mode === "create" ? "primary" : "secondary"} fullWidth onClick={() => setMode(m => m === "create" ? "none" : "create")}><Icon name="plus" size={15} />Crear crew</ActionButton></div>
          <div style={{ flex: 1 }}><ActionButton variant={mode === "join" ? "primary" : "secondary"} fullWidth onClick={() => setMode(m => m === "join" ? "none" : "join")}><Icon name="link" size={15} />Unirme</ActionButton></div>
        </div>
      )}
      {!full && mode === "create" && <CreateForm onCreated={async id => { await onChanged(); onOpen(id); }} />}
      {!full && mode === "join" && <JoinForm onJoined={async () => { await onChanged(); setMode("none"); }} />}
    </>
  );
}

function CreateForm({ onCreated }: { onCreated: (id: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [free, setFree] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef("");
  useEffect(() => {
    latest.current = slug;
    setFree(null);
    if (!CREW_SLUG_RE.test(slug)) return;
    const t = setTimeout(async () => { const ok = await crewApi.slugFree(slug); if (latest.current === slug) setFree(ok); }, 350);
    return () => clearTimeout(t);
  }, [slug]);
  const ok = name.trim().length > 0 && CREW_SLUG_RE.test(slug) && free === true && !busy;
  const note = !slug ? "El link: de 3 a 24 letras, números, - o _." : !CREW_SLUG_RE.test(slug) ? "Usá de 3 a 24 letras, números, - o _." : free === null ? "Buscando…" : free ? "Libre." : "Ese link ya lo usa otro crew.";
  async function create() {
    if (!ok) return;
    setBusy(true); setError("");
    try { await onCreated(await crewApi.create(slug, name.trim())); }
    catch (e) { setBusy(false); setError(crewErrorText(e)); }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TextInput label="Nombre del crew" value={name} maxLength={CREW_LIMITS.name}
        onChange={v => { setName(v); if (!slugEdited) setSlug(slugify(v)); }} />
      <TextInput label="Link de la sala · myland.lol/c/" value={slug} mono maxLength={24}
        onChange={v => { setSlugEdited(true); setSlug(slugify(v)); }} />
      <MenuNote tone={free === false || (!!slug && !CREW_SLUG_RE.test(slug)) ? "warn" : "hint"}>{note}</MenuNote>
      {error && <MenuNote tone="warn">{error}</MenuNote>}
      <ActionButton variant="primary" fullWidth disabled={!ok} onClick={create}>{busy ? "Creando…" : "Crear crew"}</ActionButton>
      <MenuNote>Vas a ser el dueño y el miembro #01.</MenuNote>
    </div>
  );
}

function JoinForm({ onJoined }: { onJoined: () => Promise<void> }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "hint" | "warn"; text: string } | null>(null);
  const inv = parseInvite(link);
  async function join() {
    if (!inv || busy) return;
    setBusy(true); setMsg(null);
    try {
      const n = await crewApi.join(inv.slug, inv.code);
      setMsg({ tone: "hint", text: `Listo: sos el miembro ${memberNumber(n)}.` });
      setLink("");
      await onJoined();
    } catch (e) { setMsg({ tone: "warn", text: crewErrorText(e) }); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TextInput label="Link de invitación" value={link} mono placeholder="myland.lol/c/…/unirme?k=…" onChange={v => { setLink(v); setMsg(null); }} />
      {link && !inv && <MenuNote tone="warn">Pegá el link completo que te pasaron.</MenuNote>}
      {msg && <MenuNote tone={msg.tone}>{msg.text}</MenuNote>}
      <ActionButton variant="primary" fullWidth disabled={!inv || busy} onClick={join}>{busy ? "Uniéndome…" : "Unirme"}</ActionButton>
    </div>
  );
}

// ── One crew: preview, visit, manage ───────────────────────────────────────

function CrewPage({ mine, userId, onBack, onVisit, onChanged, autoEdit }: {
  mine: MyCrew; userId: string; onBack: () => void; onVisit: (v: Visit) => void; onChanged: () => Promise<void>;
  autoEdit: React.MutableRefObject<boolean>;
}) {
  const owner = mine.crew.owner_id === userId;
  const [house, setHouse] = useState<CrewHouse | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);
  useEffect(() => { crewApi.house(mine.crew.slug).then(setHouse).catch(() => setHouse(null)); }, [mine.crew.slug, mine.crew]);
  const go = (el: HTMLElement | null, edit: boolean) => onVisit({ slug: mine.crew.slug, from: el?.getBoundingClientRect() ?? null, edit, house });
  // "Editar crew" from the house page: straight into the editor.
  useEffect(() => {
    if (!owner || !autoEdit.current) return;
    autoEdit.current = false;
    const t = setTimeout(() => go(editRef.current, true), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  return (
    <>
      <button type="button" onClick={onBack} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, height: 30, padding: "0 10px 0 6px", border: "none", borderRadius: 999,
        background: T.ui.surface.control, color: T.ui.text.secondary, font: `600 13px ${T.uiFont.sans}`, cursor: "pointer" }}>
        <Icon name="chevron-left" size={14} />Crews
      </button>

      <Preview crew={mine.crew} house={house} number={mine.number} />

      {owner && (
        <div ref={editRef}>
          <ActionButton variant="primary" fullWidth onClick={() => go(editRef.current, true)}><Icon name="pencil" size={15} />Editar la sala</ActionButton>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><ActionButton variant={owner ? "secondary" : "primary"} fullWidth onClick={e => go(e.currentTarget as HTMLElement, false)}><Icon name="maximize" size={15} />Visitar</ActionButton></div>
        <div style={{ flex: 1 }}><ActionButton variant="secondary" fullWidth onClick={() => window.open(`/c/${mine.crew.slug}`, "_blank", "noopener")}><Icon name="external" size={15} />Pestaña nueva</ActionButton></div>
      </div>

      {owner ? (
        <Accordion open={section} onOpenChange={setSection}>
          <MenuSection label="Miembros" icon="crew" summary={`${house?.members.length ?? mine.members} de ${CREW_MAX_MEMBERS}`}>
            <MembersBox crew={mine.crew} userId={userId} onChanged={onChanged} />
          </MenuSection>
          <MenuSection label="Invitación" icon="link" summary="Solo con el link">
            <InviteBox crew={mine.crew} />
          </MenuSection>
        </Accordion>
      ) : (
        <>
          <MenuNote>Solo el dueño puede cambiar el crew.</MenuNote>
          <ActionButton variant="danger" fullWidth onClick={async () => {
            if (!window.confirm(`¿Irte de ${mine.crew.name}? Para volver vas a necesitar otra invitación y otro número.`)) return;
            try { await crewApi.leave(mine.crew.id); onBack(); await onChanged(); } catch (e) { window.alert(crewErrorText(e)); }
          }}>Irme del crew</ActionButton>
        </>
      )}
    </>
  );
}

function Preview({ crew, house, number }: { crew: Crew; house: CrewHouse | null; number: number }) {
  const members = house?.members ?? [];
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: "18px 14px 14px", background: crew.bg_color, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      {crew.bg_image && <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("${crew.bg_image}")`, backgroundRepeat: "repeat", backgroundSize: "auto", opacity: 0.85 }} />}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.05), rgba(0,0,0,.55))" }} />
      <div style={{ position: "relative" }}><Emblem crew={crew} size={56} /></div>
      <div style={{ position: "relative", fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: 24, lineHeight: 1, color: crew.color, overflowWrap: "anywhere", textShadow: "0 2px 14px rgba(0,0,0,.5)" }}>{crew.name}</div>
      {crew.motto && <div style={{ position: "relative", font: `600 13px/1.4 ${T.uiFont.sans}`, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.7)" }}>“{crew.motto}”</div>}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 0, marginTop: 4 }}>
        {members.slice(0, 7).map((m, i) => {
          const photo = typeof m.card?.photo === "string" ? (m.card.photo as string) : null;
          return (
            <span key={m.user_id} title={`@${m.handle}`} style={{ width: 28, height: 28, marginLeft: i ? -8 : 0, borderRadius: 999, overflow: "hidden", border: "2px solid rgba(10,8,14,.8)", background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center" }}>
              {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="user" size={13} />}
            </span>
          );
        })}
        <span style={{ marginLeft: 8, font: `600 12px ${T.uiFont.mono}`, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>{members.length || 1}/{CREW_MAX_MEMBERS}</span>
      </div>
      <span style={{ position: "relative", font: `700 11px ${T.uiFont.mono}`, letterSpacing: ".06em", color: "#fff", opacity: 0.85 }}>VOS: {memberNumber(number)}{isFounder(number) ? " · FUNDADOR" : ""}</span>
    </div>
  );
}

function InviteBox({ crew }: { crew: Crew }) {
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { crewApi.inviteCode(crew.id).then(setCode).catch(e => setNote(crewErrorText(e))); }, [crew.id]);
  const link = code ? inviteUrl(crew.slug, code) : "";
  return (
    <>
      <TextInput label="Link de invitación" value={link || "…"} mono onChange={() => {}} />
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><ActionButton variant="primary" fullWidth disabled={!code} onClick={async () => {
          try { await navigator.clipboard.writeText(link); setNote("Copiado."); } catch { setNote("Copialo desde el campo."); }
        }}><Icon name="copy" size={15} />Copiar</ActionButton></div>
        <div style={{ flex: 1 }}><ActionButton variant="secondary" fullWidth disabled={!code} onClick={async () => {
          if (!window.confirm("¿Renovar el link? El de ahora deja de servir.")) return;
          try { setCode(await crewApi.inviteCode(crew.id, true)); setNote("Link nuevo listo."); } catch (e) { setNote(crewErrorText(e)); }
        }}><Icon name="reset" size={15} />Renovar</ActionButton></div>
      </div>
      <MenuNote>{note || "Si el link se filtra, renovalo: el viejo deja de servir."}</MenuNote>
    </>
  );
}

function MembersBox({ crew, userId, onChanged }: { crew: Crew; userId: string; onChanged: () => Promise<void> }) {
  const [list, setList] = useState<{ user_id: string; number: number; handle: string; name: string | null }[] | null>(null);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(() => crewApi.members(crew.id).then(setList).catch(e => setNote(crewErrorText(e))), [crew.id]);
  useEffect(() => { void load(); }, [load]);
  if (!list) return <MenuNote>Cargando…</MenuNote>;
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const shown = needle ? list.filter(m => m.handle.toLowerCase().includes(needle) || (m.name ?? "").toLowerCase().includes(needle)) : list;
  return (
    <>
      <TextInput label="Buscar" value={q} placeholder="Nombre o @usuario" onChange={setQ} />
      <div role="list" aria-label="Miembros" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {shown.map(m => (
          <div key={m.user_id} role="listitem" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "4px 4px 4px 12px", borderRadius: 12, background: T.ui.surface.control }}>
            <span style={{ font: `700 12px ${T.uiFont.mono}`, color: T.ui.text.tertiary, width: 30, flex: "none" }}>{memberNumber(m.number)}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ font: `600 13px ${T.uiFont.sans}`, color: T.ui.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || m.handle}</span>
              <span style={{ font: `500 11px ${T.uiFont.mono}`, color: T.ui.text.tertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{m.handle}</span>
            </span>
            {m.user_id === userId
              ? <span style={{ font: `600 12px ${T.uiFont.sans}`, color: T.ui.text.tertiary, padding: "0 10px" }}>{isFounder(m.number) ? "fundador · vos" : "vos"}</span>
              : <ActionButton variant="ghost" onClick={async () => {
                  if (!window.confirm(`¿Sacar a @${m.handle} del crew?`)) return;
                  try { await crewApi.kick(crew.id, m.user_id); await load(); await onChanged(); } catch (e) { setNote(crewErrorText(e)); }
                }}>Sacar</ActionButton>}
          </div>
        ))}
        {shown.length === 0 && <MenuNote>Nadie con “{q.trim()}”.</MenuNote>}
      </div>
      {note && <MenuNote tone="warn">{note}</MenuNote>}
    </>
  );
}

function Emblem({ crew, size }: { crew: Pick<Crew, "emblem_url" | "color" | "name">; size: number }) {
  return crew.emblem_url
    ? <img src={crew.emblem_url} alt="" style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />
    : <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: crew.color, color: inkOn(crew.color), flex: "none", display: "grid", placeItems: "center", font: `800 ${Math.round(size * 0.42)}px ${T.uiFont.sans}` }}>{(crew.name || "?").trim().charAt(0).toUpperCase()}</span>;
}
