"use client";
import { CanvasImage as CanvasImageType } from "@/types";

type Props = {
  img: CanvasImageType;
  isSelected: boolean;
  isActive: boolean;
  overTrash: boolean;
  draggingId: string | null;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string, e: React.MouseEvent) => void;
  onResizeMouseDown: (id: string, e: React.MouseEvent) => void;
};

export default function CanvasImage({
  img,
  isSelected,
  isActive,
  overTrash,
  draggingId,
  onMouseDown,
  onClick,
  onDoubleClick,
  onResizeMouseDown,
}: Props) {
  return (
    <div
      onClick={(e) => onClick(img.id, e)}
      onDoubleClick={(e) => onDoubleClick(img.id, e)}
      onMouseDown={(e) => onMouseDown(img.id, e)}
      style={{
        position: "absolute",
        left: img.x,
        top: img.y,
        width: img.w,
        height: img.h,
        zIndex: img.zIndex,
        userSelect: "none",
        opacity: isActive && isSelected && overTrash ? 0.3 : 1,
        transition: "opacity 0.15s",
        cursor: draggingId ? "grabbing" : "grab",
        borderRadius: img.isTransparent ? 0 : 8,
        boxShadow: img.isTransparent ? "none" : "0 2px 12px rgba(0,0,0,0.4)",
        outline: isSelected && !img.isTransparent ? "1.5px solid rgba(255,255,255,0.4)" : "none",
      }}
    >
      <img
        src={img.src}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: img.isTransparent ? "contain" : "cover",
          display: "block",
          borderRadius: img.isTransparent ? 0 : 8,
          pointerEvents: "none",
        }}
      />
      {isSelected && (
        <div
          onMouseDown={(e) => onResizeMouseDown(img.id, e)}
          style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "white",
            cursor: "nwse-resize",
            border: "2px solid rgba(0,0,0,0.4)",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
