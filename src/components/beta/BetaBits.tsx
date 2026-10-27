"use client";
/**
 * Beta notice + bug reports (2026-10-27).
 *  - BetaBanner: a thin translucent pill ("myLand está en beta…"), closable
 *    (remembered per browser). On the site pages and in the editor.
 *  - BugReport: the editor's always-there "Reportar un error" button and its
 *    little form. A report is a row in public.bug_reports; the database
 *    emails it to the owner (migration 20261027020000).
 *  - EditorBeta: both, wired so the banner's "Avisanos" opens the form.
 */
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BANNER_KEY = "mnemo_beta_banner_v1";
const FONT = "'DM Sans', system-ui, sans-serif";

const glass: React.CSSProperties = {
  background: "rgba(20,18,26,.62)", color: "rgba(246,243,248,.86)",
  boxShadow: "0 0 0 1px rgba(255,255,255,.09), 0 10px 30px -14px rgba(0,0,0,.6)",
  backdropFilter: "blur(14px) saturate(140%)", WebkitBackdropFilter: "blur(14px) saturate(140%)",
};

function useBannerOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem(BANNER_KEY)) setOpen(true); } catch { setOpen(true); } }, []);
  return [open, () => { try { localStorage.setItem(BANNER_KEY, "1"); } catch { /* ignore */ } setOpen(false); }];
}

export function BetaBanner({ top = 76, onReport, hideBelow = 0 }: { top?: number; onReport?: () => void; hideBelow?: number }) {
  const [open, close] = useBannerOpen();
  if (!open) return null;
  return (
    <div data-mnemo-ui="" className="mnemo-beta-banner" role="note" style={{
      ...glass, position: "fixed", top, left: "50%", transform: "translateX(-50%)", zIndex: 2147481000,
      display: "flex", alignItems: "center", gap: 10, maxWidth: "calc(100vw - 24px)", boxSizing: "border-box",
      height: 34, padding: "0 6px 0 6px", borderRadius: 999, font: `500 12.5px ${FONT}`, whiteSpace: "nowrap",
    }}>
      <span style={{ height: 22, padding: "0 9px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: "#FF4F94", color: "#141118", font: "800 10.5px 'Space Mono', monospace", letterSpacing: ".08em" }}>BETA</span>
      <span className="mnemo-beta-long" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>myLand está en beta: lo mejoramos todos los días.</span>
      <span className="mnemo-beta-short" style={{ display: "none" }}>Estamos en beta</span>
      {onReport ? (
        <button type="button" onClick={onReport} style={{ border: "none", background: "transparent", color: "#FF8DB8", font: `700 12.5px ${FONT}`, cursor: "pointer", padding: 0 }}>
          ¿Algo falla? Avisanos
        </button>
      ) : null}
      <button type="button" onClick={close} aria-label="Cerrar aviso de beta" style={{ width: 24, height: 24, border: "none", borderRadius: 99, background: "rgba(255,255,255,.08)", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center", font: `600 13px ${FONT}`, flex: "none" }}>×</button>
      {/* Phones: a small pill at the bottom-left, over nothing important. */}
      <style>{`@media (max-width:700px){.mnemo-beta-banner{top:auto!important;bottom:16px;left:16px!important;transform:none!important;height:30px!important}.mnemo-beta-long{display:none}.mnemo-beta-short{display:inline!important}}${hideBelow ? `@media (max-width:${hideBelow}px){.mnemo-beta-banner{display:none!important}}` : ""}`}</style>
    </div>
  );
}

type Status = "idle" | "sending" | "sent" | "error";

export function BugReport({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) { setStatus("idle"); setTimeout(() => areaRef.current?.focus(), 30); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onOpenChange(false); btnRef.current?.focus(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onOpenChange]);

  async function send() {
    const message = text.trim();
    if (message.length < 3 || status === "sending") return;
    setStatus("sending");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user?.id, message: message.slice(0, 2000),
      page: location.href.slice(0, 500), user_agent: navigator.userAgent.slice(0, 500),
    });
    if (error) { setStatus("error"); return; }
    setStatus("sent");
    setText("");
    setTimeout(() => onOpenChange(false), 1800);
  }

  return (
    <div data-mnemo-ui="" style={{ position: "fixed", left: 16, bottom: 16, zIndex: 2147481500, fontFamily: FONT }}>
      {open ? (
        <div role="dialog" aria-label="Reportar un error" style={{
          ...glass, background: "rgba(22,20,28,.94)", position: "absolute", left: 0, bottom: 48, width: 320, boxSizing: "border-box",
          padding: 16, borderRadius: 20, display: "flex", flexDirection: "column", gap: 10,
        }}>
          {status === "sent" ? (
            <p style={{ margin: 0, font: `700 15px/1.4 ${FONT}`, color: "#F6F3F8" }}>¡Gracias! Lo vamos a revisar.</p>
          ) : (
            <>
              <p style={{ margin: 0, font: `700 15px/1.3 ${FONT}`, color: "#F6F3F8" }}>¿Qué pasó?</p>
              <p style={{ margin: 0, font: `500 12.5px/1.4 ${FONT}`, color: "rgba(238,232,244,.6)" }}>Contanos qué hiciste y qué salió mal. Nos llega directo.</p>
              <textarea ref={areaRef} value={text} onChange={e => setText(e.target.value.slice(0, 2000))} rows={4}
                placeholder="Ej: subí una imagen y no apareció…" aria-label="Qué pasó"
                style={{ resize: "none", borderRadius: 12, border: "none", outline: "none", padding: "10px 12px", background: "rgba(255,255,255,.07)", color: "#F6F3F8", font: `500 13.5px/1.45 ${FONT}`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} />
              {status === "error" ? <p role="status" style={{ margin: 0, font: `600 12.5px ${FONT}`, color: "#FF8A84" }}>No se pudo enviar. Probá de nuevo.</p> : null}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => onOpenChange(false)} style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 999, background: "rgba(255,255,255,.08)", color: "#F6F3F8", font: `600 13px ${FONT}`, cursor: "pointer" }}>Cancelar</button>
                <button type="button" onClick={send} disabled={text.trim().length < 3 || status === "sending"}
                  style={{ height: 36, padding: "0 16px", border: "none", borderRadius: 999, background: "#FF4F94", color: "#141118", font: `750 13px ${FONT}`, cursor: "pointer", opacity: text.trim().length < 3 || status === "sending" ? 0.45 : 1 }}>
                  {status === "sending" ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      <button ref={btnRef} type="button" onClick={() => onOpenChange(!open)} aria-expanded={open}
        style={{ ...glass, height: 36, padding: "0 14px 0 10px", border: "none", borderRadius: 999, display: "flex", alignItems: "center", gap: 7, font: `600 12.5px ${FONT}`, cursor: "pointer" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 1 1 6 0v1.1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" /><path d="M12 20v-9M6.5 13H3M21 13h-3.5M6 9H4.5M19.5 9H18M6 17l-2 1.5M18 17l2 1.5" />
        </svg>
        Reportar un error
      </button>
    </div>
  );
}

/** The editor's pair: banner at the top (between the bar's capsules, hidden
 * when they'd overlap) and the report button at the bottom-left. */
export function EditorBeta() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BetaBanner top={24} hideBelow={1180} onReport={() => setOpen(true)} />
      <BugReport open={open} onOpenChange={setOpen} />
    </>
  );
}
