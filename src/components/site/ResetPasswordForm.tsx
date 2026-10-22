"use client";
/**
 * "Elegí una contraseña nueva" — the end of "¿Te la olvidaste?". Not a screen
 * of the Claude Design file: it reuses the Auth v4 look (its title, field,
 * button and theme variables), on the same .ml-site styles.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon as DsIcon } from "./ds";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = DsIcon as any;
import "./site.css";

const VARS = {
  "--ml-bg": "#0E0C12", "--ml-ink": "#F6F3F8", "--ml-ink-2": "rgba(238,232,244,.72)", "--ml-ink-3": "rgba(238,232,244,.5)",
  "--ml-field": "rgba(255,255,255,.07)", "--ml-line": "rgba(255,255,255,.10)", "--ml-accent": "#FF4F94",
  "--ml-display": "'Unbounded',sans-serif", "--ml-err-bg": "rgba(255,95,87,.16)", "--ml-err-ink": "#FFB4AF",
} as React.CSSProperties;

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&display=swap";

export default function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pass.length < 8) { setError("Mínimo 8 caracteres."); return; }
    setLoading(true); setError("");
    const { error: err } = await createClient().auth.updateUser({ password: pass });
    if (err) {
      setLoading(false);
      setError(err.message.toLowerCase().includes("different") ? "Elegí una contraseña distinta de la anterior." : "No pudimos cambiarla. Probá de nuevo.");
      return;
    }
    setDone(true);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1200);
  }

  const field: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", height: 54, border: "none", outline: "none", borderRadius: 16,
    background: "var(--ml-field)", padding: "0 54px 0 16px", font: "550 16px var(--font-sans)", color: "var(--ml-ink)",
    boxShadow: error ? "0 0 0 1.5px #FF5F57" : "0 0 0 1px var(--ml-line)", transition: "box-shadow .25s,transform .35s var(--glass-spring)",
  };

  return (
    <div className="ml-site">
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
      <div className="lg" data-editor-theme="dark" style={{ ...VARS, minHeight: "100vh", background: "var(--ml-bg)", color: "var(--ml-ink)", fontFamily: "var(--font-sans)", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box" }}>
        <a href="/" className="lg-glass" style={{ position: "fixed", top: 14, left: 14, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px 0 10px", borderRadius: 999, color: "var(--glass-ink)" }}>
          <img src="/landing/logo.png" alt="" style={{ width: 30, height: "auto", display: "block" }} />
          <span style={{ font: "800 20px/1 var(--font-display)", letterSpacing: "-0.055em" }}>myLand</span>
        </a>
        <form onSubmit={submit} className="lg-glass" style={{ width: "min(440px,100%)", boxSizing: "border-box", padding: "36px 34px", borderRadius: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--ml-display)", fontWeight: 800, fontSize: "clamp(28px,3vw,36px)", lineHeight: 0.95, letterSpacing: "-0.045em", textTransform: "uppercase" }}>
            {done ? "Listo" : "Elegí una contraseña nueva"}
          </h1>
          <p style={{ margin: 0, font: "500 15px/1.45 var(--font-sans)", color: "var(--ml-ink-2)" }}>
            {done ? "Tu contraseña cambió. Entrando a tu sala…" : `Para ${email || "tu cuenta"}.`}
          </p>
          {!done && (
            <>
              <label htmlFor="f-newpass" style={{ font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)", marginTop: 6 }}>Contraseña nueva</label>
              <div style={{ position: "relative" }}>
                <input id="f-newpass" type={show ? "text" : "password"} value={pass} autoFocus autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres" disabled={loading}
                  onChange={e => { setPass(e.target.value); setError(""); }} style={field} />
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{ position: "absolute", right: 5, top: 5, width: 44, height: 44, border: "none", borderRadius: 12, background: "transparent", color: "var(--ml-ink-2)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <Icon name={show ? "eye-off" : "eye"} size={17} />
                </button>
              </div>
              {error && (
                <div role="alert" style={{ borderRadius: 14, background: "var(--ml-err-bg)", color: "var(--ml-err-ink)", padding: "10px 14px", font: "550 14px/1.4 var(--font-sans)" }}>{error}</div>
              )}
              <button type="submit" disabled={loading} style={{ marginTop: 4, height: 58, border: "none", borderRadius: 999, background: "var(--ml-accent)", color: "#141118", font: "750 16px var(--font-sans)", cursor: "pointer", opacity: loading ? 0.85 : 1, boxShadow: "inset 0 1px 0 rgba(255,255,255,.45),0 18px 40px -16px var(--ml-accent)" }}>
                {loading ? "Guardando…" : "Guardar y entrar"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
