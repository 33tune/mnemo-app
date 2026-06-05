"use client";
import { useState, useRef } from "react";
import type { CanvasElement } from "@/types";

export type ResizeHandle = "nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w";

type WidgetType = "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"|"social"|"music"|"links";

export type DragTarget   = { type: WidgetType; id: string };
export type ResizeTarget =
  | { type: WidgetType; id: string; handle: ResizeHandle }
  | { type: "group" };
export type RotateTarget = {
  type: WidgetType;
  id: string; cx: number; cy: number;
  startAngle: number; startRotation: number;
};

export type DragUpResult = {
  wasDeleted: boolean;
  moved: Array<{ id: string; type: WidgetType; x: number; y: number; startX: number; startY: number }>;
  rotated: { id: string; type: WidgetType; rotation: number } | null;
  resized: { id: string; type: WidgetType; w?: number; h?: number; size?: number; x?: number; y?: number } | null;
};

type GroupBoundsItem = { id: string; x: number; y: number; w: number; h: number };

interface Options {
  elements:       CanvasElement[];
  setElements:    React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  trashRef:       React.RefObject<HTMLDivElement>;
  canvasBounds?:  { w: number; h: number; topOffset: number };
}

function angleBetween(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(py - cy, px - cx) * (180 / Math.PI);
}

// Per-handle resize delta computation — returns new position and size
function computeResize(
  handle: ResizeHandle,
  dx: number, dy: number,
  startW: number, startH: number,
  startX: number, startY: number,
  ratio: number,   // h/w aspect ratio for images (0 = ignore)
  isImage: boolean,
  minW: number, minH: number,
): { nx: number; ny: number; nw: number; nh: number } {
  let nw = startW, nh = startH, nx = startX, ny = startY;

  if (isImage && ratio > 0) {
    // Images: corners maintain ratio, sides free
    switch (handle) {
      case "se": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, Math.round(nw * ratio)); break; }
      case "ne": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, Math.round(nw * ratio)); ny = startY + (startH - nh); break; }
      case "sw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, Math.round(nw * ratio)); nx = startX + (startW - nw); break; }
      case "nw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, Math.round(nw * ratio)); nx = startX + (startW - nw); ny = startY + (startH - nh); break; }
      case "e":  { nw = Math.max(minW, startW + dx); break; }
      case "w":  { nw = Math.max(minW, startW - dx); nx = startX + (startW - nw); break; }
      case "s":  { nh = Math.max(minH, startH + dy); break; }
      case "n":  { nh = Math.max(minH, startH - dy); ny = startY + (startH - nh); break; }
    }
  } else {
    switch (handle) {
      case "se": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, startH + dy); break; }
      case "e":  { nw = Math.max(minW, startW + dx); break; }
      case "s":  { nh = Math.max(minH, startH + dy); break; }
      case "sw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, startH + dy); nx = startX + (startW - nw); break; }
      case "n":  { nh = Math.max(minH, startH - dy); ny = startY + (startH - nh); break; }
      case "ne": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, startH - dy); ny = startY + (startH - nh); break; }
      case "nw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, startH - dy); nx = startX + (startW - nw); ny = startY + (startH - nh); break; }
      case "w":  { nw = Math.max(minW, startW - dx); nx = startX + (startW - nw); break; }
    }
  }
  return { nx, ny, nw, nh };
}

