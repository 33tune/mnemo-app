/**
 * "Publicar" for real (2026-10-26). The room's row (`canvases`, type
 * "space") holds the owner's working copy — the editor compacts its ops into
 * it — and the public page used to read that same data, so unpublished
 * changes went public on the next compaction. Now the row also keeps
 * `published`: the snapshot taken by the last Publicar, and the public page
 * shows only that. Same row and table, so RLS and old rows keep working:
 * a row without `published` (never published since) shows its data as before.
 */
import type { CanvasState } from "@/types";

type WithPublished = CanvasState & { published?: CanvasState };

/** The state visitors see: the last published snapshot, else the row's data
 * (rows from before published snapshots existed). */
export function publicStateOf(data: unknown): CanvasState {
  const row = (data ?? {}) as WithPublished;
  const chosen = row.published && typeof row.published === "object" ? row.published : row;
  return stripPublished(chosen);
}

/** The row's working copy, without the published snapshot. */
export function stripPublished(data: unknown): CanvasState {
  const { published: _published, ...rest } = (data ?? {}) as WithPublished;
  void _published;
  return rest as CanvasState;
}

/** Row data to save: the working copy plus the published snapshot kept as is. */
export function withPublished(state: CanvasState, published: CanvasState | null | undefined): CanvasState {
  const clean = stripPublished(state);
  return published ? ({ ...clean, published: stripPublished(published) } as CanvasState) : clean;
}

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as object).sort()
      .filter(k => (v as Record<string, unknown>)[k] !== undefined)
      .map(k => [k, stable((v as Record<string, unknown>)[k])]));
  }
  return v;
}

/** Does the owner have changes visitors don't see yet? */
export function hasUnpublishedChanges(data: unknown, opsAfterSnapshot: number): boolean {
  const row = (data ?? {}) as WithPublished;
  if (!row.published) return true;
  if (opsAfterSnapshot > 0) return true;
  return JSON.stringify(stable(stripPublished(row))) !== JSON.stringify(stable(stripPublished(row.published)));
}
