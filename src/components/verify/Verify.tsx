"use client";
/**
 * Verificación opcional (2026-11-27): the pill that invites to verify, the
 * Explorar notice and the dialog (benefits → code → done). Like the apps that
 * do it well (a small persistent nudge, never a popup on its own; the
 * benefits shown before asking for anything), the dialog opens only when the
 * person taps.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useVerified, sendVerifyCode, confirmVerifyCode, verifyPillHidden, hideVerifyPill, VERIFY_EVENT } from "@/lib/verify";

const FONT = "var(--font-sans, 'DM Sans', system-ui), sans-serif";
const PINK = "#FF4F94";
const INK = "#F6F3F8";

export function VerifiedMark({ size = 14, color = "#4FC3FF" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: "none" }}>
      <path fill={color} d="M12 1.8l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.2l-2.6-1.9-3.2.1-1-3L2.6 15.5l1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z" />
      <path d="M7.8 12.3l2.8 2.8 5.6-5.8" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BENEFITS: { t: string; d: string; icon: React.ReactNode }[] = [
  { t: "Aparecé en Explorar", d: "Tu card se muestra a la comunidad y te recomendamos a otros.", icon: <path d="M12 3l2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.8 6.4 20l1.4-6.3L3 9.4l6.4-.6z" fill="currentColor" /> },
  { t: "Tilde de verificado", d: "Al lado de tu @ en tu perfil.", icon: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Nunca perdés tu cuenta", d: "Si te olvidás la contraseña, la recuperás por mail.", icon: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /> },
];

export function VerifyDialog({ onClose }: { onClose: () => void }) {
  const { email } = useVerified();
  const [step, setStep] = useState<"intro" | "code" | "done">("intro");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const phone = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(c => c - 1), 1000); return () => clearTimeout(t); }, [cool]);
  useEffect(() => { if (step === "code") setTimeout(() => input.current?.focus(), 60); }, [step]);

  async function send() {
    if (!email || busy) return;
    setBusy(true); setErr(null);
    const e = await sendVerifyCode(email);
    setBusy(false);
    if (e) { setErr(e); return; }
    setCool(60); setStep("code");
  }
  async function check(v: string) {
    if (!email || busy || v.length !== 6) return;
    setBusy(true); setErr(null);
    const e = await confirmVerifyCode(email, v);
    setBusy(false);
    if (e) { setErr(e); setCode(""); return; }
    setStep("done");
  }

  const box: React.CSSProperties = phone
    ? { position: "fixed", left: 0, right: 0, bottom: 0, borderRadius: "24px 24px 0 0", padding: "22px 20px calc(22px + env(safe-area-inset-bottom))" }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 400, borderRadius: 24, padding: 26 };
  const btn = (primary: boolean): React.CSSProperties => ({
    width: "100%", height: 48, borderRadius: 14, border: "none", cursor: busy ? "default" : "pointer", font: `700 15px ${FONT}`,
    background: primary ? PINK : "rgba(255,255,255,.08)", color: primary ? "#fff" : INK, opacity: busy ? .6 : 1,
  });

  return createPortal(
    <div data-mnemo-ui="" role="dialog" aria-modal="true" aria-label="Verificá tu cuenta" style={{ position: "fixed", inset: 0, zIndex: 9500 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(5,4,8,.6)" }} />
      <div style={{ ...box, background: "rgba(22,19,28,.98)", border: "1px solid rgba(255,255,255,.1)", color: INK, font: `500 14px ${FONT}`, boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}>
        <button type="button" aria-label="Cerrar" onClick={onClose}
          style={{ position: "absolute", right: 14, top: 14, width: 34, height: 34, borderRadius: 17, border: "none", background: "rgba(255,255,255,.08)", color: INK, cursor: "pointer", display: "grid", placeItems: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {step === "intro" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><VerifiedMark size={28} /><h2 style={{ margin: 0, font: `800 21px ${FONT}` }}>Verificá tu cuenta</h2></div>
            <p style={{ margin: "0 0 16px", color: "rgba(246,243,248,.62)" }}>Te mandamos un código a tu mail. Tarda 30 segundos.</p>
            <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "grid", gap: 12 }}>
              {BENEFITS.map(b => (
                <li key={b.t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(255,79,148,.14)", color: PINK, display: "grid", placeItems: "center", flex: "none" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>{b.icon}</svg>
                  </span>
                  <span><b style={{ display: "block", font: `700 14.5px ${FONT}` }}>{b.t}</b><span style={{ color: "rgba(246,243,248,.6)", fontSize: 13 }}>{b.d}</span></span>
                </li>
              ))}
            </ul>
            {email && <p data-no-i18n="" style={{ margin: "0 0 12px", textAlign: "center", color: "rgba(246,243,248,.7)", fontSize: 13 }}>{email}</p>}
            {err && <p role="alert" style={{ margin: "0 0 10px", color: "#ff8aa8", textAlign: "center", fontSize: 13 }}>{err}</p>}
            <button type="button" onClick={send} disabled={busy || !email} style={btn(true)}>{busy ? "Mandando…" : "Mandarme el código"}</button>
          </>
        )}
        {step === "code" && (
          <>
            <h2 style={{ margin: "0 0 6px", font: `800 21px ${FONT}` }}>Escribí el código</h2>
            <p style={{ margin: "0 0 16px", color: "rgba(246,243,248,.62)" }}>Lo mandamos a <b data-no-i18n="" style={{ color: INK }}>{email}</b>. Mirá también en spam.</p>
            <input ref={input} value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Código de 6 números"
              onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6) check(v); }}
              style={{ width: "100%", height: 58, borderRadius: 14, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: INK,
                textAlign: "center", font: `700 28px ui-monospace, monospace`, letterSpacing: 10, outline: "none", boxSizing: "border-box" }} />
            {err && <p role="alert" style={{ margin: "10px 0 0", color: "#ff8aa8", textAlign: "center", fontSize: 13 }}>{err}</p>}
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => check(code)} disabled={busy || code.length !== 6} style={btn(true)}>{busy ? "Verificando…" : "Verificar"}</button>
              <button type="button" onClick={send} disabled={busy || cool > 0} style={btn(false)}>{cool > 0 ? `Mandar otro (${cool})` : "Mandar otro código"}</button>
            </div>
          </>
        )}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
            <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}><VerifiedMark size={64} /></div>
            <h2 style={{ margin: "0 0 6px", font: `800 22px ${FONT}` }}>¡Listo, estás verificado!</h2>
            <p style={{ margin: "0 0 18px", color: "rgba(246,243,248,.62)" }}>Tu card ya puede aparecer en Explorar.</p>
            <button type="button" onClick={onClose} style={btn(true)}>Genial</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The small pill (editor): only for accounts that are not verified. */
