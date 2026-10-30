"use client";
/**
 * Crews in the editor (rail › Crews): the dock panel, built with the editor's
 * own parts so it follows the editor's theme. Your crews (tap one and its
 * room unfolds full screen), a star to pin up to 10 to the rail, and create a
 * crew or join one by pasting its invite link. Everything about a crew —
 * notices, members, invite, edit — lives in its room (CrewHouseOverlay).
 */
import React, { useEffect, useRef, useState } from "react";
import { InspectorShell, MenuNote, TextInput, ActionButton, Icon, T } from "@/ui";
import { crewApi, crewsChanged } from "./crewApi";
import { CREW_FONTS, crewFontStyle, googleFontsHref } from "./crewLook";
import { CREW_MAX_PINS, CREW_SLUG_RE, crewErrorText, memberNumber, parseInvite, roleLabel, slugify, cleanCrewName, type Crew, type MyCrew } from "./crewTypes";
import { CrewEmblem, type CrewsHub } from "./CrewsHub";

export interface CrewsPanelProps {
  hub: CrewsHub;
  /** Open a crew's room (full screen), optionally straight into its editor. */
  onOpenRoom: (crew: Crew, from: DOMRect | null, edit?: boolean) => void;
  /** Open this crew's room when the panel opens (?crews=<id>[&edit]). */
  initialCrewId?: string | null;
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
  const crews = p.hub.mine;
  const [error, setError] = useState("");
  const deepLink = useRef(p.initialCrewId ?? null);
  useEffect(() => { p.hub.reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ?crews=<id>[&edit]: open that crew's room once the list is here.
  useEffect(() => {
    const id = deepLink.current;
    if (!id || !crews) return;
    deepLink.current = null;
    const m = crews.find(c => c.crew.id === id);
    if (m) p.onOpenRoom(m.crew, null, !!p.initialEdit && m.role !== "member");
  }, [crews, p]);

  const pinnedCount = (crews ?? []).filter(c => c.pinned).length;
  const togglePin = async (m: MyCrew) => {
    setError("");
    try { await crewApi.pin(m.crew.id, !m.pinned); crewsChanged(); }
    catch (e) { setError(crewErrorText(e)); }
  };

  return (
    <InspectorShell
      id={p.id}
      title="Crews"
      icon="crew"
      path={`tus crews · ${pinnedCount} de ${CREW_MAX_PINS} en la barra`}
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
        ) : (
          <CrewList crews={crews} onOpen={(m, r) => p.onOpenRoom(m.crew, r)} onPin={togglePin} onCreated={async id => {
            crewsChanged();
            const fresh = await crewApi.mine().catch(() => null);
            const m = fresh?.find(c => c.crew.id === id);
            if (m) p.onOpenRoom(m.crew, null, true);
          }} />
        )}
      </div>
    </InspectorShell>
  );
}

// ── The list: your crews, create, join ─────────────────────────────────────

