"use client";
import { UI } from "@/styles/ui";

interface Props {
  children:  React.ReactNode;
  onClick?:  () => void;
  danger?:   boolean;
  disabled?: boolean;
  full?:     boolean;
  type?:     "button" | "submit" | "reset";
}

export function UIButton({
  children,
  onClick,
  danger   = false,
  disabled = false,
  full     = false,
  type     = "button",
}: Props) {
  const b0  = danger ? "rgba(220,60,60,0.22)"  : UI.colors.border;
  const bH  = danger ? "rgba(220,60,60,0.72)"  : UI.colors.borderStrong;
  const c0  = danger ? "rgba(255,100,100,0.6)" : UI.colors.textFaint;
  const cH  = danger ? "#fff"                  : "#09090b";
  const bg0 = "transparent";
  const bgH = danger ? "rgba(210,55,55,0.9)"  : "rgba(235,235,235,0.92)";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "5px",
        width:          full ? "100%" : undefined,
        padding:        "6px 13px",
        borderRadius:   3,
        border:         `1px solid ${b0}`,
        background:     bg0,
        color:          c0,
        fontSize:       9,
        fontFamily:     UI.font,
        fontWeight:     500,
        letterSpacing:  "1px",
        textTransform:  "uppercase",
        cursor:         disabled ? "not-allowed" : "pointer",
        whiteSpace:     "nowrap",
        opacity:        disabled ? 0.35 : 1,
        transition:     UI.transition,
        userSelect:     "none",
      }}
      onMouseEnter={e => {
        if (disabled) return;
        const el = e.currentTarget;
        el.style.border     = `1px solid ${bH}`;
        el.style.background = bgH;
        el.style.color      = cH;
        el.style.transform  = "scale(1.04)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.border     = `1px solid ${b0}`;
        el.style.background = bg0;
        el.style.color      = c0;
        el.style.transform  = "scale(1)";
      }}
      onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
      onMouseUp={e =>   {                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
    >
      {children}
    </button>
  );
}
