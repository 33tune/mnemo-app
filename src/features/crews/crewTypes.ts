/**
 * Crews (2026-10-29): closed circles with a public house (myland.lol/c/<slug>),
 * joined only by invite link ("el Pacto"). Everything of the feature lives in
 * src/features/crews + the crew routes + supabase/migrations/20261029000000_crews.sql;
 * how to remove it: docs/crews.md.
 */

export const CREW_MAX_MEMBERS = 30;
export const CREW_MAX_PER_USER = 3;
/** The first members wear the "fundador" mark. */
export const CREW_FOUNDERS = 10;
export const CREW_SLUG_RE = /^[a-z0-9_-]{3,24}$/;
export const CREW_LIMITS = { name: 40, motto: 120, notice: 280 } as const;

export interface Crew {
  id: string;
  slug: string;
  name: string;
  motto: string;
  notice: string;
  emblem_url: string | null;
  color: string;
  font: string;
  bg_color: string;
  bg_image: string | null;
  music_url: string | null;
  discord_url: string | null;
  owner_id: string;
  created_at: string;
}

/** What the owner may change (crew_update whitelists the same keys). */
export type CrewPatch = Partial<Pick<Crew,
  "name" | "motto" | "notice" | "emblem_url" | "color" | "font" | "bg_color" | "bg_image" | "music_url" | "discord_url">>;

export interface CrewHouseMember {
  user_id: string;
  number: number;
  joined_at: string;
  handle: string;
  display_name: string | null;
  /** The member's published card (null when their room isn't public). */
  card: Record<string, unknown> | null;
}

export interface CrewHouse {
  crew: Crew;
  members: CrewHouseMember[];
}

/** The crew a user features on their card (crew_badge_of). */
export interface CrewBadgeData {
  crew_id: string;
  slug: string;
  name: string;
  emblem_url: string | null;
  color: string;
  font: string;
  number: number;
  x: number;
  y: number;
  size: number;
}

export interface MyCrew {
  crew: Crew;
  number: number;
  featured: boolean;
  badge_x: number;
  badge_y: number;
  badge_size: number;
  members: number;
}

export const isFounder = (n: number) => n >= 1 && n <= CREW_FOUNDERS;

/** "#007"-style member number. */
export const memberNumber = (n: number) => `#${String(n).padStart(2, "0")}`;

/** Normalizes what the user types into a crew link. */
export const slugify = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);

/** A Discord invite the database accepts (crew_discord_ok). */
export const DISCORD_RE = /^https:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9_-]{2,40}\/?$/;

export function normalizeDiscord(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const withProto = /^https?:\/\//i.test(t) ? t.replace(/^http:/i, "https:") : `https://${t}`;
  return withProto;
}

/** Readable text on a crew color (black or white). */
export function inkOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#141118" : "#ffffff";
}

/** The database's error codes, in the user's words. */
export function crewErrorText(raw: unknown): string {
  const m = String((raw as { message?: string })?.message ?? raw ?? "");
  if (m.includes("max_crews")) return `Ya estás en ${CREW_MAX_PER_USER} crews, el máximo. Salí de uno para sumarte a otro.`;
  if (m.includes("crew_full")) return `Este crew ya tiene ${CREW_MAX_MEMBERS} miembros, el máximo.`;
  if (m.includes("bad_code")) return "Este link de invitación ya no sirve. Pedile uno nuevo a quien te invitó.";
  if (m.includes("slug_taken")) return "Ese link ya lo usa otro crew. Probá con otro.";
  if (m.includes("bad_slug")) return "El link usa de 3 a 24 letras, números, - o _.";
  if (m.includes("bad_discord")) return "Ese link de Discord no es válido. Usá uno de invitación (discord.gg/...).";
  if (m.includes("bad_asset")) return "Ese archivo no se pudo usar. Subilo de nuevo.";
  if (m.includes("not_found")) return "Ese crew no existe.";
  if (m.includes("owner")) return "Sos el dueño: no podés irte ni sacarte. Podés borrar el crew.";
  if (m.includes("forbidden")) return "Solo el dueño del crew puede hacer eso.";
  if (m.includes("auth")) return "Tenés que entrar a tu cuenta.";
  if (/fetch|network/i.test(m)) return "No pudimos conectarnos. Revisá tu internet y probá de nuevo.";
  return "Algo salió mal. Probá de nuevo.";
}
