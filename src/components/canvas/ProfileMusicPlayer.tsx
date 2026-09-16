"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { MusicBlockData } from "@/types";
import { clampVolume, effectiveVolume, formatDuration } from "@/lib/musicPlayerFormat";

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";

interface Props {
  music:          MusicBlockData;
  textColor:      string;
  secondaryColor: string;
  mutedColor:     string;
}

// Stage 4.2-C.2: the real Music player — real <audio>, no autoplay (the user
// must press play). Module-level component (not nested inside ProfileCard),
// same reason as ContactLinkIcon: it owns non-trivial local state (playing,
// currentTime, duration, live volume, muted, error) that must NOT reset on
// every ProfileCard re-render.
//
// PERSISTED vs LOCAL (see MusicBlockData in types/index.ts): `music` (title/
// artist/artwork/audioUrl/sourceType/volume-as-initial-value) is the only
// thing read from ProfileCardData. `playing`/`currentTime`/`duration`/live
// `volume`/`muted`/`error` are ALL local React state — they are never
// written back to ProfileCardData, anywhere in this file. Each viewer's
// browser controls its own <audio> element independently.
//
// Drag vs controls: every interactive element here (play button, seek
// input, mute button, volume input) stops propagation on mousedown, so a
// click/drag on any of them never reaches the wrapper div in ProfileCard.tsx
// that starts the block-level drag (startMusicDrag) — mousedown on the
// PLAIN background of the player (not on a control) still bubbles up and
// drags the whole block, same as every other composed block.
function ProfileMusicPlayer({ music, textColor, secondaryColor, mutedColor }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => clampVolume(music.volume));
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const hasAudio = !!music.audioUrl?.trim();

  // A genuinely different track (owner edited the URL): local playback
  // state resets — it describes THIS audioUrl's playback, not a persistent
  // preference. Live volume/mute are intentionally NOT reset here: they're
  // the viewer's own listening preference for this session, unrelated to
  // which track happens to be configured.
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);
    audioRef.current?.pause();
  }, [music.audioUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = effectiveVolume(volume, muted);
  }, [volume, muted]);

  const stop = useCallback((e: { stopPropagation: () => void }) => e.stopPropagation(), []);

  function togglePlay(e: React.MouseEvent) {
    stop(e);
    const el = audioRef.current;
    if (!el || !hasAudio || error) return;
    if (playing) el.pause();
    else el.play().catch(() => setError(true));
  }

  function toggleMute(e: React.MouseEvent) {
    stop(e);
    setMuted(m => !m);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    setCurrentTime(t);
    const el = audioRef.current;
    if (el) el.currentTime = t;
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = clampVolume(Number(e.target.value));
    setVolume(v);
    if (v > 0 && muted) setMuted(false);
  }

  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 6, padding: "8px 10px", boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {hasAudio && (
        <audio
          ref={audioRef}
          src={music.audioUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onError={() => setError(true)}
        />
      )}

      {/* Row 1: artwork + title/artist + play/pause */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Artwork src={music.artwork} color={mutedColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: SANS, fontSize: 11, fontWeight: 600, color: textColor,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {music.title || "Untitled"}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 9, color: secondaryColor,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {music.artist || (hasAudio ? "" : "no audio set")}
          </div>
        </div>
        <button
          onMouseDown={stop}
          onClick={togglePlay}
          disabled={!hasAudio || error}
          title={playing ? "Pause" : "Play"}
          style={{
            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.08)", border: "none",
            cursor: hasAudio && !error ? "pointer" : "default",
            opacity: hasAudio && !error ? 1 : 0.4,
          }}
        >
          {playing ? <PauseIcon size={11} color={textColor} /> : <PlayIcon size={11} color={textColor} />}
        </button>
      </div>

      {/* Row 2: seek */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: mutedColor, flexShrink: 0, minWidth: 22 }}>
          {formatDuration(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onMouseDown={stop}
          onChange={handleSeek}
          disabled={!hasAudio || error}
          style={{ flex: 1, accentColor: textColor, height: 4, minWidth: 0 }}
        />
        <span style={{ fontFamily: MONO, fontSize: 8, color: mutedColor, flexShrink: 0, minWidth: 22, textAlign: "right" }}>
          {formatDuration(duration)}
        </span>
      </div>

      {/* Row 3: volume / error */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onMouseDown={stop}
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
          style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 0, flexShrink: 0 }}
        >
          <VolumeIcon size={12} color={mutedColor} muted={muted} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onMouseDown={stop}
          onChange={handleVolume}
          style={{ width: 50, accentColor: textColor, height: 4 }}
        />
        {error && (
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,100,80,0.75)", marginLeft: "auto" }}>
            couldn't load audio
          </span>
        )}
      </div>
    </div>
  );
}

// ── Artwork ────────────────────────────────────────────────────────────────
// Same fallback treatment as ProfileCard.tsx's own AvatarEl (border + faint
// tinted background + stroke icon) when there's no photo — reused visual
// language, not a new pattern. No emoji.

function Artwork({ src, color }: { src?: string; color: string }) {
  const size = 36;
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, overflow: "hidden", flexShrink: 0,
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {src ? (
        <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      )}
    </div>
  );
}

// ── Icons — plain hand-drawn SVGs, same convention as ProfileCard.tsx's own
// gear/lock/rotate icons and SocialIcons.tsx's PlatformIcon. No emoji. ──────

function PlayIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.7-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function PauseIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function VolumeIcon({ size, color, muted }: { size: number; color: string; muted: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill={color} stroke="none" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      )}
    </svg>
  );
}

export default ProfileMusicPlayer;
