"use client";
import { useState, useRef, memo } from "react";
import { trackRender } from "@/lib/perfDebug";
import type { CanvasGallery, GalleryImage } from "@/types";
import { uploadToStorage } from "@/lib/storage";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

interface Props {
  gallery:           CanvasGallery;
  isSel:             boolean;
  multiSel:          boolean;
  draggingId:        string | null;
  onMouseDown:       (id: string, type: "image"|"card"|"text"|"gallery", x: number, y: number, e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (id: string, type: "image"|"card"|"text"|"gallery", e: React.MouseEvent) => void;
  onRotateMD:        (id: string, type: "image"|"card"|"text"|"gallery", e: React.MouseEvent, cx?: number, cy?: number) => void;
  updateGallery:     (id: string, patch: Partial<CanvasGallery>) => void;
  onDropToCanvas:    (src: string, x: number, y: number) => void;
  parallaxTransform: string;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
}

function GalleryWidget({
  gallery, isSel, multiSel, draggingId,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateGallery, onDropToCanvas, parallaxTransform, locked, onToggleLock, canInteract,
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("GalleryWidget");
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const [hovLayer, setHovLayer] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addImages(files: FileList | null) {
    if (!files) return;
    const newImgs: GalleryImage[] = [];
    for (const f of Array.from(files)) {
      const src = await uploadToStorage(f);
      newImgs.push({ id: crypto.randomUUID(), src, name: f.name });
    }
    updateGallery(gallery.id, { images: [...gallery.images, ...newImgs] });
  }

  function removeImage(imgId: string) {
    updateGallery(gallery.id, { images: gallery.images.filter(i => i.id !== imgId) });
  }

  const borderRadius = (gallery as any).borderRadius ?? 16;

  return (
    <>
      <div
        style={{
          position: "absolute", left: gallery.x, top: gallery.y,
          width: gallery.w,
          zIndex: gallery.zIndex + gallery.layer * 100,
          transform: `${parallaxTransform} rotate(${gallery.rotation}deg)`,
          willChange: "transform",
          userSelect: "none",
          cursor: draggingId === gallery.id ? "grabbing" : "grab",
        }}
        onMouseDown={e => onMouseDown(gallery.id, "gallery", gallery.x, gallery.y, e)}
        onClick={onClick}
      >
        {/* Fondo glassmorphism */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: isSel
            ? "1px solid rgba(255,255,255,0.2)"
            : "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }} />

        {/* Header — drag handle */}
        <div
          onMouseDown={e => onMouseDown(gallery.id, "gallery", gallery.x, gallery.y, e)}
          style={{
            position: "relative", zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px 8px",
            cursor: draggingId === gallery.id ? "grabbing" : "grab",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
              GALLERY
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.15)" }}>
              {gallery.images.length}
            </span>
          </div>

          {/* Botón agregar */}
          {canInteract && <div onMouseDown={e => e.stopPropagation()}>
            <button
              onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              style={{
                width: 22, height: 22, borderRadius: 6, border: "none",
                background: "rgba(255,255,255,0.07)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.4)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>}
        </div>

        {/* Grid — siempre 3 columnas, scroll vertical */}
        <div
          style={{
            position: "relative", zIndex: 2,
            padding: "0 10px 10px",
            overflowY: "auto",
            maxHeight: "60vh",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {gallery.images.length === 0 ? (
            canInteract ? <div
              onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 8, height: 80, borderRadius: 10,
                border: "1px dashed rgba(255,255,255,0.1)",
                cursor: "pointer", opacity: 0.5,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase" }}>
                add images
              </span>
            </div> : null
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {gallery.images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    position: "relative", aspectRatio: "1",
                    borderRadius: 8, overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => {
                    const del = e.currentTarget.querySelector(".del-btn") as HTMLElement;
                    const ov  = e.currentTarget.querySelector(".img-ov") as HTMLElement;
                    if (del) del.style.opacity = "1";
                    if (ov)  ov.style.opacity  = "1";
                  }}
                  onMouseLeave={e => {
                    const del = e.currentTarget.querySelector(".del-btn") as HTMLElement;
                    const ov  = e.currentTarget.querySelector(".img-ov") as HTMLElement;
                    if (del) del.style.opacity = "0";
                    if (ov)  ov.style.opacity  = "0";
                  }}
                >
                  <img
                    src={img.src}
                    draggable
                    onDragStart={e => e.dataTransfer.setData("gallery-image-src", img.src)}
                    onClick={e => { e.stopPropagation(); setLightbox(img); }}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* Overlay hover */}
                  <div className="img-ov" style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0.3)",
                    opacity: 0, transition: "opacity 0.15s",
                    pointerEvents: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  {/* Botón eliminar */}
                  {canInteract && <button
                    className="del-btn"
                    onClick={e => { e.stopPropagation(); removeImage(img.id); }}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      width: 18, height: 18, borderRadius: "50%",
                      border: "none", background: "rgba(0,0,0,0.7)",
                      color: "rgba(255,255,255,0.8)", cursor: "pointer",
                      opacity: 0, transition: "opacity 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, lineHeight: 1,
                    }}
                  >×</button>}
                </div>
              ))}

              {/* Celda agregar más */}
              {canInteract && <div
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                style={{
                  aspectRatio: "1", borderRadius: 8,
                  border: "1px dashed rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", opacity: 0.4, transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>}
            </div>
          )}
        </div>

        {/* Panel contextual al seleccionar */}
        {isSel && canInteract && !multiSel && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: "calc(100% + 10px)", left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(10,10,12,0.97)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "10px 12px",
              backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
              zIndex: 500, boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", gap: 10,
              whiteSpace: "nowrap",
            }}
          >
            {/* Opacidad */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.25)" }}>OP</span>
              <input type="range" min={10} max={100}
                value={Math.round(((gallery as any).opacity ?? 1) * 100)}
                onChange={e => updateGallery(gallery.id, { opacity: Number(e.target.value) / 100 } as any)}
                style={{ width: 60, accentColor: "rgba(212,240,196,0.7)" }} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.35)", minWidth: 24 }}>
                {Math.round(((gallery as any).opacity ?? 1) * 100)}
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

            {/* Border radius */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.25)" }}>RD</span>
              <input type="range" min={0} max={32}
                value={borderRadius}
                onChange={e => updateGallery(gallery.id, { borderRadius: Number(e.target.value) } as any)}
                style={{ width: 60, accentColor: "rgba(212,240,196,0.7)" }} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.35)", minWidth: 24 }}>
                {borderRadius}
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

            {/* Capa */}
            <div
              style={{ display: "flex", gap: 4, padding: 4, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, backdropFilter: "blur(6px)" }}
              onMouseDown={e => e.stopPropagation()}
            >
              {([0, 1, 2] as const).map(l => (
                <div key={l}
                  onClick={e => { e.stopPropagation(); updateGallery(gallery.id, { layer: l }); }}
                  onMouseEnter={() => setHovLayer(l)}
                  onMouseLeave={() => setHovLayer(null)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: "1px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    background: gallery.layer === l ? "white" : "transparent",
                    color: gallery.layer === l ? "black" : "rgba(255,255,255,0.4)",
                    opacity: hovLayer === l ? 1 : undefined,
                    transform: hovLayer === l ? "scale(1.05)" : undefined,
                  }}>
                  {["FO", "ME", "FR"][l]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Handles */}
        {isSel && canInteract && !multiSel && (
          <>
            {/* Rotate handle */}
            {!locked && <div
              onMouseDown={e => {
                e.stopPropagation();
                const el = e.currentTarget.parentElement;
                if (el) {
                  const r = el.getBoundingClientRect();
                  onRotateMD(gallery.id, "gallery", e, r.left + r.width / 2, r.top + r.height / 2);
                } else {
                  onRotateMD(gallery.id, "gallery", e);
                }
              }}
              style={{
                position: "absolute", top: -10, right: -10,
                width: 20, height: 20, borderRadius: "50%",
                background: "rgba(12,12,14,0.96)", border: "1px solid rgba(255,255,255,0.1)",
                cursor: "crosshair", zIndex: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)", transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,240,196,0.4)"; e.currentTarget.style.background = "rgba(212,240,196,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(12,12,14,0.96)"; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/>
              </svg>
            </div>}

            {/* Lock toggle */}
            {onToggleLock && (
              <div
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onToggleLock(); }}
                style={{
                  position: "absolute", top: -22, right: 0,
                  width: 16, height: 16, borderRadius: 4, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: locked ? "rgba(255,180,60,0.15)" : "rgba(255,255,255,0.06)",
                  border: locked ? "1px solid rgba(255,180,60,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  color: locked ? "rgba(255,180,60,0.9)" : "rgba(255,255,255,0.32)",
                }}
              >
                {locked ? (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ) : (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                )}
              </div>
            )}
            {/* Resize handle */}
            {!locked && (
              <div
                onMouseDown={e => onResizeMD(gallery.id, "gallery", e)}
                style={{
                  position: "absolute", bottom: -5, right: -5,
                  width: 10, height: 10, borderRadius: "50%",
                  background: "rgba(255,255,255,0.65)", cursor: "nwse-resize",
                  border: "1.5px solid rgba(0,0,0,0.2)", zIndex: 30,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(12px)",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={lightbox.src}
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, display: "block" }}
            />
            <div style={{
              position: "absolute", bottom: -28, left: 0,
              fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)",
              letterSpacing: 1, textTransform: "uppercase",
            }}>
              {lightbox.name}
            </div>
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: "absolute", top: -14, right: -14,
                width: 28, height: 28, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(10,10,12,0.95)",
                color: "rgba(255,255,255,0.6)", fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
            {/* Hint arrastrar al canvas */}
            <div
              draggable
              onDragStart={e => e.dataTransfer.setData("gallery-image-src", lightbox.src)}
              style={{
                position: "absolute", bottom: -52, left: "50%", transform: "translateX(-50%)",
                padding: "4px 12px", borderRadius: 20,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)",
                letterSpacing: 1.5, textTransform: "uppercase", cursor: "grab",
                whiteSpace: "nowrap",
              }}>
              arrastrar al canvas
            </div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={async e => { await addImages(e.target.files); if (fileRef.current) fileRef.current.value = ""; }} />
    </>
  );
}

function areGalleryPropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.gallery           === next.gallery &&
    prev.isSel             === next.isSel &&
    prev.multiSel          === next.multiSel &&
    prev.draggingId        === next.draggingId &&
    prev.locked            === next.locked &&
    prev.canInteract       === next.canInteract &&
    prev.parallaxTransform === next.parallaxTransform
  );
}
export default memo(GalleryWidget, areGalleryPropsEqual);
