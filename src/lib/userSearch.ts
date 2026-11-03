/**
 * The user search (rail › Buscar, 2026-11-03): pure helpers shared by
 * /api/search and its tests. What someone types becomes a safe query (no
 * wildcards or PostgREST syntax), and results are ranked: exact @handle,
 * handle starting with it, name starting with it, then the rest.
 */
export const SEARCH_MAX_RESULTS = 20;

/** What someone typed → the query ("" = nothing to search). */
export function cleanSearchQuery(raw: string): string {
  return raw.normalize("NFC").toLowerCase().replace(/^@+/, "")
    .replace(/[^\p{L}\p{N} _.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 30);
}

/** The query inside an ILIKE pattern: `_` and `\` match themselves. */
export const ilikeEscape = (q: string) => q.replace(/[\\_%]/g, m => `\\${m}`);

export interface SearchHit {
  handle: string;
  name: string;
  photo: string | null;
  pfpRadius: string;
  bg: string;
  nameColor: string;
}

function rank(hit: Pick<SearchHit, "handle" | "name">, q: string): number {
  const h = hit.handle.toLowerCase(), n = hit.name.toLowerCase();
  if (h === q) return 0;
  if (h.startsWith(q)) return 1;
  if (n.startsWith(q)) return 2;
  if (n.split(/\s+/).some(w => w.startsWith(q))) return 3;
  return 4;
}

/** Best first; ties by handle. */
export function rankSearchHits<T extends Pick<SearchHit, "handle" | "name">>(hits: T[], q: string): T[] {
  return [...hits].sort((a, b) => rank(a, q) - rank(b, q) || a.handle.localeCompare(b.handle)).slice(0, SEARCH_MAX_RESULTS);
}
