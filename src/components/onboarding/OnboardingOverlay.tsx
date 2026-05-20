"use client";
import { useState, useEffect, useRef } from "react";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
  {
    num:      "01",
    title:    "THIS IS YOUR SPACE",
    body:     "A blank canvas. No templates, no rules. Build whatever you want.",
    hint:     null as null | "fab" | "topbar-space" | "topbar-social",
    cta:      null as null | string,
  },
  {
    num:      "02",
    title:    "BUILD FREELY",
    body:     "Add images, cards, text, galleries — everything from the + button in the bottom-right.",
    hint:     "fab" as const,
    cta:      null,
  },
  {
    num:      "03",
    title:    "PEOPLE CAN VISIT YOUR WORLD",
    body:     "Switch to MY SPACE in the topbar, then hit Publish. Your canvas becomes a shareable URL.",
    hint:     "topbar-space" as const,
    cta:      null,
  },
  {
    num:      "04",
    title:    "OPEN SOCIAL TO CONNECT",
    body:     "Follow people. Send messages. Find others building in Mnemo. Start by uploading an image, adding a text block, or setting a wallpaper.",
    hint:     "topbar-social" as const,
    cta:      "Start building →",
  },
] as const;

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  onDone: () => void;
}

export default function OnboardingOverlay({ onDone }: Props) {
  const [stepIdx,      setStepIdx]      = useState(0);
  const [panelIn,      setPanelIn]      = useState(false);
  const [hintIn,       setHintIn]       = useState(false);
  const [overlayIn,    setOverlayIn]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate in on mount
  useEffect(() => {
    const t1 = setTimeout(() => setOverlayIn(true),  40);
    const t2 = setTimeout(() => { setPanelIn(true); setHintIn(true); }, 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function transitionOut(cb: () => void) {
    setPanelIn(false);
    setHintIn(false);
    timerRef.current = setTimeout(cb, 200);
  }

  function advance() {
    if (stepIdx >= STEPS.length - 1) {
      transitionOut(() => {
        setOverlayIn(false);
        timerRef.current = setTimeout(onDone, 220);
      });
      return;
    }
    transitionOut(() => {
      setStepIdx(i => i + 1);
      timerRef.current = setTimeout(() => { setPanelIn(true); setHintIn(true); }, 20);
    });
  }

  function skip() {
    transitionOut(() => {
      setOverlayIn(false);
      timerRef.current = setTimeout(onDone, 180);
    });
  }

  const step   = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <>
      <style>{`
        @keyframes onb-fab-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0.75; transform: scale(1.08); }
        }
        @keyframes onb-bar-glow {
          0%, 100% { opacity: 0.28; }
          50%       { opacity: 0.62; }
        }
      `}</style>

      {/* ── Backdrop overlay ── */}
      <div style={{
        position:   "fixed",
        inset:      0,
        zIndex:     9000,
        background: "rgba(0,0,0,0.55)",
        opacity:    overlayIn ? 1 : 0,
        transition: "opacity 0.28s ease",
        pointerEvents: "none",
      }} />

      {/* ── Hint: FAB ring (step 2) ── */}
      {step.hint === "fab" && (
        <div style={{
          position:      "fixed",
          bottom:        12,
          right:         12,
          width:         58,
          height:        58,
          borderRadius:  "50%",
          border:        "1.5px solid rgba(255,255,255,0.38)",
          zIndex:        9003,
          pointerEvents: "none",
          opacity:       hintIn ? 1 : 0,
          transition:    "opacity 0.22s ease",
          animation:     "onb-fab-pulse 2s ease-in-out infinite",
        }} />
      )}

      {/* ── Hint: Topbar space/social (steps 3-4) ── */}
      {(step.hint === "topbar-space" || step.hint === "topbar-social") && (
        <TopbarHint
          visible={hintIn}
          label={step.hint === "topbar-social" ? "SOCIAL" : "MY SPACE"}
        />
      )}

      {/* ── Main panel ── */}
      <div style={{
        position:            "fixed",
        bottom:              74,
        left:                0,
        right:               0,
        zIndex:              9001,
        background:          "rgba(5,5,8,0.97)",
        borderTop:           "1px solid rgba(255,255,255,0.08)",
        borderBottom:        "1px solid rgba(255,255,255,0.04)",
        padding:             "26px clamp(20px, 5vw, 48px) 24px",
        backdropFilter:      "blur(32px)",
        WebkitBackdropFilter:"blur(32px)",
        pointerEvents:       "all",
        opacity:             panelIn ? 1 : 0,
        transform:           panelIn ? "translateY(0)" : "translateY(12px)",
        transition:          "opacity 0.2s ease, transform 0.22s ease",
      }}>

        {/* Step counter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <span style={{
            fontFamily:    MONO,
            fontSize:      7.5,
            letterSpacing: 3,
            color:         "rgba(255,255,255,0.18)",
            textTransform: "uppercase",
          }}>
            {step.num} / {String(STEPS.length).padStart(2, "0")}
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Title */}
        <div style={{
          fontFamily:    MONO,
          fontSize:      "clamp(13px, 2vw, 17px)",
          letterSpacing: 4,
          color:         "rgba(255,255,255,0.88)",
          textTransform: "uppercase",
          lineHeight:    1.35,
          marginBottom:  9,
        }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{
          fontFamily:   SANS,
          fontSize:     13,
          color:        "rgba(255,255,255,0.35)",
          lineHeight:   1.65,
          marginBottom: 24,
          maxWidth:     500,
        }}>
          {step.body}
        </div>

        {/* Controls row */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            16,
        }}>
          {/* Skip */}
          <button
            onClick={skip}
            style={{
              fontFamily:    MONO,
              fontSize:      8,
              letterSpacing: 2,
              textTransform: "uppercase",
              color:         "rgba(255,255,255,0.18)",
              background:    "transparent",
              border:        "none",
              cursor:        "pointer",
              padding:       "4px 0",
              transition:    "color 0.12s ease",
              flexShrink:    0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.38)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.18)"; }}
          >
            skip
          </button>

          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width:        i === stepIdx ? 16 : 5,
                  height:       5,
                  borderRadius: 3,
                  background:   i === stepIdx
                    ? "rgba(255,255,255,0.62)"
                    : i < stepIdx
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.09)",
                  transition:   "all 0.22s ease",
                }}
              />
            ))}
          </div>

          {/* Advance / Start */}
          <AdvanceBtn label={isLast ? (step.cta ?? "START") : "NEXT"} onClick={advance} isLast={isLast} />
        </div>
      </div>
    </>
  );
}

