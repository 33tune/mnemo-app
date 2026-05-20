import type { CSSProperties } from "react";

export type BgMode = "cover" | "repeat";

export function bgImageStyle(url: string, mode?: BgMode): CSSProperties {
  if (mode === "repeat") {
    return {
      backgroundImage: `url(${url})`,
      backgroundRepeat: "repeat",
      backgroundSize: "auto",
    };
  }
  return { background: `url(${url}) center/cover no-repeat` };
}

// Load image in browser and check natural dimensions to pick mode.
// Small images (< 300px on either axis) are assumed to be tiles/patterns.
export function detectBgMode(url: string): Promise<BgMode> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () =>
      resolve(img.naturalWidth < 300 || img.naturalHeight < 300 ? "repeat" : "cover");
    img.onerror = () => resolve("cover");
    img.src = url;
  });
}
