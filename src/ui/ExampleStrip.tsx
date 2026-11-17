"use client";
import React from "react";

/**
 * Menu redesign (2026-11-17, "ejemplos en lo vacío"): where nothing has been
 * added yet (the room's wallpaper, stickers, links, buttons), a row of real
 * examples you can tap to try instead of an empty "Vacía". Each example is a
 * small picture (an image or a drawing) with its name as tooltip / label.
 */
export interface Example { id: string; label: string; image?: string; node?: React.ReactNode }

export function ExampleStrip({ examples, onPick, label, wide }: {
  examples: Example[]; onPick: (id: string) => void; label: string;
  /** Wide (16:9) tiles — wallpapers. */
  wide?: boolean;
}) {
  return (
    <div className="mn-examples" role="group" aria-label={label} data-wide={wide || undefined}>
      {examples.map(x => (
        <button key={x.id} type="button" className="mn-example" title={x.label} aria-label={`${label}: ${x.label}`}
          onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onPick(x.id); }}>
          {x.image ? <img src={x.image} alt="" draggable={false} /> : x.node}
        </button>
      ))}
    </div>
  );
}
