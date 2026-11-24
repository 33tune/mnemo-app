"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";

/**
 * First publish guide (2026-11-24): people edited their card for minutes and
 * left without "Publicar" — their link showed an empty card. Once per browser
 * (PUBLISH_HINT_KEY) and only for someone who never published: after a few
 * edits a bubble points at the Publicar button (which pulses) and says what it
 * does. Publishing or "Después" closes it for good.
 */
export const PUBLISH_HINT_KEY = "mnemo_publish_hint_v1";
export function publishHintSeen(): boolean {
  try { return localStorage.getItem(PUBLISH_HINT_KEY) === "1"; } catch { return true; }
}
export function markPublishHintSeen() {
  try { localStorage.setItem(PUBLISH_HINT_KEY, "1"); } catch { /* private mode: shows again next time */ }
}

export default function PublishHint({ handle, onPublish, onLater }: { handle: string; onPublish: () => void; onLater: () => void }) {
  const [box, setBox] = useState<{ top: number; right: number; arrow: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const btn = document.querySelector<HTMLElement>('[data-tour="publish"]');
      if (!btn) { setBox(null); return; }
      const r = btn.getBoundingClientRect(); const right = Math.max(10, window.innerWidth - r.right - 4);
      setBox({ top: r.bottom + 12, right, arrow: Math.max(18, Math.min(window.innerWidth - right - r.left - r.width / 2, 300)) });
    };
    place(); window.addEventListener("resize", place);
    const id = window.setInterval(place, 600);
    return () => { window.removeEventListener("resize", place); window.clearInterval(id); };
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-publish-hint", "");
    return () => document.documentElement.removeAttribute("data-publish-hint");
  }, []);
  if (!box) return null;
  return (
    <div {...{ [EDITOR_UI_ATTR]: "" }} className="mn-pubhint" role="status" style={{ top: box.top, right: box.right }}>
      <span className="mn-pubhint__arrow" style={{ right: box.arrow - 8 }} aria-hidden="true" />
      <strong>Tu card todavía no se ve</strong>
      <span>Tocá <b>Publicar</b> para que <b>myland.lol/{handle}</b> la muestre. Lo que cambies después, también se publica así.</span>
      <div className="mn-pubhint__row">
        <button type="button" className="mn-pubhint__later" onClick={onLater}>Después</button>
        <button type="button" className="mn-pubhint__go" onClick={onPublish}>Publicar</button>
      </div>
    </div>
  );
}
