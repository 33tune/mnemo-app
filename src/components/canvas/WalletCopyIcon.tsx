"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlatformIcon, PLATFORM_COLORS } from "./SocialIcons";
import { COIN_LABELS, shortWallet, type Coin } from "@/lib/wallets";
import { resolveClickAfterDrag } from "@/lib/dragClickGuard";

/** Copies text, also where the async clipboard API is missing (old Safari,
 * an http preview): a hidden textarea + execCommand. */
async function copyText(text: string): Promise<boolean> {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}

/** A wallet in the card's Íconos row (2026-11-13): a button, never a link —
 * a tap only copies the address and a bubble above the icon confirms it with
 * the short address, so the visitor can check it is the right one. Drag
 * behaves like the link icons (the wrapper starts the block drag; a click
 * that ends a drag does nothing). */
export default function WalletCopyIcon({
  address, coin, color, size, opacity, menuOpen, didDragRef,
}: {
  address: string; coin: Coin; color: string; size: number; opacity: number; menuOpen: boolean;
  didDragRef?: React.RefObject<boolean>;
}) {
  const [hov, setHov] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; ok: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const label = COIN_LABELS[coin];
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`Copiar dirección de ${label}`}
        title={`${label} · tocá para copiar`}
        data-wallet-copy=""
        onClick={async e => {
          e.stopPropagation();
          const { suppress, nextDidDrag } = resolveClickAfterDrag(didDragRef?.current ?? false);
          if (didDragRef) didDragRef.current = nextDidDrag;
          if (menuOpen || suppress) return;
          const ok = await copyText(address);
          const r = ref.current?.getBoundingClientRect();
          if (r) setTip({ x: r.left + r.width / 2, y: r.top, ok });
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setTip(null), 1800);
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: size, height: size, flexShrink: 0, padding: 0, margin: 0,
          background: "none", border: "none", cursor: "pointer", font: "inherit", color: "inherit",
          opacity: hov ? 1 : opacity, transition: "opacity 0.15s ease",
        }}
      >
        <PlatformIcon platform={coin} size={size} color={hov ? PLATFORM_COLORS[coin] : color} />
      </button>
      {tip && typeof document !== "undefined" && createPortal(
        <div role="status" style={{
          position: "fixed", left: tip.x, top: tip.y - 8, transform: "translate(-50%, -100%)", zIndex: 2147483000,
          padding: "7px 11px", borderRadius: 10, background: "rgba(14,12,18,.92)", color: "#fff",
          border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 10px 30px rgba(0,0,0,.35)",
          font: "500 12px/1.3 'DM Sans', system-ui, sans-serif", whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          {tip.ok ? <>Copiada · <span style={{ fontFamily: "'Space Mono', ui-monospace, monospace", opacity: .85 }}>{shortWallet(address)}</span></> : "No se pudo copiar"}
        </div>,
        document.body,
      )}
    </>
  );
}
