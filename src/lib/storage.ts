"use client";
import { createClient } from "@/lib/supabase/client";

// Dedup concurrent uploads of the same file (same name + size + lastModified).
// Prevents double-upload when e.g. a user pastes the same image twice quickly.
const _inflight = new Map<string, Promise<string>>();

function fileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

async function _doUpload(file: File): Promise<string> {
  const supabase = createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("canvas-assets")
    .upload(path, file, { upsert: false });
  if (error) {
    console.error("[STORAGE UPLOAD ERROR]", error);
    throw error;
  }
  const { data } = supabase.storage.from("canvas-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadToStorage(file: File): Promise<string> {
  const key = fileKey(file);

  // Return existing in-flight promise for identical file
  const existing = _inflight.get(key);
  if (existing) return existing;

  const promise = _doUpload(file).finally(() => _inflight.delete(key));
  _inflight.set(key, promise);
  return promise;
}
