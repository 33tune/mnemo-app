"use client";
/**
 * The invite: what the invite link opens. A dark screen with the crew's
 * emblem, name and motto (its music, after a tap) and one button: UNIRME.
 * Without an account, the button creates one and comes back here.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CrewShell, PrimaryButton, Notice, WellButton } from "./CrewShell";
import { crewApi, PENDING_PACT_KEY } from "./crewApi";
import { crewFontStyle, googleFontsHref } from "./crewLook";
import { crewErrorText, inkOn, memberNumber, type Crew } from "./crewTypes";

export type PactViewer = "guest" | "needs-name" | "ready";

export default function CrewPactView({ crew, code, valid, members, mine, banned, viewer }: {
  crew: Crew;
  /** The viewer was blocked from this crew. */
  banned?: boolean;
  code: string;
  valid: boolean;
  members: number;
  /** The viewer's number when they are already in. */
  mine: number | null;
  viewer: PactViewer;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const accent = crew.color;
  const here = `/c/${crew.slug}/unirme?k=${encodeURIComponent(code)}`;

  // The crew's song starts with the first tap anywhere (browsers need one).
  useEffect(() => {
    if (!crew.music_url) return;
    const play = () => { audio.current?.play().catch(() => {}); };
    document.addEventListener("pointerdown", play, { once: true });
    return () => document.removeEventListener("pointerdown", play);
  }, [crew.music_url]);

  async function join() {
    if (viewer !== "ready") {
      try { localStorage.setItem(PENDING_PACT_KEY, here); } catch { /* ignore */ }
      router.push(viewer === "guest" ? `/login?mode=register&next=${encodeURIComponent(here)}` : "/setup");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const n = await crewApi.join(crew.slug, code);
      try { localStorage.removeItem(PENDING_PACT_KEY); } catch { /* ignore */ }
      router.push(`/c/${crew.slug}?nuevo=${n}`);
      router.refresh();
    } catch (e) {
      setBusy(false);
      setError(crewErrorText(e));
    }
  }

  return (
    <CrewShell bg="#07060A" bgImage={crew.bg_image} extraFontsHref={googleFontsHref([crew.font, crew.body_font])} glow={false}>
      {crew.music_url && <audio ref={audio} src={crew.music_url} loop preload="none" />}
      {crew.bg_image && <div aria-hidden style={{ position: "fixed", inset: 0, background: "rgba(5,4,8,.72)" }} />}
      <div aria-hidden style={{ position: "fixed", left: "50%", top: "42%", width: "min(620px,120vw)", height: "min(620px,120vw)", transform: "translate(-50%,-50%)", borderRadius: "50%", background: `radial-gradient(closest-side, ${accent}40, transparent)`, filter: "blur(30px)", pointerEvents: "none" }} />
      <main style={{ position: "relative", width: "min(520px,100%)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
        <span style={{ font: "600 11px var(--font-mono)", letterSpacing: ".22em", color: "var(--ml-ink-3)" }}>INVITACIÓN</span>
        {crew.emblem_url
          ? <img src={crew.emblem_url} alt="" className="crew-pact-emblem" style={{ width: 140, height: 140, objectFit: "contain", filter: `drop-shadow(0 12px 40px ${accent}88)` }} />
          : <div aria-hidden className="crew-pact-emblem" style={{ width: 110, height: 110, borderRadius: 999, background: accent, boxShadow: `0 12px 50px ${accent}99`, display: "grid", placeItems: "center", color: inkOn(accent), font: "800 46px var(--ml-display)" }}>{crew.name.trim().charAt(0).toUpperCase()}</div>}
        <h1 style={{ margin: 0, fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: "clamp(36px,9vw,60px)", lineHeight: 0.95, letterSpacing: "-0.03em", color: accent, overflowWrap: "anywhere" }}>{crew.name}</h1>
        {crew.motto && <p style={{ margin: 0, fontFamily: crew.body_font ? crewFontStyle(crew.body_font) : "var(--font-sans)", fontWeight: 600, fontSize: 17, lineHeight: 1.5, color: "var(--ml-ink)" }}>{crew.motto}</p>}
        <p style={{ margin: 0, font: "500 13px var(--font-mono)", color: "var(--ml-ink-3)" }}>{members} {members === 1 ? "miembro" : "miembros"}</p>

        {mine != null ? (
          <>
            <Notice tone="ok">Ya sos parte de este crew: sos el miembro {memberNumber(mine)}.</Notice>
            <WellButton href={`/c/${crew.slug}`}>Ir a la sala</WellButton>
          </>
        ) : !valid ? (
          <>
            <Notice tone="bad">Este link de invitación ya no sirve. Pedile uno nuevo a quien te invitó.</Notice>
            <WellButton href={`/c/${crew.slug}`}>Ver la sala</WellButton>
          </>
        ) : banned ? (
          <>
            <Notice tone="bad">No podés entrar a este crew.</Notice>
            <WellButton href={`/c/${crew.slug}`}>Ver la sala</WellButton>
          </>
        ) : (
          <>
            <div style={{ marginTop: 8, width: "min(320px,100%)", display: "flex", flexDirection: "column" }}>
              <PrimaryButton color={accent} disabled={busy} onClick={join}>
                <span style={{ color: inkOn(accent), letterSpacing: ".18em", fontWeight: 800 }}>{busy ? "…" : "UNIRME"}</span>
              </PrimaryButton>
            </div>
            {viewer === "guest" && <p style={{ margin: 0, font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)" }}>Primero creás tu cuenta y volvés acá.</p>}
            {viewer === "needs-name" && <p style={{ margin: 0, font: "500 13px var(--font-sans)", color: "var(--ml-ink-3)" }}>Primero elegí tu nombre en myLand y volvés acá.</p>}
            <Notice tone="bad">{error}</Notice>
          </>
        )}
      </main>
      <style>{`@keyframes crew-pact-in{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}.ml-site .crew-pact-emblem{animation:crew-pact-in .9s cubic-bezier(.16,1,.3,1) backwards}@media (prefers-reduced-motion: reduce){.ml-site .crew-pact-emblem{animation:none}}`}</style>
    </CrewShell>
  );
}
