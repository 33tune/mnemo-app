"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const RESERVED = new Set([
  "login", "dashboard", "auth", "api", "admin", "settings",
  "setup", "space", "about", "help", "browse", "support",
]);

type HandleStatus = "idle" | "checking" | "ok" | "taken" | "invalid";
type Step = 1 | 2 | 3;

// ── Shared input style ─────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width:        "100%",
  padding:      "10px 12px",
  borderRadius: 4,
  background:   "rgba(255,255,255,0.04)",
  border:       "1px solid rgba(255,255,255,0.09)",
  color:        "rgba(255,255,255,0.85)",
  fontSize:     13,
  fontFamily:   SANS,
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.1s ease",
};

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  userId:               string;
  suggestedDisplayName: string;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SetupFlow({ userId, suggestedDisplayName }: Props) {
  const router = useRouter();

  const [step,        setStep]        = useState<Step>(1);
  const [panelIn,     setPanelIn]     = useState(false);

  // Step 1 — handle
  const [handle,       setHandle]       = useState("");
  const [handleStatus, setHandleStatus] = useState<HandleStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2 — display name
  const [displayName, setDisplayName] = useState(suggestedDisplayName);

  // Submit
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mount: fade in
  useEffect(() => {
    const t = setTimeout(() => setPanelIn(true), 60);
    return () => clearTimeout(t);
  }, []);

  // ── Handle validation ───────────────────────────────────────────────────────
  const validateHandle = useCallback(async (h: string) => {
    if (h.length < 3) { setHandleStatus(h.length > 0 ? "invalid" : "idle"); return; }
    if (RESERVED.has(h) || h.startsWith("temp_")) { setHandleStatus("invalid"); return; }

    setHandleStatus("checking");
    const sb = createClient();
    const { data } = await sb
      .from("profiles")
      .select("user_id")
      .eq("handle", h)
      .neq("user_id", userId)
      .maybeSingle();
    setHandleStatus(data ? "taken" : "ok");
  }, [userId]);

  function onHandleInput(raw: string) {
    // Auto-sanitize: lowercase, strip invalid chars, max 20
    const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
    setHandle(clean);
    setHandleStatus(clean.length >= 3 ? "checking" : clean.length > 0 ? "invalid" : "idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length >= 3) {
      debounceRef.current = setTimeout(() => validateHandle(clean), 400);
    }
  }

  // ── Step transition ─────────────────────────────────────────────────────────
  function transitionTo(next: Step) {
    setPanelIn(false);
    setTimeout(() => { setStep(next); setPanelIn(true); }, 170);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const sb = createClient();
    const { error } = await sb
      .from("profiles")
      .update({
        handle:               handle.trim(),
        display_name:         displayName.trim() || handle.trim(),
        onboarding_completed: true,
      })
      .eq("user_id", userId);

    if (error) {
      setSubmitting(false);
      if (error.code === "23505") {
        setSubmitError("That handle was just taken — please choose another.");
        transitionTo(1);
      } else {
        setSubmitError(error.message);
      }
      return;
    }

    router.push("/dashboard");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width:    "100%",
      maxWidth: 400,
      opacity:  panelIn ? 1 : 0,
      transform: panelIn ? "translateY(0)" : "translateY(14px)",
      transition: "opacity 0.22s ease, transform 0.22s ease",
    }}>

      {/* Step counter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 3, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>
          {String(step).padStart(2, "0")} / 03
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* Step content */}
      {step === 1 && (
        <StepHandle
          handle={handle}
          status={handleStatus}
          onInput={onHandleInput}
          onNext={() => transitionTo(2)}
        />
      )}
      {step === 2 && (
        <StepDisplayName
          displayName={displayName}
          onChange={setDisplayName}
          onBack={() => transitionTo(1)}
          onNext={() => transitionTo(3)}
        />
      )}
      {step === 3 && (
        <StepConfirm
          handle={handle}
          displayName={displayName}
          submitting={submitting}
          error={submitError}
          onBack={() => transitionTo(2)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

// ── Step 1 — Handle ────────────────────────────────────────────────────────────
function StepHandle({
  handle, status, onInput, onNext,
}: {
  handle: string;
  status: HandleStatus;
  onInput: (v: string) => void;
  onNext:  () => void;
}) {
  const canContinue = status === "ok";

  const statusText =
    status === "checking" ? "CHECKING…" :
    status === "ok"       ? "AVAILABLE ✓" :
    status === "taken"    ? "ALREADY TAKEN" :
    status === "invalid"  ? "3–20 CHARS: A–Z 0–9 - _" :
    "";

  const statusColor =
    status === "ok"      ? "rgba(212,240,196,0.72)" :
    status === "taken" || status === "invalid" ? "rgba(255,100,80,0.7)" :
    "rgba(255,255,255,0.28)";

  const borderColor =
    handle && status === "ok"      ? "rgba(212,240,196,0.28)" :
    handle && (status === "taken" || status === "invalid") ? "rgba(255,100,80,0.28)" :
    "rgba(255,255,255,0.09)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: 4, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", marginBottom: 8 }}>
        YOUR HANDLE
      </div>
      <div style={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.32)", marginBottom: 24, lineHeight: 1.5 }}>
        The address of your canvas.
      </div>

      {/* Input */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.28)", pointerEvents: "none" }}>@</span>
        <input
          autoFocus
          value={handle}
          onChange={e => onInput(e.target.value)}
          placeholder="your-handle"
          style={{ ...inputBase, paddingLeft: 28, border: `1px solid ${borderColor}` }}
          onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
          onBlur={e => (e.currentTarget.style.borderColor = borderColor)}
          onKeyDown={e => { if (e.key === "Enter" && canContinue) onNext(); }}
        />
      </div>

      {/* Preview */}
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: handle ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)", marginBottom: 6, transition: "color 0.15s ease" }}>
        mnemo.app/{handle || "your-handle"}
      </div>

      {/* Status */}
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: statusColor, height: 16, marginBottom: 28, transition: "color 0.15s ease" }}>
        {statusText}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ActionBtn label="CONTINUE" arrow onClick={onNext} disabled={!canContinue} />
      </div>
    </div>
  );
}

