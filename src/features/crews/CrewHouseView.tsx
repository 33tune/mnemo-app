"use client";
/**
 * A crew's room (myland.lol/c/<slug>, and full screen over the editor).
 * Sala: emblem, name (primary font), description (secondary font), tag,
 * members and founding date, links, and the notices — 24 hours each, public
 * or members only; the founder and admins publish them here. Miembros: every
 * member with their card, by arrival or by role, with a search; the founder
 * and admins make admins, remove and block from here.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, CrewShell, PrimaryButton, WellButton } from "./CrewShell";
import { miniCardOf, crewFontStyle, googleFontsHref, nameFontKey, foundedText, type MiniCard } from "./crewLook";
import { crewApi, crewsChanged, inviteUrl } from "./crewApi";
import {
  CREW_LIMITS, crewErrorText, inkOn, isAdminRole, lineCount, memberNumber, normalizeUrl, timeAgo, URL_OK,
  type Crew, type CrewHouse, type CrewHouseMember, type CrewPost, type CrewRole,
} from "./crewTypes";

export default function CrewHouseView({ house, reload, joinedNumber, onClose, onEdit, editing, closeSide, padRight = 0, newTabProfiles, onLeft }: {
  house: CrewHouse;
  /** Fetch the house again (after a notice, a pin, a role change…). */
  reload?: () => void;
  /** Just joined through the invite: "Sos el miembro #n". */
  joinedNumber?: number | null;
  /** Over the editor: a close button; Editar opens the edit menu. */
  onClose?: () => void;
  onEdit?: () => void;
  /** The edit menu is open on the right. */
  editing?: boolean;
  closeSide?: "left" | "right";
  padRight?: number;
  newTabProfiles?: boolean;
  /** The viewer left the crew. */
  onLeft?: () => void;
}) {
  const { crew } = house;
  // Defensive: an older database answers without these.
  const members = house.members ?? [];
  const posts = house.posts ?? [];
  const me = house.me ?? null;
  const memberCount = house.member_count ?? members.length;
  const role: CrewRole | null = me?.role ?? null;
  const admin = isAdminRole(role);
  const fontsHref = googleFontsHref([crew.font, crew.body_font, ...members.map(m => nameFontKey(m.card))]);
  const accent = crew.color;
  const bodyFont = crew.body_font ? crewFontStyle(crew.body_font) : "var(--font-sans)";
  const [tab, setTab] = useState<"sala" | "miembros">("sala");
  const [welcome, setWelcome] = useState(joinedNumber ?? null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(() => setWelcome(null), 6000);
    return () => clearTimeout(t);
  }, [welcome]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const links = [
    ...(crew.discord_url ? [{ label: "Discord", url: crew.discord_url, discord: true }] : []),
    ...(crew.links ?? []).map(l => ({ ...l, discord: false })),
  ];

  return (
    <CrewShell bg={crew.bg_color} bgImage={crew.bg_image} extraFontsHref={fontsHref} glow={false} align="start"
      onClose={onClose} closeSide={closeSide} padRight={padRight}>
      {me && (
        <ActionBar crew={crew} role={role!} pinned={me.pinned} editing={!!editing} right={14 + padRight}
          onEdit={onEdit} reload={reload} onLeft={onLeft} say={setToast} />
      )}

      <header style={{ width: "min(960px,100%)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "8px 0 14px" }}>
        {crew.emblem_url
          ? <img src={crew.emblem_url} alt="" style={{ width: 112, height: 112, objectFit: "contain", filter: `drop-shadow(0 10px 30px ${accent}66)` }} />
          : <div aria-hidden style={{ width: 96, height: 96, borderRadius: 999, background: accent, boxShadow: `0 10px 40px ${accent}88`, display: "grid", placeItems: "center", color: inkOn(accent), fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: 40 }}>{crew.name.trim().charAt(0).toUpperCase()}</div>}
        <h1 style={{ margin: 0, fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: "clamp(34px,8vw,64px)", lineHeight: 0.95, letterSpacing: "-0.03em", color: accent, overflowWrap: "anywhere", textShadow: "0 2px 24px rgba(0,0,0,.45)" }}>
          {crew.name}
        </h1>
        {crew.motto && (
          <p style={{ margin: 0, maxWidth: 560, fontFamily: bodyFont, fontWeight: 500, fontSize: 16, lineHeight: 1.45, color: "var(--ml-ink)", textShadow: "0 1px 12px rgba(0,0,0,.6)", overflowWrap: "anywhere" }}>{crew.motto}</p>
        )}
        <div className="lg-glass" style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 34, padding: "0 14px", borderRadius: 999, font: "600 12px var(--font-mono)", letterSpacing: ".04em", color: "var(--glass-ink-2)", flexWrap: "wrap", justifyContent: "center" }}>
          {crew.tag && <TagPill tag={crew.tag} crew={crew} />}
          <span>{memberCount} {memberCount === 1 ? "miembro" : "miembros"}</span>
          <span aria-hidden>·</span>
          <span>{foundedText(crew.created_at)}</span>
        </div>
        {(links.length > 0 || crew.music_url) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
            {crew.music_url && <MusicButton url={crew.music_url} accent={accent} />}
            {links.map(l => (
              <a key={l.url + l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="crew-well"
                style={{ height: 40, padding: "0 16px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--glass-well)", color: "var(--glass-ink)", font: "600 14px var(--font-sans)", textDecoration: "none", maxWidth: 260 }}>
                {l.discord ? <DiscordGlyph /> : <Icon name="link" size={15} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
              </a>
            ))}
          </div>
        )}
      </header>

      <div role="tablist" aria-label="Secciones del crew" className="lg-tabs" style={{ width: "min(360px,100%)", marginBottom: 18 }}>
        <span className="lg-tabs__thumb" aria-hidden style={{ width: "calc(50% - 4px)", transform: tab === "miembros" ? "translateX(100%)" : "none" }} />
        <button type="button" role="tab" aria-selected={tab === "sala"} className="lg-tabs__btn" onClick={() => setTab("sala")}>Sala</button>
        <button type="button" role="tab" aria-selected={tab === "miembros"} className="lg-tabs__btn" onClick={() => setTab("miembros")}>Miembros · {memberCount}</button>
      </div>

      {tab === "sala" ? (
        <>
          <section aria-label="Avisos" style={{ width: "min(720px,100%)", display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
            {admin && <Composer crew={crew} count={posts.length} bodyFont={bodyFont} onPosted={() => { reload?.(); setToast("Aviso publicado."); }} />}
            {posts.map(p => <PostCard key={p.id} post={p} crew={crew} bodyFont={bodyFont} canDelete={admin} onDeleted={() => reload?.()} />)}
            {posts.length === 0 && (
              <p style={{ margin: 0, textAlign: "center", font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)", textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
                {me ? "No hay avisos de las últimas 24 horas." : "No hay avisos públicos ahora."}
              </p>
            )}
          </section>
          <MemberGrid members={members} crew={crew} newTab={!!newTabProfiles} />
          {memberCount > members.length && (
            <div style={{ marginTop: 16 }}><WellButton onClick={() => setTab("miembros")}>Ver los {memberCount} miembros</WellButton></div>
          )}
          {!me && (
            <p style={{ margin: "26px 0 0", font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)", textAlign: "center", textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
              Se entra con una invitación.
            </p>
          )}
        </>
      ) : (
        <MembersTab crew={crew} myRole={role} newTab={!!newTabProfiles} say={setToast} onChanged={() => reload?.()} />
      )}

      {(welcome != null || toast) && (
        <div role="status" className="lg-glass" style={{ position: "fixed", left: "50%", bottom: 22, transform: "translateX(-50%)", zIndex: 6, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 999, font: "650 14px var(--font-sans)", color: "var(--glass-ink)", maxWidth: "calc(100% - 32px)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: accent, flex: "none" }} />
          {toast || `Ahora sos parte de ${crew.name}. Sos el miembro ${memberNumber(welcome!)}.`}
        </div>
      )}
    </CrewShell>
  );
}

// ── Actions by role (top right) ────────────────────────────────────────────

function ActionBar({ crew, role, pinned, editing, right, onEdit, reload, onLeft, say }: {
  crew: Crew; role: CrewRole; pinned: boolean; editing: boolean; right: number;
  onEdit?: () => void; reload?: () => void; onLeft?: () => void; say: (s: string) => void;
}) {
  const admin = isAdminRole(role);
  const [invite, setInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const pin = async () => {
    setBusy(true);
    try { await crewApi.pin(crew.id, !pinned); crewsChanged(); reload?.(); say(pinned ? "Lo quitaste de tu barra." : "Fijado en tu barra."); }
    catch (e) { say(crewErrorText(e)); }
    setBusy(false);
  };
  const leave = async () => {
    if (!window.confirm(`¿Salir de ${crew.name}? Para volver vas a necesitar otra invitación.`)) return;
    try { await crewApi.leave(crew.id); crewsChanged(); onLeft?.(); }
    catch (e) { say(crewErrorText(e)); }
  };
  return (
    <div style={{ position: "fixed", top: 14, right, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, transition: "right .35s cubic-bezier(.2,.8,.2,1)", maxWidth: "calc(100vw - 150px)" }}>
      <div className="lg-glass" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {admin && <WellButton small onClick={() => setInvite(v => !v)}><Icon name="link" size={14} /> Invitación</WellButton>}
        {admin && !editing && (onEdit
          ? <WellButton small onClick={onEdit}><Icon name="pencil" size={14} /> Editar</WellButton>
          : <WellButton small href={`/dashboard?crews=${crew.id}&edit`}><Icon name="pencil" size={14} /> Editar</WellButton>)}
        <WellButton small disabled={busy} onClick={pin}><Icon name="star" size={14} /> {pinned ? "En tu barra" : "Fijar en tu barra"}</WellButton>
        {role !== "owner" && <WellButton small danger onClick={leave}>Salir</WellButton>}
      </div>
      {invite && admin && <InvitePanel crew={crew} say={say} />}
    </div>
  );
}

function InvitePanel({ crew, say }: { crew: Crew; say: (s: string) => void }) {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => { crewApi.inviteCode(crew.id).then(setCode).catch(e => say(crewErrorText(e))); }, [crew.id, say]);
  const link = code ? inviteUrl(crew.slug, code) : "";
  return (
    <div className="lg-glass" style={{ width: "min(380px,calc(100vw - 32px))", padding: 14, borderRadius: 22, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ font: "650 14px var(--font-sans)", color: "var(--glass-ink)" }}>Link de invitación</span>
      <input className="lg-input" readOnly value={link || "…"} aria-label="Link de invitación" onFocus={e => e.currentTarget.select()} style={{ font: "500 13px var(--font-mono)" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <PrimaryButton color={crew.color} disabled={!code} onClick={async () => {
          try { await navigator.clipboard.writeText(link); say("Link copiado."); } catch { say("Copialo desde el campo."); }
        }}><span style={{ color: inkOn(crew.color), fontSize: 14 }}>Copiar</span></PrimaryButton>
        <WellButton disabled={!code} onClick={async () => {
          if (!window.confirm("¿Renovar el link? El de ahora deja de servir.")) return;
          try { setCode(await crewApi.inviteCode(crew.id, true)); say("Link nuevo listo."); } catch (e) { say(crewErrorText(e)); }
        }}>Renovar</WellButton>
      </div>
      <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--glass-ink-3)" }}>Quien tenga el link puede entrar. Si se filtra, renovalo.</span>
    </div>
  );
}

// ── Notices ────────────────────────────────────────────────────────────────

function Composer({ crew, count, bodyFont, onPosted }: { crew: Crew; count: number; bodyFont: string; onPosted: () => void }) {
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [isPublic, setPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = normalizeUrl(link);
  const lines = lineCount(body);
  const full = count >= CREW_LIMITS.posts;
  const ok = !!body.trim() && body.length <= CREW_LIMITS.post && lines <= CREW_LIMITS.postLines && (!url || URL_OK(url)) && !busy && !full;
  async function publish() {
    if (!ok) return;
    setBusy(true); setError("");
    try { await crewApi.post(crew.id, body.trim(), url || null, isPublic); setBody(""); setLink(""); onPosted(); }
    catch (e) { setError(crewErrorText(e)); }
    setBusy(false);
  }
  return (
    <div className="lg-glass" style={{ padding: 14, borderRadius: 22, display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea className="lg-input" rows={3} value={body} placeholder="Nuevo aviso (dura 24 horas)" aria-label="Nuevo aviso"
        maxLength={CREW_LIMITS.post}
        onChange={e => { const v = e.target.value; if (lineCount(v) <= CREW_LIMITS.postLines) setBody(v); setError(""); }}
        style={{ fontFamily: bodyFont }} />
      <input className="lg-input" value={link} placeholder="Link (opcional)" aria-label="Link del aviso" onChange={e => { setLink(e.target.value); setError(""); }} style={{ font: "500 14px var(--font-mono)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" role="switch" aria-checked={isPublic} aria-label="Público" className="lg-switch" onClick={() => setPublic(v => !v)} />
        <span style={{ font: "600 13px var(--font-sans)", color: "var(--glass-ink-2)", flex: 1, minWidth: 140 }}>
          {isPublic ? "Público: lo ve cualquiera" : "Solo miembros"}
        </span>
        <span style={{ font: "500 12px var(--font-mono)", color: "var(--glass-ink-3)" }}>{body.length}/{CREW_LIMITS.post} · {lines}/{CREW_LIMITS.postLines} renglones</span>
        <PrimaryButton color={crew.color} disabled={!ok} onClick={publish}>
          <span style={{ color: inkOn(crew.color), fontSize: 15 }}>{busy ? "…" : "Publicar"}</span>
        </PrimaryButton>
      </div>
      {link && url && !URL_OK(url) && <span style={{ font: "600 12px var(--font-sans)", color: "var(--ml-bad)" }}>Ese link no es válido.</span>}
      {full && <span style={{ font: "600 12px var(--font-sans)", color: "var(--glass-ink-3)" }}>Hay {CREW_LIMITS.posts} avisos activos, el máximo. Borrá uno o esperá a que venza.</span>}
      {error && <span role="alert" style={{ font: "600 12px var(--font-sans)", color: "var(--ml-bad)" }}>{error}</span>}
    </div>
  );
}

function PostCard({ post, crew, bodyFont, canDelete, onDeleted }: { post: CrewPost; crew: Crew; bodyFont: string; canDelete: boolean; onDeleted: () => void }) {
  return (
    <article className="lg-glass" style={{ position: "relative", padding: "14px 16px", borderRadius: 22, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", font: "600 12px var(--font-mono)", color: "var(--glass-ink-3)", paddingRight: canDelete ? 32 : 0 }}>
        <span style={{ height: 22, padding: "0 9px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: crew.color, color: inkOn(crew.color), font: "700 10px var(--font-mono)", letterSpacing: ".08em" }}>AVISO</span>
        <span>{timeAgo(post.created_at)}</span>
        {post.author && <span>· @{post.author}</span>}
        <span>· {post.is_public ? "Público" : "Solo miembros"}</span>
      </div>
      <p style={{ margin: 0, fontFamily: bodyFont, fontSize: 16, lineHeight: 1.5, fontWeight: 500, color: "var(--glass-ink)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{post.body}</p>
      {post.link && (
        <a href={post.link} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start", maxWidth: "100%", display: "inline-flex", alignItems: "center", gap: 6, font: "600 13px var(--font-sans)", color: crew.color, textDecoration: "none", overflow: "hidden" }}>
          <Icon name="link" size={14} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.link.replace(/^https:\/\//, "")}</span>
        </a>
      )}
      {canDelete && (
        <button type="button" className="lg-btn" aria-label="Borrar aviso" title="Borrar" onClick={async () => {
          if (!window.confirm("¿Borrar este aviso?")) return;
          try { await crewApi.deletePost(post.id); onDeleted(); } catch { /* the list refreshes anyway */ }
        }} style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, color: "var(--glass-ink-2)" }}>
          <Icon name="close" size={14} />
        </button>
      )}
    </article>
  );
}

// ── Members ────────────────────────────────────────────────────────────────

function MemberGrid({ members, crew, newTab, admin }: {
  members: CrewHouseMember[]; crew: Crew; newTab: boolean;
  admin?: (m: CrewHouseMember) => ReactNode;
}) {
  return (
    <ul aria-label="Miembros" style={{ listStyle: "none", margin: 0, padding: 0, width: "min(960px,100%)", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
      {members.map(m => (
        <li key={m.user_id} style={{ position: "relative", width: "min(180px,calc(50% - 7px))" }}>
          <MiniCardLink mini={miniCardOf(m.card, m.handle, m.display_name)} member={m} crew={crew} newTab={newTab} />
          {admin?.(m)}
        </li>
      ))}
    </ul>
  );
}

function MembersTab({ crew, myRole, newTab, say, onChanged }: {
  crew: Crew; myRole: CrewRole | null; newTab: boolean; say: (s: string) => void; onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"joined" | "role">("joined");
  const [list, setList] = useState<CrewHouseMember[] | null>(null);
  const [more, setMore] = useState(false);
  const seq = useRef(0);
  const admin = isAdminRole(myRole);

  const load = useCallback(async (offset: number) => {
    const my = ++seq.current;
    try {
      const page = await crewApi.membersPage(crew.slug, q, order, offset);
      if (my !== seq.current) return;
      setList(prev => (offset === 0 ? page : [...(prev ?? []), ...page]));
      setMore(page.length === 30);
    } catch (e) { if (my === seq.current) { setList(l => l ?? []); say(crewErrorText(e)); } }
  }, [crew.slug, q, order, say]);
  useEffect(() => { const t = setTimeout(() => void load(0), q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const canModerate = (m: CrewHouseMember) =>
    myRole === "owner" ? m.role !== "owner" : myRole === "admin" ? m.role === "member" : false;
  const act = async (fn: () => Promise<void>, done: string) => {
    try { await fn(); say(done); await load(0); onChanged(); } catch (e) { say(crewErrorText(e)); }
  };

  return (
    <section aria-label="Miembros" style={{ width: "min(960px,100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ width: "min(560px,100%)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="lg-input" value={q} placeholder="Buscar por nombre o @usuario" aria-label="Buscar miembros" onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <div role="radiogroup" aria-label="Orden" className="lg-tabs" style={{ width: 210 }}>
          <span className="lg-tabs__thumb" aria-hidden style={{ width: "calc(50% - 4px)", transform: order === "role" ? "translateX(100%)" : "none" }} />
          <button type="button" role="radio" aria-checked={order === "joined"} aria-selected={order === "joined"} className="lg-tabs__btn" onClick={() => setOrder("joined")}>Llegada</button>
          <button type="button" role="radio" aria-checked={order === "role"} aria-selected={order === "role"} className="lg-tabs__btn" onClick={() => setOrder("role")}>Rol</button>
        </div>
      </div>
      {list === null ? null : list.length === 0 ? (
        <p style={{ margin: 0, font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)" }}>{q ? `Nadie con “${q.trim()}”.` : "Todavía no hay miembros."}</p>
      ) : (
        <MemberGrid members={list} crew={crew} newTab={newTab} admin={admin ? m => canModerate(m) && (
          <MemberMenu member={m} isOwner={myRole === "owner"}
            onRole={r => act(() => crewApi.setRole(crew.id, m.user_id, r), r === "admin" ? `@${m.handle} ahora es admin.` : `@${m.handle} ya no es admin.`)}
            onKick={() => { if (window.confirm(`¿Sacar a @${m.handle}? Puede volver con el link.`)) void act(() => crewApi.kick(crew.id, m.user_id), `Sacaste a @${m.handle}.`); }}
            onBan={() => { if (window.confirm(`¿Bloquear a @${m.handle}? No va a poder volver a entrar.`)) void act(() => crewApi.ban(crew.id, m.user_id), `Bloqueaste a @${m.handle}.`); }} />
        ) : undefined} />
      )}
      {more && <WellButton onClick={() => void load(list?.length ?? 0)}>Ver más</WellButton>}
      {admin && <BansBox crew={crew} say={say} />}
    </section>
  );
}

function MemberMenu({ member, isOwner, onRole, onKick, onBan }: {
  member: CrewHouseMember; isOwner: boolean; onRole: (r: "admin" | "member") => void; onKick: () => void; onBan: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const item: CSSProperties = { display: "flex", alignItems: "center", gap: 8, width: "100%", height: 38, padding: "0 12px", border: "none", borderRadius: 12, background: "transparent", color: "var(--glass-ink)", font: "600 13px var(--font-sans)", cursor: "pointer", textAlign: "left" };
  return (
    <div ref={ref} style={{ position: "absolute", top: 40, right: 8, zIndex: 3 }}>
      <button type="button" className="lg-btn lg-glass" aria-label={`Opciones de @${member.handle}`} aria-expanded={open} onClick={() => setOpen(v => !v)}
        style={{ width: 30, height: 30, color: "var(--glass-ink)" }}>
        <Icon name="more" size={15} />
      </button>
      {open && (
        <div role="menu" className="lg-glass" style={{ position: "absolute", right: 0, top: 36, width: 190, padding: 6, borderRadius: 16, display: "flex", flexDirection: "column" }}>
          {isOwner && (member.role === "admin"
            ? <button type="button" role="menuitem" style={item} onClick={() => { setOpen(false); onRole("member"); }}>Quitar admin</button>
            : <button type="button" role="menuitem" style={item} onClick={() => { setOpen(false); onRole("admin"); }}>Hacer admin</button>)}
          <button type="button" role="menuitem" style={item} onClick={() => { setOpen(false); onKick(); }}>Sacar del crew</button>
          <button type="button" role="menuitem" style={{ ...item, color: "var(--glass-danger)" }} onClick={() => { setOpen(false); onBan(); }}>Bloquear</button>
        </div>
      )}
    </div>
  );
}

function BansBox({ crew, say }: { crew: Crew; say: (s: string) => void }) {
  const [list, setList] = useState<{ user_id: string; handle: string | null; display_name: string | null }[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => crewApi.bans(crew.id).then(setList).catch(() => setList([])), [crew.id]);
  useEffect(() => { if (open) void load(); }, [open, load]);
  return (
    <div style={{ width: "min(560px,100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 10 }}>
      <WellButton small onClick={() => setOpen(v => !v)}>{open ? "Ocultar bloqueados" : "Ver bloqueados"}</WellButton>
      {open && list && (list.length === 0
        ? <span style={{ font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)" }}>No bloqueaste a nadie.</span>
        : list.map(b => (
          <div key={b.user_id} className="lg-glass" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 14px", borderRadius: 16 }}>
            <span style={{ flex: 1, minWidth: 0, font: "600 14px var(--font-sans)", color: "var(--glass-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.display_name || b.handle || "Cuenta borrada"} {b.handle && <span style={{ font: "500 12px var(--font-mono)", color: "var(--glass-ink-3)" }}>@{b.handle}</span>}</span>
            <WellButton small onClick={async () => { try { await crewApi.unban(crew.id, b.user_id); say("Desbloqueado: puede volver con el link."); void load(); } catch (e) { say(crewErrorText(e)); } }}>Desbloquear</WellButton>
          </div>
        )))}
    </div>
  );
}

export function TagPill({ tag, crew, size = 11 }: { tag: string; crew: Pick<Crew, "color" | "font">; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: size + 11, padding: `0 ${Math.round(size * 0.7)}px`, borderRadius: 6, background: crew.color, color: inkOn(crew.color), fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: size, letterSpacing: ".04em", lineHeight: 1 }}>
      {tag}
    </span>
  );
}

function MiniCardLink({ mini, member, crew, newTab }: { mini: MiniCard; member: CrewHouseMember; crew: Crew; newTab?: boolean }) {
  const badge = member.role === "owner" ? "FUNDADOR" : member.role === "admin" ? "ADMIN" : null;
  return (
    <a href={`/${mini.handle}`} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener" : undefined} className="crew-mini"
      aria-label={`${mini.name}, @${mini.handle}, miembro ${memberNumber(member.number)}${badge ? `, ${badge.toLowerCase()}` : ""}`}
      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px 14px", borderRadius: Math.min(26, mini.radius + 6), textDecoration: "none", overflow: "hidden", minHeight: 196, boxSizing: "border-box",
        background: mini.bg, boxShadow: "0 1px 2px rgba(0,0,0,.3),0 18px 40px -18px rgba(0,0,0,.65)" }}>
      {mini.bgImage && <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("${mini.bgImage}")`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.9 }} />}
      <span style={{ position: "absolute", top: 10, left: 10, height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(10,8,14,.55)", color: "#fff", font: "700 11px var(--font-mono)", letterSpacing: ".04em" }}>
        {memberNumber(member.number)}
      </span>
      {badge && (
        <span style={{ position: "absolute", top: 10, right: 10, height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: badge === "FUNDADOR" ? crew.color : "rgba(10,8,14,.55)", color: badge === "FUNDADOR" ? inkOn(crew.color) : "#fff", font: "700 10px var(--font-mono)", letterSpacing: ".08em" }}>
          {badge}
        </span>
      )}
      <span style={{ position: "relative", width: 78, height: 78, marginTop: 14, borderRadius: mini.pfpRadius, overflow: "hidden", background: "rgba(255,255,255,.12)", flex: "none", display: "grid", placeItems: "center" }}>
        {mini.photo
          ? <img src={mini.photo} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <Icon name="user" size={30} style={{ color: mini.textColor, opacity: 0.6 }} />}
      </span>
      <span style={{ position: "relative", maxWidth: "100%", fontFamily: mini.nameFont, fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: mini.nameColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
        {mini.name}
      </span>
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
        <span style={{ font: "500 12px var(--font-mono)", color: mini.handleColor, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{mini.handle}</span>
        {crew.tag && <TagPill tag={crew.tag} crew={crew} size={9} />}
      </span>
    </a>
  );
}

/** The crew's song: browsers only play sound after a tap, so it's a button. */
function MusicButton({ url, accent }: { url: string; accent: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const on = () => setPlaying(true), off = () => setPlaying(false);
    a.addEventListener("play", on); a.addEventListener("pause", off); a.addEventListener("ended", off);
    return () => { a.removeEventListener("play", on); a.removeEventListener("pause", off); a.removeEventListener("ended", off); };
  }, []);
  return (
    <>
      <audio ref={ref} src={url} loop preload="none" />
      <PrimaryButton color={accent} onClick={() => { const a = ref.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause(); }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: inkOn(accent) }}>
          <Icon name={playing ? "pause" : "play"} size={16} /> {playing ? "Pausar" : "Escuchar"}
        </span>
      </PrimaryButton>
    </>
  );
}

function DiscordGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.2.5a18 18 0 0 1 4.3 1.9 16.7 16.7 0 0 0-15 0 18 18 0 0 1 4.3-1.9L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9 .1 13.5.3 18a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 11.8 0l.5.4a12.8 12.8 0 0 1-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.4-5.2-.7-9.6-3.4-13.6ZM8.5 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm7 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z" />
    </svg>
  );
}
