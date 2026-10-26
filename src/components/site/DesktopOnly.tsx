"use client";
/**
 * Phones only view profiles (2026-10-26): /login, /dashboard and /setup show
 * this instead. Not a screen of the Claude Design file: it reuses the Auth v4
 * look (title, glass panel, button and theme variables) on the .ml-site styles.
 */
import "./site.css";

const VARS = {
  "--ml-bg": "#0E0C12", "--ml-ink": "#F6F3F8", "--ml-ink-2": "rgba(238,232,244,.72)",
  "--ml-accent": "#FF4F94", "--ml-display": "'Unbounded',sans-serif",
} as React.CSSProperties;

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&display=swap";

export default function DesktopOnly({ handle }: { handle?: string }) {
  const button: React.CSSProperties = {
    display: "grid", placeItems: "center", height: 54, borderRadius: 999, textDecoration: "none",
    font: "750 16px var(--font-sans)",
  };
  return (
    <div className="ml-site">
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
      <div className="lg" data-editor-theme="dark" style={{ ...VARS, minHeight: "100dvh", background: "var(--ml-bg)", color: "var(--ml-ink)", fontFamily: "var(--font-sans)", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box" }}>
        <a href="/" className="lg-glass" style={{ position: "fixed", top: 14, left: 14, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px 0 10px", borderRadius: 999, color: "var(--glass-ink)", textDecoration: "none" }}>
          <img src="/landing/logo.png" alt="" style={{ width: 30, height: "auto", display: "block" }} />
          <span style={{ font: "800 20px/1 var(--font-display)", letterSpacing: "-0.055em" }}>myLand</span>
        </a>
        <main className="lg-glass" style={{ width: "min(440px,100%)", boxSizing: "border-box", padding: "34px 28px", borderRadius: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--ml-display)", fontWeight: 800, fontSize: "clamp(26px,7vw,34px)", lineHeight: 0.98, letterSpacing: "-0.045em", textTransform: "uppercase" }}>
            Abrí myLand en una compu
          </h1>
          <p style={{ margin: 0, font: "500 15px/1.5 var(--font-sans)", color: "var(--ml-ink-2)" }}>
            Para crear tu cuenta, entrar y armar tu sala necesitás una computadora. Desde el celular podés ver los perfiles.
          </p>
          {handle ? (
            <a href={`/${handle}`} style={{ ...button, marginTop: 6, background: "var(--ml-accent)", color: "#141118", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45),0 18px 40px -16px var(--ml-accent)" }}>
              Ver mi perfil
            </a>
          ) : null}
          <a href="/" style={{ ...button, marginTop: handle ? 0 : 6, background: "rgba(255,255,255,.08)", color: "var(--ml-ink)", boxShadow: "0 0 0 1px rgba(255,255,255,.10)" }}>
            Volver al inicio
          </a>
        </main>
      </div>
    </div>
  );
}
