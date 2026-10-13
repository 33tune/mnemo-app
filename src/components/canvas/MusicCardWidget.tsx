"use client";
import { useRef, memo, type CSSProperties } from "react";
import type { MusicCardData, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import ProfileMusicPlayer from "./ProfileMusicPlayer";
import { withOpacity } from "@/lib/cardColors";
import { getFontStyle } from "@/lib/fontList";
import { getMusicCardEffects, MUSIC_DEFAULT_RADIUS, MUSIC_DEFAULT_TEXT_COLOR } from "@/lib/profileCardEffects";
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";
import { resolveOpenerSpot, resolveSideSpot } from "@/lib/openerPlacement";
import { elementEditButtonId, elementInspectorId } from "@/lib/editorSelection";
import { CanvasChromeButton } from "./CanvasChromeButton";

interface Props {
  card:              MusicCardData;
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
  /** `center`: the card's on-screen center (the rotate drag measures the
   * angle against clientX/Y — canvas coordinates are off by the view offset
   * while the dock is open). */
  onRotateMD:        (e: React.MouseEvent, center?: { x: number; y: number }) => void;
  updateCard:        (id: string, patch: Partial<MusicCardData>) => void;
  /** Editor v3 Phase G (D8): "Editar Music" opens Music's inspector in the
   * editor dock (EditorHost › MusicInspector) — the floating MenuPanel is
   * gone. `editing` = that inspector is open (aria-expanded). */
  onEdit?:           () => void;
  editing?:          boolean;
  /** Review r2: the canvas (same bounds the drag clamps to) — chrome
   * placement. */
  canvasBounds?:     { w: number; h: number; topOffset: number; left?: number };
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
}

function MusicCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, onEdit, editing, canvasBounds, locked, onToggleLock, canInteract,
  entryAnimStyle = {},
}: Props) {
  const cardRef  = useRef<HTMLDivElement>(null);
  // Review r2: chrome placement on the real canvas (never clipped, never
  // under the topbar, clear of the resize handles).
  const chromeCanvas = canvasBounds ?? { w: Number.POSITIVE_INFINITY, h: Number.POSITIVE_INFINITY, topOffset: 44 };
  const openerPos = resolveOpenerSpot(card, chromeCanvas);
  const rotateSpot = resolveSideSpot(card, chromeCanvas, 0);
  const lockSpot = resolveSideSpot(card, chromeCanvas, 1);

  // Iteration 0 (O4): getMusicCardEffects = getModuleCardEffects(card, 10),
  // the same call MobilePublicCanvas makes — parity-tested. The inspector
  // (MusicInspector.tsx) reads this effective object and writes the raw one.
  const effectiveEffects: CardEffects = getMusicCardEffects(card);

  const borderRadius = effectiveEffects.border?.radius ?? MUSIC_DEFAULT_RADIUS;
  // "Product closeout": card.textColor is the base ProfileMusicPlayer derives
  // its 3 role colors from, same withOpacity derivation ProfileCard.tsx uses.
  const musicBaseColor  = card.textColor?.startsWith("#") ? card.textColor : MUSIC_DEFAULT_TEXT_COLOR;
  const textColor       = withOpacity(musicBaseColor, 0.95);
  const secondaryColor  = withOpacity(musicBaseColor, 0.65);
  const mutedColor      = withOpacity(musicBaseColor, 0.45);

  const { onMouseMove: onInteractMove, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>);

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={onMouseDown}
        onMouseMove={onInteractMove}
        onMouseLeave={onInteractLeave}
        onClick={onClick}
        style={{
          position: "absolute", left: card.x, top: card.y, width: card.w, height: card.h,
          zIndex: card.zIndex + card.layer * 100 + (isSel ? SELECTION_Z_BOOST : 0), transform: `${parallaxTransform} rotate(${card.rotation}deg)`,
          willChange: "transform", userSelect: "none",
          cursor: draggingId === card.id ? "grabbing" : "grab",
          ...entryAnimStyle,
        }}
      >
        <CardLayers cardId={card.id} effects={effectiveEffects} isSel={isSel} borderRadius={borderRadius}>
          {/* "Product closeout": Music is now an independent canvas element —
              same real player ProfileCard used internally (ProfileMusicPlayer.tsx,
              self-hosted MP3 only), not the old Spotify/YouTube link-preview.
              Position/drag/resize/z-index/persistence are entirely the
              generic top-level element engine (useDragDrop.ts) already gives
              every canvas element — nothing new here. */}
          <div data-canvas-hot="" style={{ position: "absolute", inset: 0, borderRadius, overflow: "hidden" }}>
            <ProfileMusicPlayer
              music={{ sourceType: "upload", audioUrl: card.audioUrl ?? "", title: card.title, artist: card.artist, volume: card.volume }}
              textColor={textColor} secondaryColor={secondaryColor} mutedColor={mutedColor}
              textSize={card.textSize} fontFamily={card.font ? getFontStyle(card.font) : undefined}
            />
          </div>
        </CardLayers>

        {/* Iteration 0: "Editar" / lock / rotate are real 24px <button>s
            (were 16-20px divs; the gear covered the nw resize handle and the
            rotate dot the ne one). Placed by resolveOpenerSpot / resolveSideSpot;
            lock + rotate sit outside the right edge, clear of the ne/e
            handles' 24px target circles. */}
        {isSel && canInteract && onEdit && (
          <CanvasChromeButton
            id={elementEditButtonId(card.id)}
            icon="pencil"
            label="Editar Music"
            expanded={!!editing}
            controls={editing ? elementInspectorId(card.id) : undefined}
            style={{ top: openerPos.top, left: openerPos.left }}
            onActivate={() => onEdit()}
          />
        )}

        {isSel && canInteract && !locked && (
          <CanvasChromeButton
            icon="rotate"
            label="Rotar Music (arrastrar; Enter gira 15°)"
            style={{ top: rotateSpot.top, left: rotateSpot.left }}
            onMouseDown={e => { const r = cardRef.current?.getBoundingClientRect(); onRotateMD(e, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined); }}
            onActivate={e => { if (e.detail === 0) updateCard(card.id, { rotation: Math.round(((card.rotation ?? 0) + 15) % 360) }); }}
          />
        )}

        {isSel && canInteract && onToggleLock && (
          <CanvasChromeButton
            icon={locked ? "lock" : "unlock"}
            label={locked ? "Desbloquear Music" : "Bloquear Music"}
            pressed={!!locked}
            style={{ top: lockSpot.top, left: lockSpot.left }}
            onActivate={() => onToggleLock()}
          />
        )}

        {isSel && canInteract && !locked && <ResizeHandles onResizeMD={onResizeMD} />}
      </div>
    </>
  );
}

export default memo(MusicCardWidget);
