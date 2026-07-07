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

// Legacy: loads the image from its (remote) URL to read natural dimensions.
// Kept around in case something still needs mode detection from a URL alone
// (no local File available). Prefer detectBgModeFromFile for upload flows —
// it reads the same File already in hand instead of re-fetching it over the network.
export function detectBgMode(url: string): Promise<BgMode> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () =>
      resolve(img.naturalWidth < 300 || img.naturalHeight < 300 ? "repeat" : "cover");
    img.onerror = () => resolve("cover");
    img.src = url;
  });
}

// Reads dimensions straight from the local File/Blob — no network round trip.
// Small images (< 300px on either axis) are assumed to be tiles/patterns.
export async function detectBgModeFromFile(file: File): Promise<BgMode> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();
    return width < 300 || height < 300 ? "repeat" : "cover";
  } catch {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.naturalWidth < 300 || img.naturalHeight < 300 ? "repeat" : "cover");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("cover");
      };
      img.src = url;
    });
  }
}
