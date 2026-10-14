"use client";
import React, { useRef, useState } from "react";
import { Icon } from "./icons";
import { refocusFieldControl } from "./MenuRow";

export type UploadKind = "avatar" | "cover" | "logo" | "audio" | "font" | "cursor";

interface UploadFieldProps {
  kind:      UploadKind;
  /** The current file (URL or name); empty = nothing uploaded yet. */
  value?:    string | null;
  /** Visible name of the current file (defaults to the URL's last segment). */
  name?:     string;
  /** Second line under the name ("Foto de perfil", "MP3", "GIF"). */
  caption?:  string;
  /** Empty-state call to action ("Subir foto", "Subí tu logo"). */
  label:     string;
  accept:    string;
  onFile:    (file: File) => void;
  /** Absent = the file cannot be removed here (e.g. an image element). */
  onRemove?: () => void;
  /** Empty state as a compact 44px pill instead of the big drop zone. */
  compact?:  boolean;
  /** Accessible name of the hidden file input / replace button context. */
  ariaLabel?: string;
  disabled?: boolean;
}

const DEFAULT_CAPTION: Record<UploadKind, string> = {
  avatar: "Foto de perfil", cover: "Imagen", logo: "Logo", audio: "MP3", font: "Fuente propia", cursor: "Cursor PNG",
};
const fileName = (v: string) => (v.startsWith("blob:") || v.startsWith("data:") ? "Archivo subido" : decodeURIComponent(v.split("?")[0].split("/").pop() || "Archivo"));

// Liquid glass (DS upload row, L3): with a file — a well with its thumbnail
// (round photo, cover, contained logo, a disc for audio, "Aa" for a font),
// its name and kind, "Reemplazar" (upload) and "Quitar" (trash, danger);
// empty — a dashed drop zone "Subir … o soltalo acá" (or a compact pill).
// Files can be dropped on it. The real <input type=file> stays in the DOM.
export function UploadField({ kind, value, name, caption, label, accept, onFile, onRemove, compact, ariaLabel, disabled }: UploadFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const has = !!value;
  const pick = () => { if (!disabled) input.current?.click(); };
  const take = (f: File | undefined | null) => { if (f && !disabled) onFile(f); };
  const image = has && (kind === "avatar" || kind === "cover" || kind === "logo" || kind === "cursor");
  const drop = {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.stopPropagation(); setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(false); take(e.dataTransfer.files?.[0]); },
  };
  return (
    <div className="mn-upload">
      <input ref={input} type="file" accept={accept} hidden aria-label={ariaLabel ?? label}
        onChange={e => { take(e.target.files?.[0]); e.target.value = ""; }} />
      {has ? (
        <div className="mn-upload__row" {...drop} data-over={over || undefined}>
          <span className="mn-upload__thumb" data-kind={kind} aria-hidden>
            {image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={value!} alt="" draggable={false} />
              : kind === "audio" ? <Icon name="disc" size={20} /> : kind === "font" ? "Aa" : <Icon name="image" size={20} />}
          </span>
          <span className="mn-upload__text">
            <span className="mn-upload__name">{name ?? fileName(value!)}</span>
            <span className="mn-upload__caption">{caption ?? DEFAULT_CAPTION[kind]}</span>
          </span>
          <button type="button" className="mn-iconbtn mn-iconbtn--filled" aria-label={`Reemplazar ${caption ?? DEFAULT_CAPTION[kind]}`} title="Reemplazar"
            style={{ width: 40, height: 40 }} disabled={disabled}
            onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); pick(); }}>
            <Icon name="upload" size={17} />
          </button>
          {onRemove && (
            <button type="button" className="mn-iconbtn" data-tone="danger" aria-label={`Quitar ${caption ?? DEFAULT_CAPTION[kind]}`} title="Quitar"
              style={{ width: 40, height: 40 }} disabled={disabled}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); const el = e.currentTarget; onRemove(); refocusFieldControl(el); }}>
              <Icon name="trash" size={17} />
            </button>
          )}
        </div>
      ) : compact ? (
        <button type="button" className="mn-btn mn-btn--secondary" style={{ width: "100%" }} disabled={disabled} {...drop}
          onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); pick(); }}>
          <Icon name="upload" size={15} />{label}
        </button>
      ) : (
        <button type="button" className="mn-drop" data-over={over || undefined} disabled={disabled} {...drop}
          onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); pick(); }}>
          <span className="mn-drop__ico" aria-hidden><Icon name="upload" size={18} /></span>
          <span className="mn-drop__label">{label}</span>
          <span>o soltalo acá</span>
        </button>
      )}
    </div>
  );
}