function CrewList({ crews, onOpen, onPin, onCreated }: {
  crews: MyCrew[]; onOpen: (m: MyCrew, from: DOMRect) => void; onPin: (m: MyCrew) => void; onCreated: (id: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"none" | "create" | "join">(crews.length ? "none" : "create");
  return (
    <>
      {crews.length === 0 && <MenuNote>Un crew es tu grupo en myLand: una sala con avisos para tu gente. Se entra con un link de invitación.</MenuNote>}
      {crews.length > 0 && (
        <div role="list" aria-label="Tus crews" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {crews.map(m => (
            <div key={m.crew.id} role="listitem" style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 16, background: T.ui.surface.control }}>
              <button type="button" onClick={e => onOpen(m, e.currentTarget.getBoundingClientRect())}
                aria-label={`Abrir la sala de ${m.crew.name}`}
                style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 4px 8px 12px", border: "none", borderRadius: 16,
                  background: "transparent", color: T.ui.text.primary, cursor: "pointer", textAlign: "left", font: "inherit" }}>
                <CrewEmblem crew={m.crew} size={40} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: crewFontStyle(m.crew.font), fontWeight: 800, fontSize: 16, lineHeight: 1.1, color: m.crew.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.crew.name}</span>
                  <span style={{ font: `500 12px ${T.uiFont.mono}`, color: T.ui.text.tertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {memberNumber(m.number)} · {roleLabel(m.role).toLowerCase()} · {m.members} {m.members === 1 ? "miembro" : "miembros"}
                  </span>
                </span>
              </button>
              <button type="button" className="mn-iconbtn mn-tip" data-tip={m.pinned ? "Quitar de la barra" : "Fijar en la barra"}
                aria-label={m.pinned ? `Quitar ${m.crew.name} de la barra` : `Fijar ${m.crew.name} en la barra`} aria-pressed={m.pinned}
                onClick={() => onPin(m)}
                style={{ width: 40, height: 40, marginRight: 8, flex: "none", border: "none", borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer",
                  background: m.pinned ? T.ui.surface.sel : "transparent", color: m.pinned ? T.ui.text.sel : T.ui.text.secondary }}>
                <Icon name="star" size={16} />
              </button>
            </div>
          ))}
          <MenuNote>Los fijados aparecen en la barra de la izquierda (hasta {CREW_MAX_PINS}) y te avisan cuando publican algo.</MenuNote>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><ActionButton variant={mode === "create" ? "primary" : "secondary"} fullWidth onClick={() => setMode(m => m === "create" ? "none" : "create")}><Icon name="plus" size={15} />Crear crew</ActionButton></div>
        <div style={{ flex: 1 }}><ActionButton variant={mode === "join" ? "primary" : "secondary"} fullWidth onClick={() => setMode(m => m === "join" ? "none" : "join")}><Icon name="link" size={15} />Unirme</ActionButton></div>
      </div>
      {mode === "create" && <CreateForm onCreated={onCreated} />}
      {mode === "join" && <JoinForm onJoined={async () => { crewsChanged(); setMode("none"); }} />}
    </>
  );
}

function CreateForm({ onCreated }: { onCreated: (id: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [free, setFree] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slug = slugify(name);
  const latest = useRef("");
  useEffect(() => {
    latest.current = slug;
    setFree(null);
    if (!CREW_SLUG_RE.test(slug)) return;
    const t = setTimeout(async () => { const ok = await crewApi.slugFree(slug); if (latest.current === slug) setFree(ok); }, 350);
    return () => clearTimeout(t);
  }, [slug]);
  const ok = CREW_SLUG_RE.test(slug) && free === true && !busy;
  const bad = (!!name.trim() && !CREW_SLUG_RE.test(slug)) || free === false;
  const note = !name.trim() ? "Letras, números y espacios. De 3 a 24."
    : !CREW_SLUG_RE.test(slug) ? "Usá al menos 3 letras o números."
    : free === null ? "Buscando…" : free ? "Libre." : "Ya hay un crew con ese nombre.";
  async function create() {
    if (!ok) return;
    setBusy(true); setError("");
    try { await onCreated(await crewApi.create(slug, name.trim())); }
    catch (e) { setBusy(false); setError(crewErrorText(e)); }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <TextInput label="Nombre del crew" placeholder="Nombre del crew" value={name} maxLength={24}
        onChange={v => { setName(cleanCrewName(v)); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") void create(); }} />
      <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 4px" }}>
        <span style={{ font: `500 12px ${T.uiFont.mono}`, color: T.ui.text.secondary, overflowWrap: "anywhere" }}>
          myland.lol/c/<span style={{ color: T.ui.text.primary }}>{slug || "…"}</span>
        </span>
        <MenuNote tone={bad ? "warn" : "hint"}>{note}</MenuNote>
      </div>
      {error && <MenuNote tone="warn">{error}</MenuNote>}
      <ActionButton variant="primary" fullWidth disabled={!ok} onClick={create}>{busy ? "Creando…" : "Crear crew"}</ActionButton>
      <MenuNote>Vas a ser el fundador y el miembro #01.</MenuNote>
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
