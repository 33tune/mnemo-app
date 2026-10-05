"use client";
import type { ProfileCardData, BlockStyleKey, BlockStyleOverride } from "@/types";
import { resolveBlockStyle } from "@/lib/blockStyle";
import { mergePatch } from "@/lib/effectPause";
import { Collapsible, MenuRow, MenuNote, ColorRow, SliderRow, Toggle } from "@/ui";

interface Props {
  /** Needs the FULL card.blockStyle (not just this block's slice) — patching
   * only ever replaces the whole `blockStyle` field (same shallow-merge
   * contract every other updateProfile() patch uses), so writing just one
   * block's override without the others already set would silently drop
   * them. See the `set()` merge below. */
  card:           Pick<ProfileCardData, "blockStyle" | "blockStylePaused">;
  blockKey:       BlockStyleKey;
  showTextColor?: boolean;
  showIconColor?: boolean;
  onChange:       (patch: Pick<ProfileCardData, "blockStyle" | "blockStylePaused">) => void;
}

// Stage FASE 2 (Personalization UI/UX): the one reusable editor for every
// block's blockStyle override (Identity/Location/Views/Contact Links/Music
// — see blockStyle.ts, Stage FASE 1). A single Toggle is the entire
// inherit-vs-override signal the user asked for: off = "this block inherits
// ProfileCard's own look" (fields hidden, MenuNote says so explicitly), on =
// "this block has its own override" (fields shown, same note confirms it).
// Deliberately no width/height/padding/border controls here — see
// blockStyle.ts's header for why those stay out of scope.
export default function BlockStyleFields({ card, blockKey, showTextColor, showIconColor, onChange }: Props) {
  const raw = card.blockStyle?.[blockKey];
  const active = !!raw;
  const resolved = resolveBlockStyle(card, blockKey);

  function set(next: BlockStyleOverride | undefined) {
    onChange({ blockStyle: { ...card.blockStyle, [blockKey]: next } });
  }
  // Block 1 ("apagar no borra"): OFF moves this block's override into
  // card.blockStylePaused instead of deleting it; ON restores it (or starts
  // empty when nothing was stashed). Never in both places at once.
  function setActive(on: boolean) {
    if (on) {
      const stashed = card.blockStylePaused?.[blockKey];
      onChange({
        blockStyle: { ...card.blockStyle, [blockKey]: stashed ?? {} },
        blockStylePaused: mergePatch(card.blockStylePaused, { [blockKey]: undefined }),
      });
    } else {
      onChange({
        blockStyle: mergePatch(card.blockStyle, { [blockKey]: undefined }),
        blockStylePaused: raw ? { ...card.blockStylePaused, [blockKey]: raw } : card.blockStylePaused,
      });
    }
  }
  function patch(p: Partial<BlockStyleOverride>) {
    set({ ...raw, ...p });
  }
  // Block 2: reset = delete the raw key (never store undefined).
  function reset(key: keyof BlockStyleOverride) {
    set(mergePatch(raw, { [key]: undefined }));
  }
  function fieldState(key: keyof BlockStyleOverride) {
    return raw?.[key] !== undefined ? "modified" as const : "inherited" as const;
  }

  return (
    <Collapsible label="Estilo" defaultOpen={active}>
      <MenuRow label="Personalizar este bloque">
        <Toggle value={active} onChange={setActive} />
      </MenuRow>
      <MenuNote>
        {active ? "Estilo personalizado para este bloque." : "Hereda el estilo de la card de presentación."}
      </MenuNote>
      {active && (
        <>
          <ColorRow
            label="Fondo" value={raw?.bg} onChange={v => patch({ bg: v })}
            clearable={!!raw?.bg} onClear={() => reset("bg")}
            state={fieldState("bg")} onReset={() => reset("bg")}
          />
          {showTextColor && (
            <ColorRow
              label="Color de texto" value={raw?.textColor} onChange={v => patch({ textColor: v })}
              clearable={!!raw?.textColor} onClear={() => reset("textColor")}
              state={fieldState("textColor")} onReset={() => reset("textColor")}
            />
          )}
          {showIconColor && (
            <ColorRow
              label="Color de ícono" value={raw?.iconColor} onChange={v => patch({ iconColor: v })}
              clearable={!!raw?.iconColor} onClear={() => reset("iconColor")}
              state={fieldState("iconColor")} onReset={() => reset("iconColor")}
            />
          )}
          <SliderRow label="Radio" min={0} max={24} step={1} value={resolved.radius} unit="px" onChange={v => patch({ radius: v })}
            state={raw?.radius !== undefined ? "modified" : undefined} onReset={() => reset("radius")} />
        </>
      )}
    </Collapsible>
  );
}
