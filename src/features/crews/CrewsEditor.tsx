"use client";
/**
 * /crews: your crews (feature one on your card, leave), create one, and —
 * for the owner only — its look (name, motto, emblem, color, font,
 * background, music, notice, Discord), the invite link and the members.
 * Simple forms on the site's glass, like /setup.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadToStorage } from "@/lib/storage";
import { Icon, CrewShell, CrewPanel, Eyebrow, Title, Lead, PrimaryButton, WellButton, Field, Notice } from "./CrewShell";
import { crewApi, inviteUrl } from "./crewApi";
import { CREW_FONTS, crewFontStyle, googleFontsHref } from "./crewLook";
import {
  CREW_LIMITS, CREW_MAX_MEMBERS, CREW_MAX_PER_USER, CREW_SLUG_RE, DISCORD_RE, crewErrorText, inkOn, isFounder,
  memberNumber, normalizeDiscord, slugify, type Crew, type CrewPatch, type MyCrew,
} from "./crewTypes";

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; id: string };

export default function CrewsEditor({ userId, handle, openCrewId }: { userId: string; handle: string; openCrewId?: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>(openCrewId ? { kind: "edit", id: openCrewId } : { kind: "list" });
  const [crews, setCrews] = useState<MyCrew[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    try { setCrews(await crewApi.mine(userId)); setLoadError(""); }
    catch (e) { setLoadError(crewErrorText(e)); setCrews([]); }
  }, [userId]);
  useEffect(() => { void reload(); }, [reload]);

  const go = (v: View) => {
    setView(v);
    router.replace(v.kind === "edit" ? `/crews?crew=${v.id}` : "/crews", { scroll: false });
    window.scrollTo({ top: 0 });
  };

  const fonts = googleFontsHref((crews ?? []).map(c => c.crew.font));
  const editing = view.kind === "edit" ? crews?.find(c => c.crew.id === view.id) : undefined;

  return (
    <CrewShell align="start" extraFontsHref={fonts}>
      <div style={{ width: "min(560px,100%)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          {view.kind === "list"
            ? <WellButton href="/dashboard" small><Icon name="chevron-left" size={14} /> Volver al editor</WellButton>
            : <WellButton onClick={() => go({ kind: "list" })} small><Icon name="chevron-left" size={14} /> Tus crews</WellButton>}
          <WellButton href={`/${handle}`} small>Ver mi perfil</WellButton>
        </div>

        {crews === null ? (
          <CrewPanel><Lead>Cargando…</Lead></CrewPanel>
        ) : view.kind === "create" ? (
          <CreateCrew onCreated={async id => { await reload(); go({ kind: "edit", id }); }} />
        ) : view.kind === "edit" && editing && editing.crew.owner_id === userId ? (
          <EditCrew key={editing.crew.id} crew={editing.crew} userId={userId}
            onSaved={reload} onDeleted={async () => { await reload(); go({ kind: "list" }); }} />
        ) : (
          <CrewList crews={crews} userId={userId} error={loadError}
            onCreate={() => go({ kind: "create" })} onEdit={id => go({ kind: "edit", id })} onChanged={reload} />
        )}
      </div>
    </CrewShell>
  );
}

// ── Your crews ──────────────────────────────────────────────────────────────

function CrewList({ crews, userId, error, onCreate, onEdit, onChanged }: {
  crews: MyCrew[]; userId: string; error: string;
  onCreate: () => void; onEdit: (id: string) => void; onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key); setMsg("");
    try { await fn(); await onChanged(); } catch (e) { setMsg(crewErrorText(e)); }
    setBusy(null);
  };
  const canCreate = crews.length < CREW_MAX_PER_USER;

  return (
    <CrewPanel>
      <Eyebrow>CREWS</Eyebrow>
      <Title>Tus crews</Title>
      <Lead>
        {crews.length
          ? "Destacá uno en tu card: lo lleva tu card con tu número, y quien lo toque entra a la casa del crew."
          : "Un crew es un círculo cerrado con su propia casa: solo se entra con invitación, y cada miembro tiene su número."}
      </Lead>
      <Notice tone="bad">{error || msg}</Notice>

      {crews.map(m => {
        const owner = m.crew.owner_id === userId;
        return (
          <article key={m.crew.id} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 20, background: "var(--glass-well)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Emblem crew={m.crew} size={46} />
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: crewFontStyle(m.crew.font), fontWeight: 800, fontSize: 20, lineHeight: 1.05, color: m.crew.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.crew.name}</span>
                <span style={{ font: "500 12px var(--font-mono)", color: "var(--ml-ink-3)" }}>
                  {memberNumber(m.number)}{isFounder(m.number) ? " · fundador" : ""} · {m.members}/{CREW_MAX_MEMBERS} miembros{owner ? " · dueño" : ""}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <WellButton small href={`/c/${m.crew.slug}`}>Ver casa</WellButton>
              <WellButton small disabled={busy !== null} onClick={() => run(`f${m.crew.id}`, () => crewApi.feature(m.featured ? null : m.crew.id))}>
                {m.featured ? <><Icon name="check" size={14} /> En mi card</> : "Mostrar en mi card"}
              </WellButton>
              {owner
                ? <WellButton small onClick={() => onEdit(m.crew.id)}><Icon name="pencil" size={14} /> Editar</WellButton>
                : <WellButton small danger disabled={busy !== null} onClick={() => {
                    if (window.confirm(`¿Irte de ${m.crew.name}? Si volvés, vas a necesitar una invitación nueva y otro número.`)) void run(`l${m.crew.id}`, () => crewApi.leave(m.crew.id));
                  }}>Irme</WellButton>}
            </div>
            {m.featured && <BadgeSize crew={m} />}
          </article>
        );
      })}

      {canCreate
        ? <PrimaryButton onClick={onCreate}>Crear un crew</PrimaryButton>
        : <Lead>Estás en {CREW_MAX_PER_USER} crews, el máximo.</Lead>}
    </CrewPanel>
  );
}

/** The badge's size on your own card (its place: drag it on the card in the editor). */
function BadgeSize({ crew }: { crew: MyCrew }) {
  const [size, setSize] = useState(Math.round(crew.badge_size * 100));
  const [note, setNote] = useState("");
  const saved = useRef(size);
  const persist = async () => {
    if (saved.current === size) return;
    saved.current = size;
    try { await crewApi.setBadge(crew.crew.id, crew.badge_x, crew.badge_y, size / 100); setNote("Guardado."); }
    catch (e) { setNote(crewErrorText(e)); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)" }}>
        <span style={{ flex: "none" }}>Tamaño en tu card</span>
        <input type="range" min={60} max={200} step={5} value={size} aria-valuetext={`${size} %`}
          onChange={e => { setSize(Number(e.target.value)); setNote(""); }}
          onPointerUp={() => void persist()} onKeyUp={() => void persist()} onBlur={() => void persist()}
          style={{ flex: 1, accentColor: "var(--ml-accent)" }} />
        <span style={{ font: "600 12px var(--font-mono)", width: 42, textAlign: "right" }}>{size}%</span>
      </label>
      <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--ml-ink-3)" }}>{note || "Para moverlo, arrastralo sobre tu card en el editor."}</span>
    </div>
  );
}

