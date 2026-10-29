"use client";
/**
 * Phones: the card is built on a computer (2026-10-26). These screens reuse
 * the Auth v4 look (title, glass panel, button and theme variables) on the
 * .ml-site styles. Not screens of the Claude Design file.
 *  - MobileClaimed (2026-10-27): /setup and /dashboard on a phone, once the
 *    name is claimed: "it's yours, now build the card on a computer".
 */
import "./site.css";

const VARS = {
  "--ml-bg": "#0E0C12", "--ml-ink": "#F6F3F8", "--ml-ink-2": "rgba(238,232,244,.72)",
  "--ml-accent": "#FF4F94", "--ml-display": "'Unbounded',sans-serif",
} as React.CSSProperties;

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&display=swap";

const button: React.CSSProperties = {
  display: "grid", placeItems: "center", height: 54, borderRadius: 999, textDecoration: "none",
  font: "750 16px var(--font-sans)",
};
const primary: React.CSSProperties = { ...button, background: "var(--ml-accent)", color: "#141118", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45),0 18px 40px -16px var(--ml-accent)" };
const secondary: React.CSSProperties = { ...button, background: "rgba(255,255,255,.08)", color: "var(--ml-ink)", boxShadow: "0 0 0 1px rgba(255,255,255,.10)" };

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ml-site">
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
      <div className="lg" data-editor-theme="dark" style={{ ...VARS, minHeight: "100dvh", background: "var(--ml-bg)", color: "var(--ml-ink)", fontFamily: "var(--font-sans)", display: "grid", gridTemplateColumns: "minmax(0,1fr)", placeItems: "center", padding: 20, boxSizing: "border-box" }}>
        <a href="/" className="lg-glass" style={{ position: "fixed", top: 14, left: 14, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px 0 10px", borderRadius: 999, color: "var(--glass-ink)", textDecoration: "none" }}>
          <img src="/landing/logo.png" alt="" style={{ width: 30, height: "auto", display: "block" }} />
          <span style={{ font: "800 20px/1 var(--font-display)", letterSpacing: "-0.055em" }}>myLand</span>
        </a>
        <main className="lg-glass" style={{ width: "min(440px,100%)", boxSizing: "border-box", padding: "34px 28px", borderRadius: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--ml-display)", fontWeight: 800, fontSize: "clamp(26px,7vw,34px)", lineHeight: 0.98, letterSpacing: "-0.045em", textTransform: "uppercase" }}>
            {title}
          </h1>
          {children}
        </main>
      </div>
    </div>
  );
}

export function MobileClaimed({ handle }: { handle: string }) {
  return (
    <Shell title="¡Es tuyo!">
      <p style={{ margin: 0, font: "800 clamp(20px,6vw,26px)/1.1 var(--font-sans)", letterSpacing: "-0.03em", overflowWrap: "anywhere" }}>
        myland.lol/<span style={{ color: "var(--ml-accent)" }}>{handle}</span>
      </p>
      <p style={{ margin: 0, font: "500 15px/1.5 var(--font-sans)", color: "var(--ml-ink-2)" }}>
        Ahora entrá a <b style={{ color: "var(--ml-ink)" }}>myland.lol</b> desde una compu para armar tu tarjeta y tu sala. Desde el celular solo se ven los perfiles.
      </p>
      <a href={`/${handle}`} style={{ ...primary, marginTop: 6 }}>Ver mi perfil</a>
      <a href="/crews" style={secondary}>Mis crews</a>
      <a href="/" style={secondary}>Volver al inicio</a>
    </Shell>
  );
}
