"use client";
import { createClient } from "@/lib/supabase/client";
import { checkUpload, contentTypeFor } from "@/lib/storage/uploadRules";
import { shrinkImage } from "@/lib/storage/shrinkImage";

// Dedup concurrent uploads of the same file (same name + size + lastModified).
// Prevents double-upload when e.g. a user pastes the same image twice quickly.
const _inflight = new Map<string, Promise<UploadResult>>();

function fileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export type UploadResult = { publicUrl: string; storagePath: string };

async function _doUpload(file: File): Promise<UploadResult> {
  // Only images, MP3s and fonts, within their size limit (uploadRules.ts).
  const problem = checkUpload(file);
  if (problem) {
    if (typeof window !== "undefined") window.alert(problem);
    throw new Error(problem);
  }
  // Pictures are stored small (shrinkImage.ts): less storage, faster views.
  file = await shrinkImage(file);
  const supabase = createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const name = `${crypto.randomUUID()}.${ext}`;
  // Each user's files live in their own folder, so the daily cleanup
  // (/api/storage/cleanup) can find every file of theirs that no longer
  // appears in their room. If the bucket refuses the folder, the file goes
  // to the root as before — an upload never fails because of this.
  const { data: { session } } = await supabase.auth.getSession();
  const candidates = session?.user.id ? [`${session.user.id}/${name}`, name] : [name];
  let lastError: unknown = null;
  for (const storagePath of candidates) {
    const { error } = await supabase.storage
      .from("canvas-assets")
      .upload(storagePath, file, {
        upsert: false, contentType: contentTypeFor(file),
        // Every name is new (a UUID): the file never changes, so browsers
        // and the CDN may keep it for a year instead of re-downloading it.
        cacheControl: "31536000",
      });
    if (!error) {
      // GIFs: re-encoded on the server (animated WebP, much lighter).
      if (contentTypeFor(file) === "image/gif" && storagePath.includes("/")) {
        const optimized = await optimizeGif(storagePath);
        if (optimized) return optimized;
      }
      const { data } = supabase.storage.from("canvas-assets").getPublicUrl(storagePath);
      return { publicUrl: data.publicUrl, storagePath };
    }
    lastError = error;
  }
  console.error("[STORAGE UPLOAD ERROR]", lastError);
  // The bucket refuses a folder that already holds 100 files (migration
  // 20261028000000): say so instead of a silent failure.
  if (session && /row-level security|violates/i.test(String((lastError as { message?: string })?.message ?? ""))
      && typeof window !== "undefined") {
    window.alert("Llegaste al máximo de 100 archivos. Sacá imágenes o GIFs que no uses: el espacio se libera al día siguiente.");
  }
  throw lastError;
}

/** The uploaded GIF as an optimized animated WebP (/api/media/optimize), or
 * null to keep the original (any failure, slow server, no gain). */
async function optimizeGif(storagePath: string): Promise<UploadResult | null> {
  try {
    const res = await fetch("/api/media/optimize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: storagePath }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const out = await res.json() as { path?: string; publicUrl?: string };
    return out.path && out.publicUrl ? { publicUrl: out.publicUrl, storagePath: out.path } : null;
  } catch {
    return null;
  }
}

export async function uploadToStorage(file: File): Promise<UploadResult> {
  const key = fileKey(file);

  // Return existing in-flight promise for identical file
  const existing = _inflight.get(key);
  if (existing) return existing;

  const promise = _doUpload(file).finally(() => _inflight.delete(key));
  _inflight.set(key, promise);
  return promise;
}
