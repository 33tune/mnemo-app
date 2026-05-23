"use client";
import { createClient } from "@/lib/supabase/client";

// Dedup concurrent uploads of the same file (same name + size + lastModified).
// Prevents double-upload when e.g. a user pastes the same image twice quickly.
const _inflight = new Map<string, Promise<UploadResult>>();

function fileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export type UploadResult = { publicUrl: string; storagePath: string };

async function _doUpload(file: File): Promise<UploadResult> {
  const supabase = createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("canvas-assets")
    .upload(storagePath, file, { upsert: false });
  if (error) {
    console.error("[STORAGE UPLOAD ERROR]", error);
    throw error;
  }
  const { data } = supabase.storage.from("canvas-assets").getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
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