// ── Create ──────────────────────────────────────────────────────────────────

function CreateCrew({ onCreated }: { onCreated: (id: string) => Promise<void> }) {
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
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError("");
    try { await onCreated(await crewApi.create(slug, name.trim())); }
    catch (err) { setBusy(false); setError(crewErrorText(err)); }
  }
  const slugNote = !slug ? "3 a 24 letras, números, - o _" : !CREW_SLUG_RE.test(slug) ? "Usá 3 a 24 letras, números, - o _" : free === null ? "Buscando…" : free ? "¡Está libre!" : "Ese link ya lo usa otro crew";

  return (
    <CrewPanel>
      <Eyebrow>NUEVO CREW</Eyebrow>
      <Title>Armá tu crew</Title>
      <Lead>Vas a ser el dueño y el miembro #01. Después elegís el emblema, los colores y la música.</Lead>
      <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nombre">
          <input className="lg-input" value={name} maxLength={CREW_LIMITS.name} placeholder="Las del 5to B" autoFocus
            onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Link de la casa">
          <span style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 14px", borderRadius: 16, background: "var(--glass-well)" }}>
            <span style={{ font: "600 15px var(--font-sans)", color: "var(--ml-ink-3)", whiteSpace: "nowrap" }}>myland.lol/c/</span>
            <input value={slug} onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} aria-label="Link de la casa"
              spellCheck={false} autoCapitalize="none" autoComplete="off"
              style={{ flex: 1, minWidth: 0, height: 44, border: "none", outline: "none", background: "transparent", color: "var(--ml-ink)", font: "700 15px var(--font-sans)" }} />
          </span>
        </Field>
        <Notice tone={free === false || (slug && !CREW_SLUG_RE.test(slug)) ? "bad" : free ? "ok" : "info"}>{slugNote}</Notice>
        <Notice tone="bad">{error}</Notice>
        <PrimaryButton type="submit" disabled={!ok}>{busy ? "Creando…" : "Crear crew"}</PrimaryButton>
      </form>
    </CrewPanel>
  );
}

