"use client";
/**
 * Editing a crew (founder and admins): the menu that opens over the
 * crew's own room (CrewHouseOverlay), so every change is seen right away.
 * Built with the editor's parts, so it follows the editor's theme. Each change
 * shows at once (onDraft) and is saved a moment later.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { InspectorShell, Accordion, MenuSection, MenuNote, TextInput, TextArea, ColorRow, FontField, UploadField, ActionButton, Icon } from "@/ui";
import { uploadToStorage } from "@/lib/storage";
import { crewApi } from "./crewApi";
import { CREW_FONTS, crewFontStyle } from "./crewLook";
import { CREW_LIMITS, CREW_TAG_RE, DISCORD_RE, URL_OK, cleanTag, crewErrorText, normalizeDiscord, normalizeUrl, type Crew, type CrewLink, type CrewPatch } from "./crewTypes";
import { crewsChanged } from "./crewApi";

const FONT_OPTIONS = CREW_FONTS.map(f => ({ key: f, label: f, style: crewFontStyle(f) }));
/** The secondary font can stay the site's own. */
const BODY_DEFAULT = "__site";
const BODY_FONT_OPTIONS = [{ key: BODY_DEFAULT, label: "La de myLand", style: "var(--font-sans), sans-serif" }, ...FONT_OPTIONS];
export const CREW_EDIT_PANEL_W = 344;