// ── Topbar hint ────────────────────────────────────────────────────────────────

function TopbarHint({ visible, label }: { visible: boolean; label: string }) {
  return (
    <div
      aria-hidden
      style={{
        position:       "fixed",
        top:            0,
        left:           "50%",
        transform:      "translateX(-50%)",
        zIndex:         9002,
        pointerEvents:  "none",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        opacity:        visible ? 1 : 0,
        transition:     "opacity 0.22s ease",
      }}
    >
      {/* Glow band over topbar */}
      <div style={{
        width:       140,
        height:      44,
        background:  "rgba(255,255,255,0.04)",
        border:      "1px solid rgba(255,255,255,0.16)",
        borderTop:   "none",
        borderRadius:"0 0 6px 6px",
        animation:   "onb-bar-glow 2s ease-in-out infinite",
      }} />
      {/* Label */}
      <div style={{
        marginTop:     5,
        fontFamily:    MONO,
        fontSize:      7.5,
        letterSpacing: 2.5,
        color:         "rgba(255,255,255,0.38)",
        textTransform: "uppercase",
      }}>
        ↑ {label}
      </div>
    </div>
  );
}

// ── Advance button ─────────────────────────────────────────────────────────────

function AdvanceBtn({
  label,
  onClick,
  isLast,
}: {
  label:   string;
  onClick: () => void;
  isLast:  boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
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
        color:         hov ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
        background:    hov
          ? (isLast ? "rgba(212,240,196,0.09)" : "rgba(255,255,255,0.12)")
          : (isLast ? "rgba(212,240,196,0.05)" : "rgba(255,255,255,0.07)"),
        border:        `1px solid ${hov
          ? (isLast ? "rgba(212,240,196,0.3)" : "rgba(255,255,255,0.26)")
          : (isLast ? "rgba(212,240,196,0.18)" : "rgba(255,255,255,0.14)")}`,
        borderRadius:  4,
        padding:       "8px 18px",
        cursor:        "pointer",
        transition:    "all 0.12s ease",
        flexShrink:    0,
      }}
    >
      {label}
      {!isLast && (
        <span style={{ opacity: 0.55, fontSize: 11, lineHeight: 1 }}>→</span>
      )}
    </button>
  );
}
