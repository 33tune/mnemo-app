"use client";
import { useState } from "react";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

export default function AnonymousMessageWidget({ toUserId }: { toUserId: string }) {
  const [message, setMessage]   = useState("");
  const [sent, setSent]         = useState(false);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/anonymous-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: toUserId, message: message.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setMessage("");
      } else {
        setError("no se pudo enviar, intentá de nuevo");
      }
    } catch {
      setError("error de red");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 900,
      width: 320,
      background: "rgba(10,10,12,0.96)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 18,
      padding: "18px 18px 16px",
      backdropFilter: "blur(32px)",
      WebkitBackdropFilter: "blur(32px)",
      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
      fontFamily: SANS,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>
        carta anónima
      </div>

      {sent ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 0",
        }}>
          <div style={{ fontSize: 20 }}>✉️</div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: "rgba(212,240,196,0.8)", textTransform: "uppercase" }}>
            mensaje enviado
          </div>
          <button
            onClick={() => setSent(false)}
            style={{
              marginTop: 6, padding: "4px 14px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.09)", background: "transparent",
              color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: SANS,
            }}
          >
            enviar otro
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
            placeholder="tu mensaje anónimo..."
            rows={3}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              padding: "10px 12px",
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              fontFamily: SANS,
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
              lineHeight: 1.6,
            }}
            onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
            onBlur={e  => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
          />
          {error && (
            <div style={{ fontSize: 11, color: "rgba(255,100,100,0.7)", marginTop: 6, fontFamily: MONO, letterSpacing: 0.5 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              style={{
                padding: "7px 20px",
                borderRadius: 10,
                border: "none",
                background: message.trim() ? "rgba(212,240,196,0.12)" : "rgba(255,255,255,0.04)",
                color: message.trim() ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.25)",
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: 2,
                textTransform: "uppercase",
                cursor: message.trim() ? "pointer" : "default",
                outline: message.trim() ? "1px solid rgba(212,240,196,0.2)" : "none",
                transition: "all 0.15s",
              }}
            >
              {sending ? "enviando..." : "enviar"}
            </button>
          </div>
          <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.12)", letterSpacing: 1, textAlign: "right" }}>
            ctrl+enter para enviar · 100% anónimo
          </div>
        </>
      )}
    </div>
  );
}
