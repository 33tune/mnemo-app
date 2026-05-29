"use client";
import type { ResizeHandle } from "@/hooks/useDragDrop";

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n:  "ns-resize",
  ne: "nesw-resize",
  e:  "ew-resize",
  se: "nwse-resize",
  s:  "ns-resize",
  sw: "nesw-resize",
  w:  "ew-resize",
};

// Position as % from top-left of the element
const HANDLE_POSITIONS: Record<ResizeHandle, { left: string; top: string; transform: string }> = {
  nw: { left: "0%",   top: "0%",   transform: "translate(-50%, -50%)" },
  n:  { left: "50%",  top: "0%",   transform: "translate(-50%, -50%)" },
  ne: { left: "100%", top: "0%",   transform: "translate(-50%, -50%)" },
  e:  { left: "100%", top: "50%",  transform: "translate(-50%, -50%)" },
  se: { left: "100%", top: "100%", transform: "translate(-50%, -50%)" },
  s:  { left: "50%",  top: "100%", transform: "translate(-50%, -50%)" },
  sw: { left: "0%",   top: "100%", transform: "translate(-50%, -50%)" },
  w:  { left: "0%",   top: "50%",  transform: "translate(-50%, -50%)" },
};

const ALL_HANDLES: ResizeHandle[] = ["nw","n","ne","e","se","s","sw","w"];

interface Props {
  onResizeMD: (handle: ResizeHandle, e: React.MouseEvent) => void;
  light?: boolean;
}

export default function ResizeHandles({ onResizeMD, light }: Props) {
  const dotColor = light ? "rgba(20,20,20,0.55)" : "rgba(255,255,255,0.75)";
  const dotBorder = light ? "1.5px solid rgba(255,255,255,0.35)" : "1.5px solid rgba(0,0,0,0.25)";

  return (
    <>
      {ALL_HANDLES.map(handle => {
        const pos = HANDLE_POSITIONS[handle];
        return (
          <div
            key={handle}
            onMouseDown={e => { e.stopPropagation(); onResizeMD(handle, e); }}
            style={{
              position:     "absolute",
              left:         pos.left,
              top:          pos.top,
              transform:    pos.transform,
              width:        9,
              height:       9,
              borderRadius: "50%",
              background:   dotColor,
              border:       dotBorder,
              cursor:       HANDLE_CURSORS[handle],
              zIndex:       11,
              pointerEvents:"all",
            }}
          />
        );
      })}
    </>
  );
}
