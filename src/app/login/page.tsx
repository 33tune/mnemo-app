"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const RESERVED = new Set(["login", "dashboard", "auth", "api", "admin", "settings"]);

type Mode = "login" | "register";
type HandleStatus = "idle" | "checking" | "taken" | "invalid" | "ok";

const INPUT: React.CSSProperties = {
  width:      "100%",
  padding:    "9px 12px",
  borderRadius: 4,
  background: "rgba(255,255,255,0.04)",
  border:     "1px solid rgba(255,255,255,0.09)",
  color:      "rgba(255,255,255,0.85)",
  fontSize:   13,
  fontFamily: SANS,
  outline:    "none",
  boxSizing:  "border-box",
  transition: "border-color 0.1s ease",
};

function Field({
  label, value, onChange, type, placeholder, autoFocus,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type: string; placeholder: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={INPUT}
        onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [handleStatus, setHandleStatus] = useState<HandleStatus>("idle");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 3000);
    return () => clearInterval(id);
  }, []);

  async function validateHandle(raw: string) {
    const h = raw.toLowerCase();
    setHandle(h);
    if (!h) { setHandleStatus("idle"); return; }
    if (RESERVED.has(h) || !/^[a-z0-9_-]{3,20}$/.test(h)) {
      setHandleStatus("invalid");
      return;
    }
    setHandleStatus("checking");
    const { data } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
    setHandleStatus(data ? "taken" : "ok");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); }
    else router.push("/dashboard");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (handleStatus !== "ok") { setError("Elegí un handle válido"); return; }
    setLoading(true);
    setError("");

    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

    if (data.user) {
      const { error: profErr } = await supabase.from("profiles").insert({
        user_id:              data.user.id,
        handle,
        display_name:         handle,
        onboarding_completed: true,  // email users choose handle here, no setup needed
      });
      if (profErr && profErr.code !== "23505") {
        setError("Error creando perfil: " + profErr.message);
        setLoading(false);
        return;
      }
    }

    if (data.session) {
      router.push("/dashboard");
    } else {
      setLoading(false);
      setInfo("Revisá tu email para confirmar tu cuenta y después iniciá sesión.");
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); }
  }

  const handleHint =
    handleStatus === "checking" ? "verificando..." :
    handleStatus === "ok"       ? "disponible ✓" :
    handleStatus === "taken"    ? "ya está en uso" :
    handleStatus === "invalid"  ? "3–20 chars: a-z, 0-9, - y _" :
    "";

  const handleHintColor =
    handleStatus === "ok"                       ? "rgba(212,240,196,0.7)" :
    handleStatus === "taken" || handleStatus === "invalid" ? "rgba(255,100,80,0.7)" :
    "rgba(255,255,255,0.25)";

  const handleBorder =
    handle && handleStatus === "ok"    ? "1px solid rgba(212,240,196,0.3)" :
    handle && (handleStatus === "taken" || handleStatus === "invalid") ? "1px solid rgba(255,100,80,0.3)" :
    "1px solid rgba(255,255,255,0.07)";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
      <div className="grain" style={{ position: "fixed", inset: 0, pointerEvents: "none" }} />

      {/* Grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 36, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: pulse ? "rgba(232,224,212,0.92)" : "rgba(232,224,212,0.28)", transition: "background 1.8s ease, box-shadow 1.8s ease", boxShadow: pulse ? "0 0 7px rgba(232,224,212,0.55)" : "none" }} />
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 4, color: "rgba(255,255,255,0.55)", textTransform: "none" }}>myLand</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
          SOCIAL OS
        </span>
      </div>

      {/* Card */}
      <div style={{ width: 340, padding: "26px 28px", background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", position: "relative", zIndex: 1, boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 2, marginBottom: 22, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: 3 }}>
          {(["login", "register"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setInfo(""); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 3, border: mode === m ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent", cursor: "pointer", background: mode === m ? "rgba(255,255,255,0.08)" : "transparent", color: mode === m ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.32)", fontFamily: MONO, fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", transition: "all 0.1s ease" }}>
              {m === "login" ? "SIGN IN" : "REGISTER"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={mode === "login" ? handleLogin : handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="email" value={email} onChange={setEmail} type="email" placeholder="tu@email.com" autoFocus />
          <Field label="contraseña" value={password} onChange={setPassword} type="password" placeholder="••••••••" />

          {mode === "register" && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 6 }}>handle</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.25)", pointerEvents: "none" }}>@</span>
                <input
                  value={handle}
                  onChange={e => validateHandle(e.target.value)}
                  placeholder="tu-handle"
                  style={{ ...INPUT, paddingLeft: 26, border: handleBorder }}
                  onFocus={e => (e.currentTarget.style.borderColor = handle ? (handleStatus === "ok" ? "rgba(212,240,196,0.5)" : "rgba(255,100,80,0.5)") : "rgba(255,255,255,0.18)")}
                  onBlur={e => (e.currentTarget.style.border = handleBorder)}
                />
              </div>
              {handle && (
                <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: handleHintColor }}>{handleHint}</div>
              )}
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,60,40,0.08)", border: "1px solid rgba(255,60,40,0.15)", fontFamily: MONO, fontSize: 9, letterSpacing: 0.5, color: "rgba(255,120,100,0.9)" }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(212,240,196,0.06)", border: "1px solid rgba(212,240,196,0.15)", fontFamily: MONO, fontSize: 9, letterSpacing: 0.5, color: "rgba(212,240,196,0.8)" }}>
              {info}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ marginTop: 4, padding: "10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.82)", fontFamily: MONO, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.1s ease" }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(255,255,255,0.11)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.95)"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.82)"; }}>
            {loading ? "..." : mode === "login" ? "ENTER" : "CREATE ACCOUNT"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.2)" }}>o</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Google OAuth */}
        <button onClick={handleGoogle} disabled={loading}
          style={{ width: "100%", padding: "10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.42)", fontFamily: SANS, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.1s ease" }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.color = "rgba(255,255,255,0.78)"; }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.42)"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          continuar con Google
        </button>
      </div>
    </div>
  );
}