// ── Step 2 — Display Name ──────────────────────────────────────────────────────
function StepDisplayName({
  displayName, onChange, onBack, onNext,
}: {
  displayName: string;
  onChange:    (v: string) => void;
  onBack:      () => void;
  onNext:      () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: 4, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", marginBottom: 8 }}>
        YOUR NAME
      </div>
      <div style={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.32)", marginBottom: 24, lineHeight: 1.5 }}>
        Optional. How people see you in Mnemo.
      </div>

      <input
        autoFocus
        value={displayName}
        onChange={e => onChange(e.target.value.slice(0, 40))}
        placeholder="Display name"
        style={inputBase}
        onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
        onKeyDown={e => { if (e.key === "Enter") onNext(); }}
      />

      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.14)", marginTop: 6, marginBottom: 28 }}>
        Leave blank to use your handle
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BackBtn onClick={onBack} />
        <ActionBtn label="CONTINUE" arrow onClick={onNext} />
      </div>
    </div>
  );
}

// ── Step 3 — Confirm ───────────────────────────────────────────────────────────
function StepConfirm({
  handle, displayName, submitting, error, onBack, onSubmit,
}: {
  handle:      string;
  displayName: string;
  submitting:  boolean;
  error:       string | null;
  onBack:      () => void;
  onSubmit:    () => void;
}) {
  const name = displayName.trim() || handle;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: 4, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", marginBottom: 8 }}>
        YOU'RE READY.
      </div>
      <div style={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.32)", marginBottom: 28, lineHeight: 1.5 }}>
        Your canvas is waiting.
      </div>

      {/* Summary card */}
      <div style={{
        padding:      "16px 18px",
        background:   "rgba(255,255,255,0.03)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6,
        marginBottom: 28,
        display:      "flex",
        flexDirection:"column",
        gap:          6,
      }}>
        <div style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
          {name}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.28)" }}>
          mnemo.app/{handle}
        </div>
      </div>

      {error && (
        <div style={{
          padding:      "8px 12px",
          borderRadius: 4,
          background:   "rgba(255,60,40,0.07)",
          border:       "1px solid rgba(255,60,40,0.15)",
          fontFamily:   MONO,
          fontSize:     8,
          letterSpacing:0.5,
          color:        "rgba(255,120,100,0.9)",
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BackBtn onClick={onBack} disabled={submitting} />
        <ActionBtn
          label={submitting ? "…" : "START"}
          arrow={!submitting}
          onClick={onSubmit}
          disabled={submitting}
          accent
        />
      </div>
    </div>
  );
}

// ── Shared button components ───────────────────────────────────────────────────

function ActionBtn({
  label, arrow, onClick, disabled, accent,
}: {
  label:     string;
  arrow?:    boolean;
  onClick:   () => void;
  disabled?: boolean;
  accent?:   boolean;
}) {
  const [hov, setHov] = useState(false);
  const isActive = !disabled;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           7,
        fontFamily:    MONO,
        fontSize:      8,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        color:         disabled
          ? "rgba(255,255,255,0.2)"
          : accent
          ? (hov ? "rgba(212,240,196,0.95)" : "rgba(212,240,196,0.8)")
          : (hov ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)"),
        background:    disabled
          ? "rgba(255,255,255,0.03)"
          : accent
          ? (hov ? "rgba(212,240,196,0.1)" : "rgba(212,240,196,0.06)")
          : (hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"),
        border: `1px solid ${
          disabled
            ? "rgba(255,255,255,0.07)"
            : accent
            ? (hov ? "rgba(212,240,196,0.35)" : "rgba(212,240,196,0.2)")
            : (hov ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.14)")
        }`,
        borderRadius:  4,
        padding:       "9px 18px",
        cursor:        disabled ? "not-allowed" : "pointer",
        transition:    "all 0.12s ease",
        flexShrink:    0,
      }}
    >
      {label}
      {arrow && isActive && (
        <span style={{ opacity: 0.6, fontSize: 11, lineHeight: 1 }}>→</span>
      )}
    </button>
  );
}

function BackBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily:    MONO,
        fontSize:      8,
        letterSpacing: 2,
        textTransform: "uppercase",
        color:         hov ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.18)",
        background:    "transparent",
        border:        "none",
        cursor:        disabled ? "not-allowed" : "pointer",
        padding:       "6px 0",
        transition:    "color 0.12s ease",
        display:       "flex",
        alignItems:    "center",
        gap:           5,
        opacity:       disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 10 }}>←</span> BACK
    </button>
  );
}
