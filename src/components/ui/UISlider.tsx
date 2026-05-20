"use client";
import { useEffect } from "react";
import { UI } from "@/styles/ui";
import { UILabel } from "./UILabel";

const STYLE_ID = "ui-slider-css";

const CSS = `
  .ui-rng {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 1px; display: block;
    background: rgba(255,255,255,0.14); border-radius: 0;
    outline: none; cursor: pointer; margin: 0;
  }
  .ui-rng::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 3px; height: 14px;
    background: rgba(255,255,255,0.75); border-radius: 1px;
    cursor: pointer; transition: transform 0.1s;
  }
  .ui-rng:hover::-webkit-slider-thumb { transform: scaleY(1.3); }
  .ui-rng::-moz-range-thumb {
    width: 3px; height: 14px;
    background: rgba(255,255,255,0.75); border-radius: 1px;
    cursor: pointer; border: none;
  }
`;

function useSliderStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

interface Props {
  label:        string;
  value:        number;
  unit?:        string;
  min:          number;
  max:          number;
  step?:        number;
  onChange:     (v: number) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLInputElement>) => void;
}

export function UISlider({
  label,
  value,
  unit = "",
  min,
  max,
  step = 1,
  onChange,
  onMouseDown,
}: Props) {
  useSliderStyles();

  return (
    <div>
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "baseline",
          marginBottom:   9,
        }}
      >
        <UILabel>{label}</UILabel>
        <span
          style={{
            fontFamily:    UI.font,
            fontSize:      10,
            color:         UI.colors.textDim,
            letterSpacing: "0.5px",
          }}
        >
          {value}{unit}
        </span>
      </div>

      <input
        type="range"
        className="ui-rng"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseDown={onMouseDown}
      />
    </div>
  );
}
