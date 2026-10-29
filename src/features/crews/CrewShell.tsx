"use client";
/**
 * The crews pages' frame: the same look as /setup and Auth v4 (the .ml-site
 * styles, the glass panels, the myLand pill, the accent button). The house can
 * paint its own background and color over it.
 */
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Icon as DsIcon } from "@/components/site/ds";
import "@/components/site/site.css";

/** The design system's icon (ds.tsx is untyped). */
export const Icon = DsIcon as unknown as (p: { name: string; size?: number; style?: CSSProperties; title?: string }) => ReactElement;

export const ML_VARS = {
  "--ml-bg": "#0E0C12", "--ml-ink": "#F6F3F8", "--ml-ink-2": "rgba(238,232,244,.72)", "--ml-ink-3": "rgba(238,232,244,.5)",
  "--ml-accent": "#FF4F94", "--ml-ok": "#5BE49B", "--ml-bad": "#FF5F57", "--ml-display": "'Unbounded',sans-serif",
} as CSSProperties;

const SITE_FONTS_HREF = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&display=swap";

export function CrewShell({ children, bg, bgImage, extraFontsHref, glow = true, align = "center" }: {
  children: ReactNode;
  bg?: string;
  bgImage?: string | null;
  extraFontsHref?: string | null;
  glow?: boolean;
  align?: "center" | "start";
}) {
  return (
    <div className="ml-site">
      <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
      {extraFontsHref && <link rel="stylesheet" href={extraFontsHref} precedence="default" />}
      <style>{CREW_CSS}</style>
      <div className="lg" data-editor-theme="dark" style={{
        ...ML_VARS, minHeight: "100dvh", background: bg ?? "var(--ml-bg)", color: "var(--ml-ink)", fontFamily: "var(--font-sans)",
        display: "grid", gridTemplateColumns: "minmax(0,1fr)", placeItems: align === "center" ? "center" : "start center",
        padding: "84px 16px 40px", boxSizing: "border-box", position: "relative", overflowX: "hidden",
      }}>
        {bgImage && (
          <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: `url("${bgImage}")`, backgroundSize: "cover", backgroundPosition: "center", pointerEvents: "none" }} />
        )}
        {glow && !bgImage && (
          <div aria-hidden style={{ position: "absolute", left: "50%", top: 260, width: "min(900px,140vw)", height: "min(520px,110vw)", transform: "translate(-50%,-50%)", pointerEvents: "none", background: "radial-gradient(40% 50% at 30% 60%,rgba(255,225,77,.18),transparent 70%),radial-gradient(42% 52% at 70% 40%,rgba(255,79,148,.28),transparent 70%)", filter: "blur(48px)" }} />
        )}
        <a href="/" className="lg-glass" style={{ position: "fixed", top: 14, left: 14, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px 0 10px", borderRadius: 999, color: "var(--glass-ink)", textDecoration: "none", zIndex: 5 }}>
          <img src="/landing/logo.png" alt="" style={{ width: 30, height: "auto", display: "block" }} />
          <span style={{ font: "800 20px/1 var(--font-display)", letterSpacing: "-0.055em" }}>myLand</span>
        </a>
        <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A glass panel like /setup's. */
export function CrewPanel({ children, width = 520, style }: { children: ReactNode; width?: number; style?: CSSProperties }) {
  return (
    <section className="lg-glass" style={{ position: "relative", width: `min(${width}px,100%)`, padding: "28px 24px", borderRadius: 30, display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", ...style }}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span style={{ alignSelf: "flex-start", height: 28, padding: "0 12px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: "var(--ml-ink)", color: "var(--ml-bg)", font: "600 11px var(--font-mono)", letterSpacing: ".08em" }}>
      {children}
    </span>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <h1 style={{ margin: 0, fontFamily: "var(--ml-display)", fontWeight: 800, fontSize: "clamp(26px,6vw,38px)", lineHeight: 0.95, letterSpacing: "-0.045em", textTransform: "uppercase", overflowWrap: "anywhere", ...style }}>
      {children}
    </h1>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, font: "500 15px/1.5 var(--font-sans)", color: "var(--ml-ink-2)" }}>{children}</p>;
}

/** The accent button (Reclamar / UNIRME). */
export function PrimaryButton({ children, disabled, onClick, type = "button", color }: {
  children: ReactNode; disabled?: boolean; onClick?: () => void; type?: "button" | "submit"; color?: string;
}) {
  const c = color ?? "var(--ml-accent)";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="crew-primary"
      style={{ height: 56, padding: "0 26px", border: "none", borderRadius: 999, background: c, color: "#141118", font: "750 16px var(--font-sans)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, boxShadow: `inset 0 1px 0 rgba(255,255,255,.45),0 18px 40px -16px ${c}`, transition: "opacity .2s, transform .15s" }}>
      {children}
    </button>
  );
}

/** A flat well button (secondary actions). */
export function WellButton({ children, onClick, danger, disabled, href, small }: {
  children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean; href?: string; small?: boolean;
}) {
  const style: CSSProperties = {
    height: small ? 34 : 40, padding: small ? "0 12px" : "0 16px", border: "none", borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: danger ? "var(--glass-danger-soft)" : "var(--glass-well)", color: danger ? "var(--glass-danger)" : "var(--glass-ink)",
    font: `600 ${small ? 13 : 14}px var(--font-sans)`, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, textDecoration: "none", whiteSpace: "nowrap",
  };
  if (href) return <a href={href} className="crew-well" style={style}>{children}</a>;
  return <button type="button" className="crew-well" disabled={disabled} onClick={onClick} style={style}>{children}</button>;
}

/** A labelled field with the design system's input well. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)" }}>{label}</span>
      {children}
      {hint && <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--ml-ink-3)" }}>{hint}</span>}
    </label>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "bad" | "ok" }) {
  if (!children) return null;
  const color = tone === "bad" ? "var(--ml-bad)" : tone === "ok" ? "var(--ml-ok)" : "var(--ml-ink-2)";
  return (
    <div role={tone === "bad" ? "alert" : "status"} style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px/1.4 var(--font-sans)", color }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, flex: "none" }} />
      {children}
    </div>
  );
}

const CREW_CSS = `
.ml-site .crew-well:hover:not(:disabled){background:var(--glass-well-hover)}
.ml-site .crew-well:focus-visible,.ml-site .crew-primary:focus-visible{outline:none;box-shadow:var(--glass-ring)}
.ml-site .crew-primary:active:not(:disabled){transform:scale(.98)}
.ml-site .crew-mini{transition:transform .2s var(--glass-spring)}
.ml-site .crew-mini:hover{transform:translateY(-3px)}
.ml-site .crew-mini:focus-visible{outline:none;box-shadow:var(--glass-ring)}
@media (prefers-reduced-motion: reduce){.ml-site .crew-mini,.ml-site .crew-primary{transition:none}.ml-site .crew-mini:hover{transform:none}}
`;