export function CrewEditPanel({ crew, isOwner, onDraft, onDone, onSaved, onGone, sheet }: {
  crew: Crew;
  /** Only the founder deletes the crew. */
  isOwner: boolean;
  /** Every change, at once — the room behind redraws with it. */
  onDraft: (crew: Crew) => void;
  onDone: () => void;
  onSaved?: () => void;
  onGone: () => void;
  sheet?: boolean;
}) {
  const [draft, setDraft] = useState<Crew>(crew);
  const [section, setSection] = useState<string | null>("Identidad");
  const [status, setStatus] = useState<{ tone: "hint" | "warn"; text: string } | null>(null);
  const [tagInput, setTagInput] = useState(crew.tag ?? "");
  // Links being typed (saved once each one is complete and valid).
  const [links, setLinks] = useState<CrewLink[]>(crew.links ?? []);
  const pending = useRef<CrewPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    try { await crewApi.update(crew.id, patch); setStatus({ tone: "hint", text: "Guardado." }); onSaved?.(); crewsChanged(); }
    catch (e) { setStatus({ tone: "warn", text: crewErrorText(e) }); }
  }, [crew.id, onSaved]);
  useEffect(() => () => { void flush(); }, [flush]);
  useEffect(() => { onDraft(draft); }, [draft, onDraft]);

  /** Text fields save a moment after you stop typing; the rest right away. */
  const set = <K extends keyof CrewPatch>(k: K, v: CrewPatch[K], wait = 0) => {
    setDraft(d => ({ ...d, [k]: v }));
    setStatus(null);
    pending.current = { ...pending.current, [k]: v };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), wait);
  };
  const upload = (k: "emblem_url" | "bg_image" | "music_url") => async (f: File) => {
    setStatus({ tone: "hint", text: "Subiendo…" });
    try { set(k, (await uploadToStorage(f)).publicUrl); } catch { setStatus({ tone: "warn", text: "No se pudo subir el archivo." }); }
  };
  const hex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
  const discord = normalizeDiscord(draft.discord_url ?? "");
  const discordBad = !!discord && !DISCORD_RE.test(discord);
  const done = async () => { await flush(); onDone(); };
  const saveLinks = (next: CrewLink[]) => {
    setLinks(next);
    const ok = next.map(l => ({ label: l.label.trim(), url: normalizeUrl(l.url) })).filter(l => l.label && URL_OK(l.url));
    set("links", ok, 700);
  };
  const tagBad = !!tagInput && !CREW_TAG_RE.test(tagInput);

  return (
    <InspectorShell
      id="mnemo-crew-edit"
      title={`Editar ${draft.name || "crew"}`}
      icon="pencil"
      path={`crews / ${crew.slug}`}
      onClose={done}
      top={16}
      width={CREW_EDIT_PANEL_W}
      mode={sheet ? "sheet" : "dock"}
      height={sheet ? Math.round(window.innerHeight * 0.55) : 0}
      collapsed={false}
      onExpand={() => {}}
      footer={<ActionButton variant="primary" fullWidth onClick={done}><Icon name="check" size={15} />Listo</ActionButton>}
    >
      <div data-crew-editor="" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <MenuNote>{status ? status.text : "Los cambios se ven en la sala y se guardan solos."}</MenuNote>
        <Accordion open={section} onOpenChange={setSection}>
          <MenuSection label="Identidad" icon="sparkles" swatch={draft.color} summary={draft.tag ? `Tag ${draft.tag}` : "Sin tag"}>
            <TextInput label="Nombre" placeholder="Nombre del crew" value={draft.name} maxLength={CREW_LIMITS.name} onChange={v => { if (v.trim()) set("name", v, 700); else setDraft(d => ({ ...d, name: v })); }} />
            <TextInput label="Descripción" placeholder="Descripción" value={draft.motto} maxLength={CREW_LIMITS.motto} onChange={v => set("motto", v, 700)} />
            <TextInput label="Tag" placeholder="Tag (2 a 4 letras o números)" value={tagInput} mono maxLength={4}
              onChange={v => { const t = cleanTag(v); setTagInput(t); if (!t || CREW_TAG_RE.test(t)) set("tag", t || null, 500); }} />
            <MenuNote tone={tagBad ? "warn" : "hint"}>{tagBad ? "El tag va de 2 a 4 letras o números." : "Los miembros pueden mostrarlo en su card. Es único en myLand."}</MenuNote>
            <UploadField kind="logo" value={draft.emblem_url} label="Emblema" caption="Emblema" accept="image/*"
              onFile={upload("emblem_url")} onRemove={() => set("emblem_url", "")} />
            <ColorRow label="Color" value={draft.color} onChange={v => { if (hex(v)) set("color", v.toLowerCase()); }} />
            <MenuNote>El link sigue siendo myland.lol/c/{crew.slug}, así no se rompen las invitaciones.</MenuNote>
          </MenuSection>

          <MenuSection label="Fuentes" icon="text" summary={`${draft.font} · ${draft.body_font ?? "La de myLand"}`}>
            <FontField label="Principal (títulos)" value={draft.font} fonts={FONT_OPTIONS} sample={draft.name || "Crew"} onChange={v => set("font", v)} />
            <FontField label="Secundaria (descripción y avisos)" value={draft.body_font ?? BODY_DEFAULT} fonts={BODY_FONT_OPTIONS} sample="Reunión a las 3 PM"
              onChange={v => set("body_font", v === BODY_DEFAULT ? null : v)} />
          </MenuSection>

          <MenuSection label="Sala" icon="room" swatch={draft.bg_color} summary={draft.bg_image ? "Con imagen" : "Color"}>
            <ColorRow label="Fondo" value={draft.bg_color} onChange={v => { if (hex(v)) set("bg_color", v.toLowerCase()); }} />
            <UploadField kind="cover" value={draft.bg_image} label="Imagen o GIF de fondo" caption="Fondo" accept="image/*"
              onFile={upload("bg_image")} onRemove={() => set("bg_image", "")} />
            <MenuNote>Como el fondo de tu sala: a su tamaño, repetido.</MenuNote>
            <UploadField kind="audio" value={draft.music_url} label="Música" caption="MP3" accept=".mp3,audio/mpeg"
              onFile={upload("music_url")} onRemove={() => set("music_url", "")} />
          </MenuSection>

          <MenuSection label="Links" icon="link" summary={`${(draft.discord_url ? 1 : 0) + (draft.links?.length ?? 0)} links`}>
            <TextInput label="Discord" value={draft.discord_url ?? ""} mono placeholder="Discord (discord.gg/…)" onChange={v => {
              setDraft(d => ({ ...d, discord_url: v }));
              const n = normalizeDiscord(v);
              if (!n || DISCORD_RE.test(n)) set("discord_url", n, 700);
            }} />
            {discordBad && <MenuNote tone="warn">Usá un link de invitación (discord.gg/…).</MenuNote>}
            {links.map((l, i) => {
              const bad = !!l.url && !URL_OK(normalizeUrl(l.url));
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TextInput label={`Nombre del link ${i + 1}`} placeholder="Nombre (YouTube, Twitch…)" value={l.label} maxLength={CREW_LIMITS.linkLabel}
                        onChange={v => saveLinks(links.map((x, k) => (k === i ? { ...x, label: v } : x)))} />
                    </div>
                    <ActionButton variant="ghost" onClick={() => saveLinks(links.filter((_, k) => k !== i))}><Icon name="trash" size={15} /></ActionButton>
                  </div>
                  <TextInput label={`Link ${i + 1}`} placeholder="https://…" value={l.url} mono onChange={v => saveLinks(links.map((x, k) => (k === i ? { ...x, url: v } : x)))} />
                  {bad && <MenuNote tone="warn">Ese link no es válido.</MenuNote>}
                </div>
              );
            })}
            {links.length < CREW_LIMITS.links && (
              <ActionButton variant="secondary" fullWidth onClick={() => setLinks([...links, { label: "", url: "" }])}><Icon name="plus" size={15} />Agregar link</ActionButton>
            )}
          </MenuSection>
        </Accordion>

        {isOwner && <ActionButton variant="danger" fullWidth onClick={async () => {
          if (!window.confirm(`¿Borrar ${crew.name} para siempre? Todos dejan de ser miembros.`)) return;
          try { pending.current = {}; await crewApi.remove(crew.id); crewsChanged(); onGone(); } catch (e) { window.alert(crewErrorText(e)); }
        }}><Icon name="trash" size={15} />Borrar crew</ActionButton>}
      </div>
    </InspectorShell>
  );
}
