import type { SupabaseClient } from "@supabase/supabase-js";
import { collectStoragePaths } from "@/lib/storage/extractAssetPaths";
import { planCleanup, CLEANUP_BUCKET, type QueuedFile, type StoredFile } from "@/lib/storage/cleanupPlan";

export interface CleanupResult { deleted: number; aborted?: string }

const PAGE = 1000;
/** Past this many pending ops the data is not read whole: no cleanup. */
const MAX_OPS = 20000;

/**
 * Storage cleanup for ONE user (the signed-in one, with their own session —
 * RLS keeps it to their rows and files). Called by /api/storage/cleanup at
 * most once a day when the owner opens the editor. Decision: cleanupPlan.ts.
 * It never deletes on partial information: if any of the user's data can't be
 * read whole, it stops without deleting anything.
 */
export async function runUserStorageCleanup(sb: SupabaseClient, userId: string, now = Date.now()): Promise<CleanupResult> {
  // ── Everything the user's data uses ──────────────────────────────────────
  const used = new Set<string>();
  const canvases = await sb.from("canvases").select("data").eq("user_id", userId);
  if (canvases.error) return { deleted: 0, aborted: "canvases" };
  for (const row of canvases.data ?? []) collectStoragePaths(row.data, used);

  for (let from = 0; ; from += PAGE) {
    if (from >= MAX_OPS) return { deleted: 0, aborted: "too many ops" };
    const ops = await sb.from("canvas_ops").select("op").eq("user_id", userId).order("id", { ascending: true }).range(from, from + PAGE - 1);
    if (ops.error) return { deleted: 0, aborted: "canvas_ops" };
    for (const row of ops.data ?? []) collectStoragePaths(row.op, used);
    if ((ops.data ?? []).length < PAGE) break;
  }

  const profile = await sb.from("profiles").select("*").eq("user_id", userId);
  if (profile.error) return { deleted: 0, aborted: "profiles" };
  collectStoragePaths(profile.data, used);

  // Crews the user owns (emblem, background, music live in their folder).
  // A database without crews (feature removed: 42P01) has nothing to keep.
  const crews = await sb.from("crews").select("*").eq("owner_id", userId);
  if (crews.error && crews.error.code !== "42P01" && crews.error.code !== "PGRST205") return { deleted: 0, aborted: "crews" };
  collectStoragePaths(crews.data ?? [], used);

  // ── Candidates ───────────────────────────────────────────────────────────
  const queueRes = await sb.from("storage_cleanup_queue").select("id, path, created_at").eq("user_id", userId);
  const queue: QueuedFile[] = queueRes.error ? [] : (queueRes.data ?? []) as QueuedFile[];

  const files: StoredFile[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const list = await sb.storage.from(CLEANUP_BUCKET).list(userId, { limit: PAGE, offset });
    if (list.error) break; // listing not allowed: only the queue is used
    for (const f of list.data ?? []) {
      if (f.id) files.push({ path: `${userId}/${f.name}`, created_at: f.created_at });
    }
    if ((list.data ?? []).length < PAGE) break;
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const plan = planCleanup({ userId, queue, files, used, now });
  let deleted = 0;
  for (let i = 0; i < plan.remove.length; i += 100) {
    const batch = plan.remove.slice(i, i + 100);
    const { error } = await sb.storage.from(CLEANUP_BUCKET).remove(batch);
    if (error) {
      console.error("[storage-gc] remove failed:", error.message);
      return { deleted }; // queue rows stay: next run retries
    }
    deleted += batch.length;
  }
  // Older root-level files: best effort — a bucket that only allows deleting
  // in one's own folder refuses them, and they are not retried forever.
  for (let i = 0; i < plan.legacy.length; i += 100) {
    const batch = plan.legacy.slice(i, i + 100);
    const { data, error } = await sb.storage.from(CLEANUP_BUCKET).remove(batch);
    if (error) console.error("[storage-gc] legacy remove refused:", error.message);
    else deleted += data?.length ?? 0;
  }
  if (plan.dropQueueIds.length) {
    await sb.from("storage_cleanup_queue").delete().in("id", plan.dropQueueIds);
  }
  return { deleted };
}
