"use client";
import { createClient } from "@/lib/supabase/client";
import { extractAssetPaths } from "./extractAssetPaths";
import type { CanvasState } from "@/types";

/**
 * Compare previousState vs currentState and insert any paths that disappeared
 * into the storage_cleanup_queue table.
 *
 * Safe: does NOT delete anything — only queues candidates for later review.
 * The actual deletion happens in runStorageCleanup (server-side, 24h later).
 */
export async function queueOrphanedAssets(
  userId:        string,
  previousState: CanvasState,
  currentState:  CanvasState,
): Promise<void> {
  const prevPaths = new Set(extractAssetPaths(previousState));
  const currPaths = new Set(extractAssetPaths(currentState));

  const orphaned = [...prevPaths].filter(p => !currPaths.has(p));
  if (orphaned.length === 0) return;

  console.log("[storage-gc] queued:", orphaned);

  const sb = createClient();
  const { error } = await sb
    .from("storage_cleanup_queue")
    .upsert(
      orphaned.map(path => ({ path, user_id: userId })),
      { onConflict: "path", ignoreDuplicates: true }
    );

  if (error) console.error("[storage-gc] queue insert error:", error);
}