// ── Edit (owner) ────────────────────────────────────────────────────────────

const EDIT_KEYS = ["name", "motto", "notice", "emblem_url", "color", "font", "bg_color", "bg_image", "music_url", "discord_url"] as const;

function EditCrew({ crew, userId, onSaved, onDeleted }: { crew: Crew; userId: string; onSaved: () => Promise<void>; onDeleted: () => Promise<void> }) {
  const initial = useRef(crew);
  const [draft, setDraft] = useState<Crew>(crew);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const set = <K extends keyof Crew>(k: K, v: Crew[K]) => { setDraft(d => ({ ...d, [k]: v })); setMsg(null); };

  const discord = normalizeDiscord(draft.discord_url ?? "");
  const discordBad = !!discord && !DISCORD_RE.test(discord);
  const patch: CrewPatch = {};
  for (const k of EDIT_KEYS) {
    const v = k === "discord_url" ? discord : (draft[k] ?? "");
    if (v !== (initial.current[k] ?? "")) (patch as Record<string, unknown>)[k] = v;
  }
  const dirty = Object.keys(patch).length > 0;
  const canSave = dirty && !saving && draft.name.trim().length > 0 && !discordBad;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await crewApi.update(crew.id, patch);
      initial.current = { ...draft, discord_url: discord || null };
      setDraft(initial.current);
      setMsg({ tone: "ok", text: "Guardado. Así se ve tu casa ahora." });
      await onSaved();
    } catch (e) { setMsg({ tone: "bad", text: crewErrorText(e) }); }
    setSaving(false);
  }

  return (
    <>
      <CrewPanel>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Emblem crew={draft} size={58} />
          <div style={{ minWidth: 0 }}>
            <Eyebrow>EDITAR CREW</Eyebrow>
            <div style={{ marginTop: 8, fontFamily: crewFontStyle(draft.font), fontWeight: 800, fontSize: 26, lineHeight: 1, color: draft.color, overflowWrap: "anywhere" }}>{draft.name || "Sin nombre"}</div>
          </div>
        </div>
        <WellButton href={`/c/${crew.slug}`} small>Ver la casa · myland.lol/c/{crew.slug}</WellButton>

        <Section title="Identidad">
          <Field label="Nombre"><input className="lg-input" value={draft.name} maxLength={CREW_LIMITS.name} onChange={e => set("name", e.target.value)} /></Field>
          <Field label="Lema" hint="Una frase corta: es el juramento del Pacto.">
            <input className="lg-input" value={draft.motto} maxLength={CREW_LIMITS.motto} placeholder="Juntos hasta el final" onChange={e => set("motto", e.target.value)} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <Field label="Color"><ColorInput value={draft.color} onChange={v => set("color", v)} label="Color del crew" /></Field>
            <Field label="Fuente">
              <select className="lg-input" value={draft.font} onChange={e => set("font", e.target.value)} style={{ fontFamily: crewFontStyle(draft.font) }}>
                {CREW_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Emblema" hint="El logo del crew: va en la casa, en el Pacto y en la card de cada miembro.">
            <FilePick accept="image/*" url={draft.emblem_url} kind="image" onChange={u => set("emblem_url", u)} />
          </Field>
        </Section>

        <Section title="La casa">
          <Field label="Fondo"><ColorInput value={draft.bg_color} onChange={v => set("bg_color", v)} label="Color de fondo" /></Field>
          <Field label="Imagen de fondo"><FilePick accept="image/*" url={draft.bg_image} kind="image" onChange={u => set("bg_image", u)} /></Field>
          <Field label="Música" hint="Un MP3. Suena en la casa y en el Pacto cuando alguien toca la pantalla.">
            <FilePick accept="audio/mpeg,.mp3" url={draft.music_url} kind="audio" onChange={u => set("music_url", u)} />
          </Field>
          <Field label="Aviso" hint={`Un mensaje fijo arriba de los miembros. ${draft.notice.length}/${CREW_LIMITS.notice}`}>
            <textarea className="lg-input" rows={3} value={draft.notice} maxLength={CREW_LIMITS.notice} placeholder="Reunión el viernes 20 h." onChange={e => set("notice", e.target.value)} />
          </Field>
          <Field label="Servidor de Discord" hint="Un link de invitación, como discord.gg/tucrew.">
            <input className="lg-input" value={draft.discord_url ?? ""} placeholder="discord.gg/tucrew" spellCheck={false} autoCapitalize="none" onChange={e => set("discord_url", e.target.value)} />
          </Field>
          {discordBad && <Notice tone="bad">Ese link de Discord no es válido. Usá uno de invitación (discord.gg/...).</Notice>}
        </Section>

        <div style={{ position: "sticky", bottom: 12, display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <PrimaryButton disabled={!canSave} onClick={save}>{saving ? "Guardando…" : dirty ? "Guardar cambios" : "Sin cambios"}</PrimaryButton>
        </div>
      </CrewPanel>

      <Invite crew={crew} />
      <Members crew={crew} userId={userId} onChanged={onSaved} />

      <CrewPanel>
        <Section title="Borrar el crew">
          <Lead>Se borra la casa y todos dejan de ser miembros. No se puede deshacer.</Lead>
          <WellButton danger onClick={async () => {
            if (!window.confirm(`¿Borrar ${crew.name} para siempre?`)) return;
            try { await crewApi.remove(crew.id); await onDeleted(); } catch (e) { window.alert(crewErrorText(e)); }
          }}><Icon name="trash" size={15} /> Borrar {crew.name}</WellButton>
        </Section>
      </CrewPanel>
    </>
  );
}

function Invite({ crew }: { crew: Crew }) {
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { crewApi.inviteCode(crew.id).then(setCode).catch(e => setNote(crewErrorText(e))); }, [crew.id]);
  const link = code ? inviteUrl(crew.slug, code) : "";
  return (
    <CrewPanel>
      <Section title="Invitación">
        <Lead>Pasale este link a quien quieras sumar. Si se filtra, renovalo: el viejo deja de servir.</Lead>
        <input className="lg-input" readOnly value={link || "Cargando…"} aria-label="Link de invitación" onFocus={e => e.currentTarget.select()} style={{ font: "500 13px var(--font-mono)" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <WellButton disabled={!code} onClick={async () => {
            try { await navigator.clipboard.writeText(link); setNote("Link copiado."); } catch { setNote("Copialo desde el campo de arriba."); }
          }}><Icon name="copy" size={15} /> Copiar link</WellButton>
          <WellButton disabled={!code} onClick={async () => {
            if (!window.confirm("¿Renovar el link? El de ahora deja de servir.")) return;
            try { setCode(await crewApi.inviteCode(crew.id, true)); setNote("Link nuevo listo."); } catch (e) { setNote(crewErrorText(e)); }
          }}><Icon name="reset" size={15} /> Renovar link</WellButton>
        </div>
        <Notice>{note}</Notice>
      </Section>
    </CrewPanel>
  );
}

function Members({ crew, userId, onChanged }: { crew: Crew; userId: string; onChanged: () => Promise<void> }) {
  const [list, setList] = useState<{ user_id: string; number: number; handle: string }[] | null>(null);
  const [note, setNote] = useState("");
  const load = useCallback(() => crewApi.members(crew.id).then(setList).catch(e => setNote(crewErrorText(e))), [crew.id]);
  useEffect(() => { void load(); }, [load]);
  return (
    <CrewPanel>
      <Section title={`Miembros${list ? ` · ${list.length}/${CREW_MAX_MEMBERS}` : ""}`}>
        {!list ? <Lead>Cargando…</Lead> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map(m => (
              <li key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 6px 0 14px", borderRadius: 14, background: "var(--glass-well)" }}>
                <span style={{ font: "700 12px var(--font-mono)", color: "var(--ml-ink-3)", width: 34 }}>{memberNumber(m.number)}</span>
                <a href={`/${m.handle}`} style={{ flex: 1, minWidth: 0, font: "600 14px var(--font-sans)", color: "var(--ml-ink)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis" }}>@{m.handle}</a>
                {isFounder(m.number) && <span style={{ font: "700 10px var(--font-mono)", letterSpacing: ".08em", color: "var(--ml-ink-3)" }}>FUNDADOR</span>}
                {m.user_id === userId
                  ? <span style={{ font: "600 12px var(--font-sans)", color: "var(--ml-ink-3)", padding: "0 10px" }}>vos</span>
                  : <WellButton small danger onClick={async () => {
                      if (!window.confirm(`¿Sacar a @${m.handle} del crew?`)) return;
                      try { await crewApi.kick(crew.id, m.user_id); await load(); await onChanged(); } catch (e) { setNote(crewErrorText(e)); }
                    }}>Sacar</WellButton>}
              </li>
            ))}
          </ul>
        )}
        <Notice tone="bad">{note}</Notice>
      </Section>
    </CrewPanel>
  );
}

// ── Small parts ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 6 }}>
      <h2 style={{ margin: 0, font: "700 12px var(--font-mono)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ml-ink-3)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Emblem({ crew, size }: { crew: Pick<Crew, "emblem_url" | "color" | "name">; size: number }) {
  return crew.emblem_url
    ? <img src={crew.emblem_url} alt="" style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />
    : <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: crew.color, flex: "none", display: "grid", placeItems: "center", color: inkOn(crew.color), font: `800 ${Math.round(size * 0.42)}px var(--ml-display)` }}>{(crew.name || "?").trim().charAt(0).toUpperCase()}</span>;
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 8px", borderRadius: 16, background: "var(--glass-well)" }}>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ff4f94"} aria-label={label} onChange={e => onChange(e.target.value)}
        style={{ width: 30, height: 30, padding: 0, border: "none", borderRadius: 8, background: "transparent", cursor: "pointer" }} />
      <input value={text} aria-label={`${label} (hex)`} spellCheck={false} maxLength={7}
        onChange={e => { const t = e.target.value; setText(t); if (/^#[0-9a-f]{6}$/i.test(t)) onChange(t.toLowerCase()); }}
        style={{ flex: 1, minWidth: 0, height: 40, border: "none", outline: "none", background: "transparent", color: "var(--ml-ink)", font: "600 13px var(--font-mono)" }} />
    </span>
  );
}

function FilePick({ accept, url, kind, onChange }: { accept: string; url: string | null; kind: "image" | "audio"; onChange: (u: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {url && kind === "image" && <img src={url} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 12, background: "var(--glass-well)" }} />}
      {url && kind === "audio" && <audio src={url} controls preload="none" style={{ height: 36, maxWidth: "100%" }} />}
      <input ref={input} type="file" accept={accept} hidden onChange={async e => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setBusy(true);
        try { onChange((await uploadToStorage(f)).publicUrl); } catch { /* uploadToStorage already told the user */ }
        setBusy(false);
      }} />
      <WellButton small disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="upload" size={14} /> {busy ? "Subiendo…" : url ? "Cambiar" : "Subir"}
      </WellButton>
      {url && <WellButton small onClick={() => onChange("")}>Quitar</WellButton>}
    </div>
  );
}
