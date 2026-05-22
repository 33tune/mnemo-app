"use client";
import { useState, useRef } from "react";
import type { CanvasElement } from "@/types";

export type DragTarget   = { type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"; id: string };
export type ResizeTarget = { type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"; id: string } | { type: "group" };
export type RotateTarget = {
  type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook";
  id: string; cx: number; cy: number;
  startAngle: number; startRotation: number;
};

export type DragUpResult = {
  wasDeleted: boolean;
  moved: Array<{ id: string; type: DragTarget["type"]; x: number; y: number }>;
  rotated: { id: string; type: RotateTarget["type"]; rotation: number } | null;
  resized: { id: string; type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"; w?: number; h?: number; size?: number } | null;
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
  const resizeStart  = useRef({ x: 0, y: 0, w: 0, h: 0, items: [] as GroupBoundsItem[] });
  const dragStartPos = useRef<Record<string, { x: number; y: number }>>({});
  const lastRotation = useRef(0);
  const lastResize   = useRef<{ w?: number; h?: number; size?: number }>({});

  function startDrag(
    id: string,
    type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook",
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
    resizeStart.current = { x: e.clientX, y: e.clientY, w: bounds.w, h: bounds.h, items: bounds.items };
    setResizing({ type: "group" });
  }

  function startSingleResize(id: string, type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook", e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = elements.find(el => el.id === id && el.elementType === type) as any;
    if (!el) return;
    if (type === "text") {
      // Guard against NaN/0 font size
      const sz = isFinite(el.size) && el.size > 0 ? el.size : 16;
      resizeStart.current = { x: e.clientX, y: e.clientY, w: sz, h: sz, items: [] };
    } else {
      // Guard against NaN/0 dimensions — fall back to sensible minimums
      const w = isFinite(el.w) && el.w > 0 ? el.w : 80;
      const h = isFinite(el.h) && el.h > 0 ? el.h : 60;
      resizeStart.current = { x: e.clientX, y: e.clientY, w, h, items: [] };
    }
    setResizing({ type, id });
  }

  function startRotate(
    id: string,
    type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook",
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
      if (resizing.type === "group") {
        // Guard against zero/invalid initial bounds to prevent Infinity scale factors
        const ow = Math.max(80, resizeStart.current.w);
        const oh = Math.max(60, resizeStart.current.h);
        const sx=Math.max(80,ow+dx)/ow, sy=Math.max(60,oh+dy)/oh;
        const ox=Math.min(...resizeStart.current.items.map(i=>i.x));
        const oy=Math.min(...resizeStart.current.items.map(i=>i.y));
        setElements(p => p.map(el => {
          const o = resizeStart.current.items.find(i => i.id === el.id);
          if (!o) return el;
          return { ...el, x: ox+(o.x-ox)*sx, y: oy+(o.y-oy)*sy, w: o.w*sx, h: o.h*sy } as CanvasElement;
        }));
      } else if (resizing.type==="image") {
        const img = elements.find(el => el.id === resizing.id && el.elementType === "image");
        if (!img || img.elementType !== "image") return;
        const nw = Math.max(40, resizeStart.current.w + dx);
        // Use natural dimensions for ratio; fall back to current dimensions; fall back to 1:1
        const naturalRatio =
          img.naturalW > 0 && img.naturalH > 0 ? img.naturalH / img.naturalW :
          img.w > 0 && img.h > 0               ? img.h        / img.w        : 1;
        const nh = Math.max(1, Math.round(nw * naturalRatio));
        lastResize.current = { w: nw, h: nh };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="image"?{...el,w:nw,h:nh}:el));
      } else if (resizing.type==="card") {
        lastResize.current = { w: Math.max(80,resizeStart.current.w+dx), h: Math.max(60,resizeStart.current.h+dy) };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="card"?{...el,w:Math.max(80,resizeStart.current.w+dx),h:Math.max(60,resizeStart.current.h+dy)}:el));
      } else if (resizing.type==="text") {
        const ns=Math.max(10,Math.min(300,Math.round(resizeStart.current.w+(dx+dy)/2)));
        lastResize.current = { size: ns };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="text"?{...el,size:ns}:el));
      } else if (resizing.type==="gallery") {
        lastResize.current = { w: Math.max(160,resizeStart.current.w+dx), h: Math.max(120,resizeStart.current.h+dy) };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="gallery"?{...el,w:Math.max(160,resizeStart.current.w+dx),h:Math.max(120,resizeStart.current.h+dy)}:el));
      } else if (resizing.type==="profile") {
        lastResize.current = { w: Math.max(160,resizeStart.current.w+dx), h: Math.max(120,resizeStart.current.h+dy) };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="profile"?{...el,w:Math.max(160,resizeStart.current.w+dx),h:Math.max(120,resizeStart.current.h+dy)}:el));
      } else if (resizing.type==="media") {
        lastResize.current = { w: Math.max(200,resizeStart.current.w+dx), h: Math.max(60,resizeStart.current.h+dy) };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="media"?{...el,w:Math.max(200,resizeStart.current.w+dx),h:Math.max(60,resizeStart.current.h+dy)}:el));
      } else if (resizing.type==="guestbook") {
        lastResize.current = { w: Math.max(220,resizeStart.current.w+dx), h: Math.max(200,resizeStart.current.h+dy) };
        setElements(p=>p.map(el=>el.id===resizing.id&&el.elementType==="guestbook"?{...el,w:Math.max(220,resizeStart.current.w+dx),h:Math.max(200,resizeStart.current.h+dy)}:el));
      }
    }
  }

  function handleDragUp(selectedIds: Set<string>): DragUpResult {
    const rotated = rotating
      ? { id: rotating.id, type: rotating.type, rotation: lastRotation.current }
      : null;

    const resized = (resizing && resizing.type !== "group")
      ? { id: resizing.id, type: resizing.type as "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook", ...lastResize.current }
      : null;

    const moved: DragUpResult["moved"] = [];
    const snapUpdates: Array<{ id: string; x: number; y: number }> = [];
    if (dragging && !overTrash) {
      elements.forEach(el => {
        if (dragStartPos.current[el.id]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w = (el as any).w ?? 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const h = (el as any).h ?? 0;
          const x = Math.max(0, Math.min((canvasBounds?.w ?? window.innerWidth) - w, el.x));
          const y = el.y; // unclamped — canvas scrolls vertically
          moved.push({ id: el.id, type: el.elementType as DragTarget["type"], x, y });
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
