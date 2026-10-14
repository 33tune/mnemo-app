"use client";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { MenuSection, SliderRow, MenuNote, UploadField } from "@/ui";
import { logoController } from "@/lib/objectControllers";

type LogoPatch = Partial<Pick<ProfileCardData, "logo">>;

interface Props {
  logo?:    ProfileCardData["logo"];
  onChange: (patch: LogoPatch) => void;
}

// CONTENT: Logo — a free visual element living inside ProfileCard's own
// bounds (Product closeout). NOT a structural block: no width/height
// resize-via-drag (there's no existing drag-resize infrastructure for
// blocks internal to ProfileCard — reusing the established "position via
// drag on canvas, size via menu slider" pattern PFP/the old Music block
// already used, not inventing a second one). Position is set by dragging
// the logo directly on the card; everything else lives here.
export default function ProfileLogoMenu({ logo, onChange }: Props) {
  // Editor v3 Phase C: every write goes through the logo controller
  // (objectControllers.ts — same patches as before, moved verbatim).
  const logoCtl = logoController(logo, onChange);

  async function handleFile(f: File) {
    const { publicUrl } = await uploadToStorage(f);
    logoCtl.setImage(publicUrl);
  }
  const deg = (v: number) => `${Math.round(v)}°`;
  const px = (v: number) => `${Math.round(v)} px`;
  const depth = (v: number) => (v < 0 ? `${v} · detrás` : v > 0 ? `+${v}` : "0");

  // Liquid glass (design menu-schema.js "logo"): Imagen (pinned upload),
  // Tamaño y giro, Profundidad — the last two wait for a logo ("Subí un
  // logo primero"). Same writes as before.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MenuSection label="Imagen" pinned>
        <UploadField kind="logo" value={logo?.url ?? null} label="Subí tu logo" caption="Logo"
          accept="image/png,image/svg+xml,image/webp,image/*" onFile={handleFile} onRemove={() => logoCtl.remove()} />
      </MenuSection>
      {logo ? (
        <>
          <MenuSection label="Tamaño y giro" icon="maximize"
            summary={`${Math.round(logo.w)} × ${Math.round(logo.h)} · ${deg(logo.rotation ?? 0)}`}>
            <SliderRow label="Ancho" icon="maximize" min={16} max={200} step={1} value={logo.w} unit="px" fmt={px} onChange={v => logoCtl.patch({ w: v })} />
            <SliderRow label="Alto" icon="height" min={16} max={200} step={1} value={logo.h} unit="px" fmt={px} onChange={v => logoCtl.patch({ h: v })} />
            <SliderRow label="Rotación" icon="rotate" min={-180} max={180} step={1} value={logo.rotation ?? 0}
              fmt={deg} onChange={v => logoCtl.patch({ rotation: v })} />
            <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={logo.opacity ?? 1}
              fmt={v => `${Math.round(v * 100)}%`} onChange={v => logoCtl.patch({ opacity: v })} />
          </MenuSection>
          <MenuSection label="Profundidad" icon="layers" summary={depth(logo.zIndex ?? 0)}>
            <SliderRow label="Profundidad" icon="layers" min={-5} max={10} step={1} value={logo.zIndex ?? 0} fmt={depth}
              onChange={v => logoCtl.patch({ zIndex: v })} />
            <MenuNote icon="move">Arrastralo sobre la tarjeta para moverlo</MenuNote>
          </MenuSection>
        </>
      ) : (
        <>
          <MenuSection label="Tamaño y giro" icon="maximize" summary="Subí un logo primero" defaultOpen={false}>
            <MenuNote>Subí un logo para ajustarlo</MenuNote>
          </MenuSection>
          <MenuSection label="Profundidad" icon="layers" summary="Subí un logo primero" defaultOpen={false}>
            <MenuNote>Subí un logo para ajustarlo</MenuNote>
          </MenuSection>
        </>
      )}
    </div>
  );
}