export function VerifyPill({ style, compact = false }: { style?: React.CSSProperties; compact?: boolean }) {
  const { verified } = useVerified();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(verifyPillHidden());
    const on = () => setHidden(verifyPillHidden());
    window.addEventListener(VERIFY_EVENT, on);
    return () => window.removeEventListener(VERIFY_EVENT, on);
  }, []);
  if (verified !== false || (hidden && !open)) return open ? <VerifyDialog onClose={() => setOpen(false)} /> : null;
  return (
    <>
      <div data-mnemo-ui="" style={{ position: "fixed", zIndex: 650, display: "flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 999,
        background: "rgba(20,17,26,.92)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 10px 30px rgba(0,0,0,.35)", ...style }}>
        <button type="button" onClick={() => setOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px 0 10px", borderRadius: 999, border: "none", cursor: "pointer",
            background: "rgba(255,79,148,.16)", color: INK, font: `700 13px ${FONT}`, whiteSpace: "nowrap" }}>
          <VerifiedMark size={18} /> Verificá tu cuenta{!compact && <span style={{ color: "rgba(246,243,248,.6)", fontWeight: 500 }}>· aparecé en Explorar</span>}
        </button>
        <button type="button" aria-label="Ahora no" onClick={hideVerifyPill}
          style={{ width: 30, height: 30, borderRadius: 15, border: "none", background: "transparent", color: "rgba(246,243,248,.55)", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      {open && <VerifyDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/** Explorar: "your card is not here yet" for accounts that are not verified. */
export function VerifyExploreNotice() {
  const { verified } = useVerified();
  const [open, setOpen] = useState(false);
  if (verified !== false) return open ? <VerifyDialog onClose={() => setOpen(false)} /> : null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", margin: "0 0 14px", borderRadius: 16, cursor: "pointer", textAlign: "left",
          border: "1px solid rgba(255,79,148,.35)", background: "linear-gradient(135deg, rgba(255,79,148,.16), rgba(140,90,255,.12))", color: INK, font: `500 13px ${FONT}` }}>
        <VerifiedMark size={30} />
        <span style={{ flex: 1 }}><b style={{ display: "block", font: `700 14px ${FONT}` }}>Tu card todavía no aparece acá</b>Verificá tu cuenta y te mostramos a la comunidad.</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
      </button>
      {open && <VerifyDialog onClose={() => setOpen(false)} />}
    </>
  );
}
