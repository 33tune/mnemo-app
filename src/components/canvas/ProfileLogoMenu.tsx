"use client";
import { useRef } from "react";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { MenuSection, SliderRow, ActionButton, MenuNote } from "@/ui";

type LogoPatch = Partial<Pick<ProfileCardData, "logo">>;

interface Props {
  logo?:    ProfileCardData["logo"];
  onChange: (patch: LogoPatch) => void;
}

const DEFAULT_LOGO_SIZE = 48;

// CONTENT: Logo — a free visual element living inside ProfileCard's own
// bounds (Product closeout). NOT a structural block: no width/height
// resize-via-drag (there's no existing drag-resize infrastructure for
// blocks internal to ProfileCard — reusing the established "position via
// drag on canvas, size via menu slider" pattern PFP/the old Music block
// already used, not inventing a second one). Position is set by dragging
// the logo directly on the card; everything else lives here.
export default function ProfileLogoMenu({ logo, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function patchLogo(p: Partial<NonNullable<ProfileCardData["logo"]>>) {
    if (!logo) return;
    onChange({ logo: { ...logo, ...p } });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    if (logo) {
      patchLogo({ url: publicUrl });
    } else {
      // Sensible default: top-right corner, modest size — never a
      // structural placement decision (no computeBlockLayout involved).
      onChange({ logo: { url: publicUrl, anchorX: 0.85, anchorY: 0.15, w: DEFAULT_LOGO_SIZE, h: DEFAULT_LOGO_SIZE, opacity: 1, rotation: 0, zIndex: 1 } });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <MenuSection label="Logo" first>
      {!logo ? (
        <ActionButton onClick={() => fileRef.current?.click()} fullWidth>subir logo</ActionButton>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <ActionButton onClick={() => fileRef.current?.click()}>reemplazar imagen</ActionButton>
            <ActionButton variant="danger" onClick={() => onChange({ logo: undefined })}>quitar</ActionButton>
          </div>

          <SliderRow label="Ancho" min={16} max={200} step={1} value={logo.w} unit="px" onChange={v => patchLogo({ w: v })} />
          <SliderRow label="Alto" min={16} max={200} step={1} value={logo.h} unit="px" onChange={v => patchLogo({ h: v })} />
          <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={logo.opacity ?? 1}
            fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchLogo({ opacity: v })} />
          <SliderRow label="Rotación" min={-180} max={180} step={1} value={logo.rotation ?? 0}
            fmt={v => `${v}°`} onChange={v => patchLogo({ rotation: v })} />
          <SliderRow label="Profundidad" min={-5} max={10} step={1} value={logo.zIndex ?? 0}
            onChange={v => patchLogo({ zIndex: v })} />
          <MenuNote>
            Arrastrá el logo directamente sobre la card para moverlo. Profundidad negativa lo manda detrás del resto de los elementos.
          </MenuNote>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/webp,image/*" style={{ display: "none" }} onChange={handleUpload} />
    </MenuSection>
  );
}