export function useDragDrop({
  elements, setElements,
  trashRef,
  canvasBounds,
}: Options) {
  const [dragging,  setDragging]  = useState<DragTarget | null>(null);
  const [resizing,  setResizing]  = useState<ResizeTarget | null>(null);
  const [rotating,  setRotating]  = useState<RotateTarget | null>(null);
  const [overTrash, setOverTrash] = useState(false);

  const didDrag      = useRef(false);
  const dragOffset   = useRef({ x: 0, y: 0 });
  const resizeStart  = useRef({ x: 0, y: 0, w: 0, h: 0, ex: 0, ey: 0, handle: "se" as ResizeHandle, ratio: 0, items: [] as GroupBoundsItem[] });
  const dragStartPos = useRef<Record<string, { x: number; y: number }>>({});
  const lastRotation = useRef(0);
  const lastResize   = useRef<{ w?: number; h?: number; size?: number; x?: number; y?: number }>({});

  function startDrag(
    id: string,
    type: WidgetType,
    x: number, y: number,
    e: React.MouseEvent,
    selectedIds: Set<string>
  ) {
    didDrag.current = false;
    dragOffset.current = { x: e.clientX - x, y: e.clientY - y };
    const pos: Record<string, { x: number; y: number }> = {};
    elements.forEach(el => { if (selectedIds.has(el.id)) pos[el.id] = { x: el.x, y: el.y }; });
    dragStartPos.current = pos;
    setDragging({ type, id });
  }

  function startGroupResize(
    e: React.MouseEvent,
    bounds: { x: number; y: number; w: number; h: number; items: GroupBoundsItem[] }
  ) {
    e.preventDefault(); e.stopPropagation();
    resizeStart.current = { x: e.clientX, y: e.clientY, w: bounds.w, h: bounds.h, ex: bounds.x, ey: bounds.y, handle: "se", ratio: 0, items: bounds.items };
    setResizing({ type: "group" });
  }

  function startSingleResize(
    id: string,
    type: WidgetType,
    handle: ResizeHandle,
    e: React.MouseEvent,
  ) {
    e.preventDefault(); e.stopPropagation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = elements.find(el => el.id === id && el.elementType === type) as any;
    if (!el) return;
    if (type === "text") {
      const sz = isFinite(el.size) && el.size > 0 ? el.size : 16;
      resizeStart.current = { x: e.clientX, y: e.clientY, w: sz, h: sz, ex: el.x ?? 0, ey: el.y ?? 0, handle, ratio: 0, items: [] };
    } else {
      const w = isFinite(el.w) && el.w > 0 ? el.w : 80;
      const h = isFinite(el.h) && el.h > 0 ? el.h : 60;
      const ratio = type === "image"
        ? (el.naturalW > 0 && el.naturalH > 0 ? el.naturalH / el.naturalW : h / w)
        : 0;
      resizeStart.current = { x: e.clientX, y: e.clientY, w, h, ex: el.x ?? 0, ey: el.y ?? 0, handle, ratio, items: [] };
    }
    setResizing({ type, id, handle });
  }

  function startRotate(
    id: string,
    type: WidgetType,
    e: React.MouseEvent,
    domCx?: number, domCy?: number
  ) {
    e.preventDefault(); e.stopPropagation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = elements.find(el => el.id === id && el.elementType === type) as any;
    if (!el) return;
    let cx: number, cy: number;
    if (type === "text") {
      cx = domCx ?? el.x; cy = domCy ?? el.y;
    } else {
      cx = domCx ?? el.x + el.w / 2; cy = domCy ?? el.y + el.h / 2;
    }
    const currentRotation: number = el.rotation ?? 0;
    const startAngle = angleBetween(cx, cy, e.clientX, e.clientY);
    setRotating({ type, id, cx, cy, startAngle, startRotation: currentRotation });
  }

  function handleDragMove(e: React.MouseEvent) {
    if (rotating) {
      const currentAngle = angleBetween(rotating.cx, rotating.cy, e.clientX, e.clientY);
      const newRotation  = rotating.startRotation + (currentAngle - rotating.startAngle);
      lastRotation.current = newRotation;
      setElements(p => p.map(el =>
        el.id === rotating.id && el.elementType === rotating.type
          ? { ...el, rotation: newRotation } as CanvasElement
          : el
      ));
      return;
    }

    if (dragging) {
      didDrag.current = true;
      const nx = e.clientX - dragOffset.current.x;
      const ny = e.clientY - dragOffset.current.y;
      const sp = dragStartPos.current[dragging.id];
      if (!sp) return;
      const dx = nx - sp.x, dy = ny - sp.y;
      setElements(p => p.map(el => {
        const startPos = dragStartPos.current[el.id];
        if (!startPos) return el;
        const rawX = startPos.x + dx;
        const rawY = startPos.y + dy;
        if (canvasBounds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const elW = (el as any).w ?? 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const elH = (el as any).h ?? 0;
          return { ...el,
            x: Math.max(0, Math.min(canvasBounds.w - elW, rawX)),
            y: Math.max(canvasBounds.topOffset, Math.min(canvasBounds.h - elH, rawY)),
          } as CanvasElement;
        }
        return { ...el, x: rawX, y: rawY } as CanvasElement;
      }));
      const tr = trashRef.current;
      if (tr) {
        const r = tr.getBoundingClientRect();
        setOverTrash(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
      }
    }

    if (resizing) {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const { w, h, ex, ey, handle, ratio } = resizeStart.current;

      if (resizing.type === "group") {
        const ow = Math.max(80, w);
        const oh = Math.max(60, h);
        const sx=Math.max(80,ow+dx)/ow, sy=Math.max(60,oh+dy)/oh;
        const ox=Math.min(...resizeStart.current.items.map(i=>i.x));
        const oy=Math.min(...resizeStart.current.items.map(i=>i.y));
        setElements(p => p.map(el => {
          const o = resizeStart.current.items.find(i => i.id === el.id);
          if (!o) return el;
          return { ...el, x: ox+(o.x-ox)*sx, y: oy+(o.y-oy)*sy, w: o.w*sx, h: o.h*sy } as CanvasElement;
        }));
        return;
      }

      if (resizing.type === "text") {
        const ns=Math.max(10,Math.min(300,Math.round(w+(dx+dy)/2)));
        lastResize.current = { size: ns };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="text"?{...el,size:ns}:el));
        return;
      }

      // Minimums per element type
      const minW = resizing.type==="image"?40 : resizing.type==="card"?80 : resizing.type==="gallery"?160 : resizing.type==="media"?200 : resizing.type==="guestbook"?200 : 160;
      const minH = resizing.type==="image"?1  : resizing.type==="card"?60  : resizing.type==="gallery"?120 : resizing.type==="media"?60  : resizing.type==="guestbook"?260 : 120;

      const { nx, ny, nw, nh } = computeResize(handle, dx, dy, w, h, ex, ey, ratio, resizing.type === "image", minW, minH);

      lastResize.current = { w: nw, h: nh, x: nx, y: ny };
      setElements(p => p.map(el => {
        if (el.id !== resizing.id || el.elementType !== resizing.type) return el;
        return { ...el, x: nx, y: ny, w: nw, h: nh } as CanvasElement;
      }));
    }
  }

  function handleDragUp(selectedIds: Set<string>): DragUpResult {
    const rotated = rotating
      ? { id: rotating.id, type: rotating.type, rotation: lastRotation.current }
      : null;

    const resized = (resizing && resizing.type !== "group")
      ? { id: resizing.id, type: resizing.type as WidgetType, ...lastResize.current }
      : null;

    const moved: DragUpResult["moved"] = [];
    const snapUpdates: Array<{ id: string; x: number; y: number }> = [];
    if (dragging && !overTrash) {
      elements.forEach(el => {
        const startPos = dragStartPos.current[el.id];
        if (startPos) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w = (el as any).w ?? 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const h = (el as any).h ?? 0;
          const x = Math.max(0, Math.min((canvasBounds?.w ?? window.innerWidth) - w, el.x));
          const y = el.y;
          moved.push({ id: el.id, type: el.elementType as DragTarget["type"], x, y, startX: startPos.x, startY: startPos.y });
          if (x !== el.x || y !== el.y) snapUpdates.push({ id: el.id, x, y });
        }
      });
      if (snapUpdates.length > 0) {
        setElements(p => p.map(el => {
          const u = snapUpdates.find(s => s.id === el.id);
          return u ? { ...el, x: u.x, y: u.y } as CanvasElement : el;
        }));
      }
    }

    if (rotating) { setRotating(null); return { wasDeleted: false, moved: [], rotated, resized: null }; }
    if (dragging && overTrash) {
      const del = new Set(selectedIds);
      setElements(p => p.filter(el => !del.has(el.id)));
      setDragging(null); setResizing(null); setOverTrash(false);
      return { wasDeleted: true, moved: [], rotated, resized };
    }
    setDragging(null); setResizing(null); setOverTrash(false);
    return { wasDeleted: false, moved, rotated, resized };
  }

  return {
    dragging, resizing, rotating, overTrash, didDrag,
    startDrag, startGroupResize, startSingleResize, startRotate,
    handleDragMove, handleDragUp,
  };
}
