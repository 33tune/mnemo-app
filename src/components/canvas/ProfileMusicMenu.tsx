"use client";
import { useRef } from "react";
import type { MusicBlockData, ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { MenuSection, MenuRow, SliderRow, TextInput, ActionButton, Toggle, Collapsible } from "@/ui";
import { MUSIC_BLOCK_WIDTH_MIN, MUSIC_BLOCK_WIDTH_DEFAULT } from "@/lib/musicBlockSizing";

type MusicPatch = Partial<Pick<ProfileCardData, "music" | "musicWidth">>;

interface Props {
  music?:          MusicBlockData;
  musicWidth?:     number;
  /** Width actually available to the block (card.w - 2*pad) — the slider's
   * ceiling, same "never exceed what the card can offer" contract every
   * other size control in this menu already follows. */
  availableWidth:  number;
  onChange:        (patch: MusicPatch) => void;
}

// Stage 4.2-C.2.3: only self-hosted audio (upload an MP3) — no URL field, no
// source-type choice, no artwork. `sourceType`/`artwork` stay in
// MusicBlockData for compatibility with data written before this stage, but
// this menu never writes or reads them anymore.
const DEFAULT_MUSIC: MusicBlockData = { sourceType: "upload", audioUrl: "" };

// DATOS: activar/configurar el bloque Music. Presencia de `card.music`
// (no un boolean aparte) es lo que activa el bloque — mismo criterio que
// Contact Links usa la presencia de `contactLinks`. Apagar el toggle hace
// `onChange({ music: undefined })`: hasMusic pasa a false, el bloque deja
// de entrar en `extraBlocks` (ProfileCard.tsx) y computeBlockLayout()/
// computeRequiredCardHeight() liberan el espacio solos — nunca se tocan
// posiciones de otros bloques a mano acá. Solo MP3 subido — sin URL,
// Spotify/YouTube/SoundCloud, ver CLAUDE.md.
export default function ProfileMusicMenu({ music, musicWidth, availableWidth, onChange }: Props) {
  const audioRef = useRef<HTMLInputElement>(null);

  function patchMusic(p: Partial<MusicBlockData>) {
    if (!music) return;
    onChange({ music: { ...music, ...p } });
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !music) return;
    const { publicUrl } = await uploadToStorage(f);
    patchMusic({ audioUrl: publicUrl, sourceType: "upload" });
    if (audioRef.current) audioRef.current.value = "";
  }

  // The slider can never exceed what the card actually has room for — same
  // clamp computeMusicNaturalSize() applies at render time, mirrored here
  // so the control itself never offers a value that would just get clamped
  // away silently.
  const widthMax = Math.max(MUSIC_BLOCK_WIDTH_MIN, availableWidth);

  return (
    // `first`: same reasoning as ProfileContactLinksMenu — this component is
    // a direct flex child of the "datos" view's gap-managed column
    // (ProfileConfigMenu.tsx), so its own leading MenuSection needs `first`
    // or its marginTop would double up on top of that flex gap.
    <MenuSection label="Music" first>
      <MenuRow label="Activar Music">
        <Toggle
          value={!!music}
          onChange={v => onChange({ music: v ? DEFAULT_MUSIC : undefined })}
        />
      </MenuRow>

      {music && (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <ActionButton onClick={() => audioRef.current?.click()}>
              {music.audioUrl ? "reemplazar MP3" : "subir MP3"}
            </ActionButton>
            {music.audioUrl && (
              <ActionButton variant="danger" onClick={() => patchMusic({ audioUrl: "" })}>quitar</ActionButton>
            )}
          </div>
          <input ref={audioRef} type="file" accept="audio/mpeg,audio/mp3,.mp3" style={{ display: "none" }} onChange={handleAudioUpload} />

          <TextInput value={music.title ?? ""} onChange={v => patchMusic({ title: v })} placeholder="Título" />
          <TextInput value={music.artist ?? ""} onChange={v => patchMusic({ artist: v })} placeholder="Artista" />

          <SliderRow
            label="Ancho" min={MUSIC_BLOCK_WIDTH_MIN} max={widthMax} step={1}
            value={musicWidth ?? MUSIC_BLOCK_WIDTH_DEFAULT} unit="px"
            onChange={v => onChange({ musicWidth: v })}
          />

          <Collapsible label="Más">
            <SliderRow
              label="Volumen inicial" min={0} max={1} step={0.01}
              value={music.volume ?? 1} fmt={v => `${Math.round(v * 100)}%`}
              onChange={v => patchMusic({ volume: v })}
            />
          </Collapsible>
        </>
      )}
    </MenuSection>
  );
}
