"use client";
/**
 * The crew's house (myland.lol/c/<slug>): the crew's emblem, name, motto,
 * founding date, member count, the owner's notice, its music and background,
 * and every member as the same simple mini-card (photo, name in its own font
 * and color, @, the card's background, member number, founder mark). A tap on
 * a mini-card opens that profile.
 */
import { useEffect, useRef, useState } from "react";
import { Icon, CrewShell, PrimaryButton, WellButton } from "./CrewShell";
import { miniCardOf, crewFontStyle, googleFontsHref, nameFontKey, foundedText, type MiniCard } from "./crewLook";
import { inkOn, isFounder, memberNumber, CREW_MAX_MEMBERS, type CrewHouse } from "./crewTypes";

export default function CrewHouseView({ house, joinedNumber, viewerIsMember, viewerIsOwner, onClose, onManage, newTabProfiles }: {
  house: CrewHouse;
  /** Open over the editor (Crews › Visitar): a close button, profiles open
   * in a new tab, "Editar crew" goes to the panel. */
  onClose?: () => void;
  onManage?: (crewId: string) => void;
  newTabProfiles?: boolean;
  /** Just joined through the pact: "Sos el miembro #n". */
  joinedNumber?: number | null;
  viewerIsMember: boolean;
  viewerIsOwner: boolean;
}) {
  const { crew, members } = house;
  const fontsHref = googleFontsHref([crew.font, ...members.map(m => nameFontKey(m.card))]);
  const accent = crew.color;
  const [welcome, setWelcome] = useState(joinedNumber ?? null);

  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(() => setWelcome(null), 6000);
    return () => clearTimeout(t);
  }, [welcome]);

  return (
    <CrewShell bg={crew.bg_color} bgImage={crew.bg_image} extraFontsHref={fontsHref} glow={false} align="start" onClose={onClose}>
      <header style={{ width: "min(960px,100%)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "8px 0 18px" }}>
        {crew.emblem_url
          ? <img src={crew.emblem_url} alt="" style={{ width: 112, height: 112, objectFit: "contain", filter: `drop-shadow(0 10px 30px ${accent}66)` }} />
          : <div aria-hidden style={{ width: 96, height: 96, borderRadius: 999, background: accent, boxShadow: `0 10px 40px ${accent}88`, display: "grid", placeItems: "center", color: inkOn(accent), font: "800 40px var(--ml-display)" }}>{crew.name.trim().charAt(0).toUpperCase()}</div>}
        <h1 style={{ margin: 0, fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: "clamp(34px,8vw,64px)", lineHeight: 0.95, letterSpacing: "-0.03em", color: accent, overflowWrap: "anywhere", textShadow: "0 2px 24px rgba(0,0,0,.45)" }}>
          {crew.name}
        </h1>
        {crew.motto && (
          <p style={{ margin: 0, maxWidth: 560, font: "600 16px/1.45 var(--font-sans)", color: "var(--ml-ink)", textShadow: "0 1px 12px rgba(0,0,0,.6)" }}>“{crew.motto}”</p>
        )}
        <div className="lg-glass" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 34, padding: "0 14px", borderRadius: 999, font: "600 12px var(--font-mono)", letterSpacing: ".04em", color: "var(--glass-ink-2)" }}>
          <span>{foundedText(crew.created_at)}</span>
          <span aria-hidden>·</span>
          <span>{members.length}/{CREW_MAX_MEMBERS} miembros</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
          {crew.music_url && <MusicButton url={crew.music_url} accent={accent} />}
          {crew.discord_url && (
            <WellButton href={crew.discord_url}>
              <DiscordGlyph /> Discord
            </WellButton>
          )}
          {viewerIsOwner && (onManage
            ? <WellButton onClick={() => onManage(crew.id)}><Icon name="pencil" size={15} /> Editar crew</WellButton>
            : <WellButton href={`/dashboard?crews=${crew.id}`}><Icon name="pencil" size={15} /> Editar crew</WellButton>)}
        </div>
      </header>

      {crew.notice && (
        <section className="lg-glass" aria-label="Aviso" style={{ width: "min(720px,100%)", padding: "16px 20px", borderRadius: 22, display: "flex", gap: 12, alignItems: "flex-start", boxSizing: "border-box", marginBottom: 22 }}>
          <span style={{ flex: "none", height: 24, padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: accent, color: inkOn(accent), font: "700 11px var(--font-mono)", letterSpacing: ".08em" }}>AVISO</span>
          <p style={{ margin: 0, font: "500 15px/1.5 var(--font-sans)", color: "var(--glass-ink)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{crew.notice}</p>
        </section>
      )}

      <ul aria-label="Miembros" style={{ listStyle: "none", margin: 0, padding: 0, width: "min(960px,100%)", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
        {members.map(m => (
          <li key={m.user_id} style={{ width: "min(180px,calc(50% - 7px))" }}>
            <MiniCardLink mini={miniCardOf(m.card, m.handle, m.display_name)} number={m.number} accent={accent} newTab={!!newTabProfiles} />
          </li>
        ))}
      </ul>

      {!viewerIsMember && (
        <p style={{ margin: "26px 0 0", font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)", textAlign: "center", textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
          Círculo cerrado: solo se entra con una invitación.
        </p>
      )}

      {welcome != null && (
        <div role="status" className="lg-glass" style={{ position: "fixed", left: "50%", bottom: 22, transform: "translateX(-50%)", zIndex: 6, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 999, font: "650 14px var(--font-sans)", color: "var(--glass-ink)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: accent }} />
          Ahora sos parte de {crew.name}. Sos el miembro {memberNumber(welcome)}.
        </div>
      )}
    </CrewShell>
  );
}

function MiniCardLink({ mini, number, accent, newTab }: { mini: MiniCard; number: number; accent: string; newTab?: boolean }) {
  const founder = isFounder(number);
  return (
    <a href={`/${mini.handle}`} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener" : undefined} className="crew-mini" aria-label={`${mini.name}, @${mini.handle}, miembro ${memberNumber(number)}${founder ? ", fundador" : ""}`}
      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px 14px", borderRadius: Math.min(26, mini.radius + 6), textDecoration: "none", overflow: "hidden", minHeight: 196, boxSizing: "border-box",
        background: mini.bg, boxShadow: "0 1px 2px rgba(0,0,0,.3),0 18px 40px -18px rgba(0,0,0,.65)" }}>
      {mini.bgImage && <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("${mini.bgImage}")`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.9 }} />}
      <span style={{ position: "absolute", top: 10, left: 10, height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(10,8,14,.55)", color: "#fff", font: "700 11px var(--font-mono)", letterSpacing: ".04em" }}>
        {memberNumber(number)}
      </span>
      {founder && (
        <span style={{ position: "absolute", top: 10, right: 10, height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: accent, color: inkOn(accent), font: "700 10px var(--font-mono)", letterSpacing: ".08em" }}>
          FUNDADOR
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
      <span style={{ position: "relative", font: "500 12px var(--font-mono)", color: mini.handleColor, opacity: 0.7, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        @{mini.handle}
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
