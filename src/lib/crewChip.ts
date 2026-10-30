/**
 * Crews (2026-10-30): the crew chip of a card — its size for the layout engine
 * (profileCardLayout.ts, a block like the buttons) and the values its render
 * uses (CrewChipView). Pure: the same numbers for the engine and the render.
 */
import type { CrewChip } from "@/types";
import { getFontStyle } from "./fontList";
import type { TextMeasurer } from "./profileCardLayout";

export const CREW_CHIP_SIZE_MIN = 0.6;
export const CREW_CHIP_SIZE_MAX = 2;

export function crewChipScale(chip: Pick<CrewChip, "size">): number {
  return Math.max(CREW_CHIP_SIZE_MIN, Math.min(CREW_CHIP_SIZE_MAX, chip.size ?? 1));
}

/** A crew's font as CSS (Unbounded is the site's display face). */
export function crewFontStyle(font: string): string {
  return font === "Unbounded" ? "'Unbounded', sans-serif" : getFontStyle(font);
}

export const CREW_CHIP_NUMBER_FONT = "'Space Mono', ui-monospace, monospace";

/** "#07". */
export const crewNumberText = (n: number) => `#${String(n).padStart(2, "0")}`;

export interface CrewChipMetrics {
  h: number;
  w: number;
  emblem: number;
  padL: number;
  padR: number;
  gap: number;
  nameSize: number;
  numberSize: number;
}

export function crewChipMetrics(chip: CrewChip, measure?: TextMeasurer): CrewChipMetrics {
  const s = crewChipScale(chip);
  const h = Math.round(26 * s);
  const nameSize = Math.round(12 * s), numberSize = Math.round(10 * s);
  const gap = Math.round(6 * s);
  const emblem = chip.emblem ? h - Math.round(6 * s) : 0;
  const padL = Math.round(chip.emblem ? 3 * s : 10 * s), padR = Math.round(10 * s);
  const nameW = measure
    ? measure.width(chip.name, { family: crewFontStyle(chip.font), size: nameSize, weight: 800, letterSpacing: 0 })
    : chip.name.length * nameSize * 0.68;
  const num = crewNumberText(chip.number);
  const numW = measure
    ? measure.width(num, { family: CREW_CHIP_NUMBER_FONT, size: numberSize, weight: 700, letterSpacing: 0 })
    : num.length * numberSize * 0.62;
  const w = Math.ceil(padL + (emblem ? emblem + gap : 0) + nameW + gap + numW + padR + 3);
  return { h, w, emblem, padL, padR, gap, nameSize, numberSize };
}
