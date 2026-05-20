import { createClient } from "@/lib/supabase/server";
import { extractAssetPaths } from "@/lib/storage/extractAssetPaths";
import type { CanvasState } from "@/types";

const SAFE_DELAY_HOURS = 24;

export interface CleanupResult {
  queued:          number;
  deleted:         string[];
  skipped:         string[];
  stillReferenced: string[];
  errors:          string[];
}

/**
 * Server-side storage garbage collector.
 *
 * Algorithm:
 *   1. Read paths from storage_cleanup_queue that are older than SAFE_DELAY_HOURS.
 *   2. Load ALL canvases and build a global set of referenced storage paths.
 *   3. For each queued path:
 *      - Still referenced → remove from queue (it's being used), log "still-referenced"
 *      - Not referenced  → delete from Supabase Storage, remove from queue, log "deleted"
 *      - Delete error    → leave in queue for next run, log "errors"
 *
 * Trigger this function from a Vercel cron (/api/storage-cleanup) or a daily job.
 * It is safe to call repeatedly — idempotent by design.
 */
export async function runStorageCleanup(): Promise<CleanupResult> {
  const result: CleanupResult = {
    queued:          0,
    deleted:         [],
    skipped:         [],
    stillReferenced: [],
    errors:          [],
  };

  const sb = await createClient();

  // ── 1. Read candidates older than the safe delay ───────────────────────────
  const cutoff = new Date(Date.now() - SAFE_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: queued, error: queueErr } = await sb
    .from("storage_cleanup_queue")
    .select("id, path, user_id")
    .lt("created_at", cutoff);

  if (queueErr) {
    console.error("[storage-gc] failed to read queue:", queueErr);
    return result;
  }

  if (!queued || queued.length === 0) {
    console.log("[storage-gc] queue empty, nothing to process");
    return result;
  }

  result.queued = queued.length;
  console.log(`[storage-gc] processing ${queued.length} queued path(s)`);

  // ── 2. Build global reference set from all canvases ────────────────────────
  // With the anon key + RLS this returns canvases the session can read.
  // For full cross-user scanning add SUPABASE_SERVICE_ROLE_KEY to your env
  // and use a service-role client here.
  const { data: allCanvases, error: canvasErr } = await sb
    .from("canvases")
    .select("data");

  if (canvasErr) {
    console.error("[storage-gc] failed to read canvases:", canvasErr);
    return result;
  }

  const globalRefs = new Set<string>();
  for (const row of allCanvases ?? []) {
    try {
      const state = row.data as CanvasState;
      for (const p of extractAssetPaths(state)) globalRefs.add(p);
    } catch {
      // Malformed canvas data — skip silently
    }
  }

  // ── 3. Process each queued path ────────────────────────────────────────────
  for (const entry of queued) {
    // Still referenced by at least one canvas — keep it, remove from queue
    if (globalRefs.has(entry.path)) {
      console.log("[storage-gc] still-referenced:", entry.path);
      result.stillReferenced.push(entry.path);
      await sb.from("storage_cleanup_queue").delete().eq("id", entry.id);
      continue;
    }

    // Extract bucket name and file path from "bucket/path/to/file"
    const slashIdx = entry.path.indexOf("/");
    if (slashIdx === -1) {
      console.warn("[storage-gc] skipped (invalid path format):", entry.path);
      result.skipped.push(entry.path);
      await sb.from("storage_cleanup_queue").delete().eq("id", entry.id);
      continue;
    }

    const bucket   = entry.path.slice(0, slashIdx);
    const filePath = entry.path.slice(slashIdx + 1);

    const { error: delErr } = await sb.storage.from(bucket).remove([filePath]);

    if (delErr) {
      // Could be a 404 (already deleted) — remove from queue either way
      if (delErr.message?.toLowerCase().includes("not found") || delErr.message?.includes("404")) {
        console.log("[storage-gc] already gone, clearing queue entry:", entry.path);
        result.deleted.push(entry.path);
        await sb.from("storage_cleanup_queue").delete().eq("id", entry.id);
      } else {
        console.error("[storage-gc] delete error:", entry.path, delErr.message);
        result.errors.push(entry.path);
        // Leave in queue — will retry on next run
      }
    } else {
      console.log("[storage-gc] deleted:", entry.path);
      result.deleted.push(entry.path);
      await sb.from("storage_cleanup_queue").delete().eq("id", entry.id);
    }
  }

  console.log(
    `[storage-gc] done — deleted: ${result.deleted.length}, ` +
    `still-referenced: ${result.stillReferenced.length}, ` +
    `skipped: ${result.skipped.length}, ` +
    `errors: ${result.errors.length}`
  );

  return result;
}
