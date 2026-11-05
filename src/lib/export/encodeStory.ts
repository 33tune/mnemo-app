/** The story as a file (a PNG still) and how it reaches the person. */

export function canvasToBlob(c: HTMLCanvasElement, type = "image/png", q?: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob"))), type, q));
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
