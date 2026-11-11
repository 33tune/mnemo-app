"use client";
/**
 * Perfil público en compu (2026-11-06, pedido del usuario): reemplaza la
 * barra vieja de arriba (myLand · fecha · hora · @usuario) por la pastilla
 * del editor — flecha para volver, logo, myLand y el @usuario. La flecha
 * vuelve a la página anterior si se llegó desde myLand; si se entró directo
 * con el link, lleva al inicio.
 */
import { useRouter } from "next/navigation";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { T } from "@/ui";

export default function PublicBrandPill({ handle }: { handle?: string }) {
  const router = useRouter();
  const back = () => {
    let sameSite = false;
    try { sameSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch { /* no referrer */ }
    if (sameSite && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    // The editor's capsule styles apply inside a [data-mnemo-ui] surface.
    <div {...{ [EDITOR_UI_ATTR]: "" }} data-export-skip=""
      style={{ position: "fixed", top: 0, left: 0, zIndex: 2147480000, fontFamily: T.uiFont.sans }}>
    <div className="mn-capsule mn-capsule--brand" style={{ position: "fixed", top: T.ui.size.dockMargin, left: T.ui.size.dockMargin, paddingLeft: 4 }}>
      <button type="button" className="mn-gbtn" onClick={back} aria-label="Volver" title="Volver">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <img src="/logo.png" alt="" width={34} height={34} draggable={false} className="mn-capsule__logo" />
      <span className="mn-capsule__name">myLand</span>
      {handle && <span className="mn-capsule__path">@{handle}</span>}
    </div>
    </div>
  );
}
