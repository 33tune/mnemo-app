"use client";
/**
 * /setup (2026-10-27): after signing in with Google the user picks their
 * myland.lol/<name>. Same look as the Auth v4 page (title, glass panel, the
 * name field and the accent button, on the .ml-site styles) — it replaces the
 * old three-step setup. On a phone the name is claimed too, and the screen
 * then says to open myLand on a computer to build the card.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkHandle } from "./siteAuth";
import { MobileClaimed } from "./MobileClaimed";
import "./site.css";

const VARS = {
  "--ml-bg": "#0E0C12", "--ml-ink": "#F6F3F8", "--ml-ink-2": "rgba(238,232,244,.72)", "--ml-ink-3": "rgba(238,232,244,.5)",
  "--ml-accent": "#FF4F94", "--ml-ok": "#5BE49B", "--ml-bad": "#FF5F57", "--ml-display": "'Unbounded',sans-serif",
} as React.CSSProperties;

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&display=swap";

type Status = "idle" | "checking" | "ok" | "taken" | "invalid";
const STATUS_TEXT: Record<Status, string> = {
  idle: "3 a 20 letras, números, - o _",
  checking: "Buscando…",
  ok: "¡Está libre!",
  taken: "Ese nombre ya tiene dueño",
  invalid: "Usá 3 a 20 letras, números, - o _",
};

export default function SetupScreen({ userId, suggestedName, phone }: { userId: string; suggestedName: string; phone: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [claimed, setClaimed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onInput(raw: string) {
    const h = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
    setHandle(h);
    setError("");
    latest.current = h;
    if (timer.current) clearTimeout(timer.current);
    if (!h) { setStatus("idle"); return; }
    if (h.length < 3) { setStatus("invalid"); return; }
    setStatus("checking");
    timer.current = setTimeout(async () => {
      const r = await checkHandle(h);
      if (latest.current === h) setStatus(r);
    }, 350);
  }

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "ok" || saving) return;
    setSaving(true);
    setError("");
    // .select(): an update that touches no row is not an error for Supabase —
    // without the row, going on would bounce back here (the "reload" bug).
    const { data: rows, error: err } = await createClient().from("profiles")
      .update({ handle, display_name: suggestedName.trim() || handle, onboarding_completed: true })
      .eq("user_id", userId)
      .select("id");
    if (err || !rows?.length) {
      setSaving(false);
      if (err?.code === "23505") { setStatus("taken"); setError("Alguien lo reclamó recién. Probá con otro."); }
      else if (!err) { setError("No encontramos tu cuenta. Recargá la página y probá de nuevo."); }
      else setError("No pudimos guardarlo. Probá de nuevo.");
      return;
    }
    // Came from a crew's invite (Crews): back to the pact to join.
    let pact: string | null = null;
    try { pact = localStorage.getItem("mnemo_pending_pact"); } catch { /* ignore */ }
    if (pact && /^\/c\/[a-z0-9_-]{3,24}\/unirme\?k=[A-Za-z0-9%_-]{1,80}$/.test(pact)) { router.push(pact); router.refresh(); return; }
    if (phone) { setClaimed(handle); return; }
    router.push("/dashboard");
    router.refresh();
  }

  if (claimed) return <MobileClaimed handle={claimed} />;

  const ring = status === "ok" ? "var(--ml-ok)" : status === "taken" || status === "invalid" ? "var(--ml-bad)" : "rgba(255,255,255,.10)";
  const dot = status === "ok" ? "var(--ml-ok)" : status === "taken" || status === "invalid" ? "var(--ml-bad)" : "var(--ml-ink-3)";
  return (
    <div className="ml-site">
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
      {/* The pill shows the focus (its ring); no second box around the input. */}
      <style>{`.ml-site .lg input.ml-setup-input:focus-visible{box-shadow:none!important}.ml-site .lg label:focus-within{background:rgba(255,255,255,.1)!important}`}</style>
      <div className="lg" data-editor-theme="dark" style={{ ...VARS, minHeight: "100dvh", background: "var(--ml-bg)", color: "var(--ml-ink)", fontFamily: "var(--font-sans)", display: "grid", gridTemplateColumns: "minmax(0,1fr)", placeItems: "center", padding: 20, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", left: "50%", top: "40%", width: "min(900px,140vw)", height: "min(520px,110vw)", transform: "translate(-50%,-50%)", pointerEvents: "none", background: "radial-gradient(40% 50% at 30% 60%,rgba(255,225,77,.22),transparent 70%),radial-gradient(42% 52% at 70% 40%,rgba(255,79,148,.32),transparent 70%)", filter: "blur(48px)" }} />
        <a href="/" className="lg-glass" style={{ position: "fixed", top: 14, left: 14, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px 0 10px", borderRadius: 999, color: "var(--glass-ink)", textDecoration: "none", zIndex: 2 }}>
          <img src="/landing/logo.png" alt="" style={{ width: 30, height: "auto", display: "block" }} />
          <span style={{ font: "800 20px/1 var(--font-display)", letterSpacing: "-0.055em" }}>myLand</span>
        </a>
        <main className="lg-glass" style={{ position: "relative", width: "min(480px,100%)", padding: "34px 28px 30px", borderRadius: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ alignSelf: "flex-start", height: 28, padding: "0 12px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: "var(--ml-ink)", color: "var(--ml-bg)", font: "600 11px var(--font-mono)", letterSpacing: ".08em" }}>ÚLTIMO PASO</span>
          <h1 style={{ margin: 0, fontFamily: "var(--ml-display)", fontWeight: 800, fontSize: "clamp(28px,7vw,40px)", lineHeight: 0.95, letterSpacing: "-0.045em", textTransform: "uppercase" }}>
            Elegí tu nombre
          </h1>
          <p style={{ margin: 0, font: "500 15px/1.5 var(--font-sans)", color: "var(--ml-ink-2)" }}>
            Es tu link: lo vas a poner en tu bio. Lo podés elegir una sola vez, pensalo bien.
          </p>
          <form onSubmit={claim} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            <label style={{ display: "flex", alignItems: "center", height: 58, padding: "0 18px", borderRadius: 999, background: "rgba(255,255,255,.07)", boxShadow: `0 0 0 1.5px ${ring}`, transition: "box-shadow .25s" }}>
              <span style={{ font: "600 17px var(--font-sans)", color: "var(--ml-ink-3)", whiteSpace: "nowrap" }}>myland.lol/</span>
              <input className="ml-setup-input" value={handle} onChange={e => onInput(e.target.value)} autoFocus placeholder="tu-nombre" spellCheck={false} autoComplete="off" autoCapitalize="none"
                aria-label="Tu nombre en myLand" aria-describedby="ml-setup-status"
                style={{ flex: 1, minWidth: 0, height: "100%", border: "none", outline: "none", background: "transparent", color: "var(--ml-ink)", font: "700 17px var(--font-sans)", padding: "0 0 0 2px" }} />
            </label>
            <div id="ml-setup-status" role="status" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 18, padding: "0 16px", font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: dot, flex: "none" }} />
              {error || STATUS_TEXT[status]}
            </div>
            <button type="submit" disabled={status !== "ok" || saving}
              style={{ marginTop: 6, height: 56, border: "none", borderRadius: 999, background: "var(--ml-accent)", color: "#141118", font: "750 16px var(--font-sans)", cursor: status === "ok" && !saving ? "pointer" : "default", opacity: status === "ok" && !saving ? 1 : 0.45, boxShadow: "inset 0 1px 0 rgba(255,255,255,.45),0 18px 40px -16px var(--ml-accent)", transition: "opacity .2s" }}>
              {saving ? "Guardando…" : "Reclamar mi nombre"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
