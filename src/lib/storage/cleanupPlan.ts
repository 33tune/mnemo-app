/**
 * The storage cleanup's decision, pure (tested): which files of ONE user to
 * delete. A file goes only when it is
 *   - in the app's bucket,
 *   - older than the grace period (an upload whose op is still on its way, or
 *     an image that undo may bring back, is never touched), and
 *   - used nowhere in that user's data (every room, every pending op and the
 *     profile — see collectStoragePaths: any field, any depth).
 * Candidates come from the user's own folder ("<uid>/…", every upload since
 * 2026-10-26) and from the queue of files that left a saved room (older,
 * root-level uploads).
 */
export const CLEANUP_BUCKET = "canvas-assets";
export const CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;

export interface QueuedFile { id: string; path: string; created_at: string }
export interface StoredFile { path: string; created_at?: string | null }

export interface CleanupPlan {
  /** Paths inside the bucket to remove: the user's folder… */
  remove: string[];
  /** …and older root-level files from the queue (a bucket that only lets
   * users delete in their own folder refuses these: they never block the
   * folder's cleanup). */
  legacy: string[];
  /** Queue rows that are settled (removed, or still in use) and can go. */
  dropQueueIds: string[];
}

const old = (iso: string | null | undefined, now: number) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) && now - t >= CLEANUP_GRACE_MS;
};

export function planCleanup({ userId, queue, files, used, now }: {
  userId: string;
  queue: QueuedFile[];
  files: StoredFile[];
  /** "<bucket>/<path>" of everything the user's data uses. */
  used: Set<string>;
  now: number;
}): CleanupPlan {
  const remove = new Set<string>();
  const legacy = new Set<string>();
  const dropQueueIds: string[] = [];
  const prefix = `${CLEANUP_BUCKET}/`;

  for (const q of queue) {
    if (!old(q.created_at, now)) continue;
    if (!q.path.startsWith(prefix)) { dropQueueIds.push(q.id); continue; }
    if (!used.has(q.path)) {
      const inBucket = q.path.slice(prefix.length);
      // The queue is written by the client: never another user's folder.
      if (inBucket.includes("..")) { /* never */ }
      else if (inBucket.startsWith(`${userId}/`)) remove.add(inBucket);
      else if (!inBucket.includes("/")) legacy.add(inBucket);
    }
    dropQueueIds.push(q.id);
  }
  for (const f of files) {
    // Only this user's folder, never a path that climbs out of it.
    if (!f.path.startsWith(`${userId}/`) || f.path.includes("..")) continue;
    if (!old(f.created_at, now)) continue;
    if (!used.has(prefix + f.path)) remove.add(f.path);
  }
  for (const p of remove) legacy.delete(p);
  return { remove: [...remove], legacy: [...legacy], dropQueueIds };
}
