/**
 * Crews (2026-10-29): closed circles with a public house (myland.lol/c/<slug>),
 * joined only by invite link ("el Pacto"). Everything of the feature lives in
 * src/features/crews + the crew routes + supabase/migrations/20261029000000_crews.sql;
 * how to remove it: docs/crews.md.
 */

/** Crews pinned to the editor's rail (crew_pin). */
export const CREW_MAX_PINS = 10;
/** Crews a person may found (crew_create). */
export const CREW_MAX_OWNED = 10;
export const CREW_SLUG_RE = /^[a-z0-9_-]{3,24}$/;
export const CREW_TAG_RE = /^[A-Z0-9]{2,4}$/;
export const CREW_LIMITS = { name: 40, motto: 120, post: 280, postLines: 6, posts: 10, links: 6, linkLabel: 30 } as const;

export interface CrewLink { label: string; url: string }

export interface Crew {
  id: string;
  slug: string;
  name: string;
  /** "Descripción" in the UI. */
  motto: string;
  emblem_url: string | null;
  color: string;
  /** Primary font (titles). */
  font: string;
  /** Secondary font (description, notices); null = the site's sans. */
  body_font: string | null;
  tag: string | null;
  links: CrewLink[];
  bg_color: string;
  bg_image: string | null;
  music_url: string | null;
  discord_url: string | null;
  owner_id: string;
  created_at: string;
}

/** What the founder and admins may change (crew_update whitelists the same keys). */
export type CrewPatch = Partial<Pick<Crew,
  "name" | "motto" | "emblem_url" | "color" | "font" | "body_font" | "tag" | "links" | "bg_color" | "bg_image" | "music_url" | "discord_url">>;

export type CrewRole = "owner" | "admin" | "member";

export interface CrewHouseMember {
  user_id: string;
  number: number;
  joined_at: string;
  role: CrewRole;
  handle: string;
  display_name: string | null;
  /** The member's published card (null when their room isn't public). */
  card: Record<string, unknown> | null;
}

/** A notice: 24 hours, public or members only. */
export interface CrewPost {
  id: string;
  body: string;
  link: string | null;
  is_public: boolean;
  created_at: string;
  expires_at: string;
  author?: string | null;
}

export interface CrewHouse {
  crew: Crew;
  member_count: number;
  /** The viewer's place (null when not a member). */
  me: { number: number; pinned: boolean; role: CrewRole } | null;
  /** The first ones: founder, admins, then by arrival (the Members tab has all). */
  members: CrewHouseMember[];
  /** What the viewer may see: public ones, or all when a member. */
  posts: CrewPost[];
}

export interface MyCrew {
  crew: Crew;
  number: number;
  pinned: boolean;
  role: CrewRole;
  members: number;
}

/** A dashboard message: an unread notice from a pinned crew. */
export interface CrewInboxItem extends CrewPost {
  crew: Pick<Crew, "id" | "slug" | "name" | "color" | "font" | "body_font" | "emblem_url" | "tag">;
}

export const isAdminRole = (r: CrewRole | null | undefined) => r === "owner" || r === "admin";
export const roleLabel = (r: CrewRole) => (r === "owner" ? "Fundador" : r === "admin" ? "Admin" : "Miembro");

/** "hace 5 h" — notices last 24 hours. */
export function timeAgo(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

/** A link as typed → https URL ("" when empty). */
export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t.replace(/^http:/i, "https:") : `https://${t}`;
}
export const URL_OK = (u: string) => u.length <= 300 && /^https:\/\/\S+\.\S+$/.test(u);

/** Lines of a notice (line breaks count as characters too). */
export const lineCount = (s: string) => s.split("\n").length;

/** A tag as typed: uppercase letters and numbers, at most 4. */
export const cleanTag = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

/** The one who created the crew is #01, its founder. */
export const isFounder = (n: number) => n === 1;

/** "#007"-style member number. */
export const memberNumber = (n: number) => `#${String(n).padStart(2, "0")}`;

/** Normalizes what the user types into a crew link. */
/** A crew's link from its name: lowercase, no accents, spaces as "-"
 * ("Los Búhos" → "los-buhos"). */
export const slugify = (raw: string) => raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);

/** What a new crew's name may hold, so its link is the same name: letters
 * (accents too), numbers, spaces, - and _; at most 24. */
export const cleanCrewName = (raw: string) => raw.replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s{2,}/g, " ").slice(0, 24);

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
  if (m.includes("banned")) return "No podés entrar a este crew.";
  if (m.includes("max_pins")) return `Ya tenés ${CREW_MAX_PINS} crews en la barra. Quitá uno para sumar otro.`;
  if (m.includes("max_owned")) return `Ya fundaste ${CREW_MAX_OWNED} crews, el máximo.`;
  if (m.includes("max_posts")) return `El crew ya tiene ${CREW_LIMITS.posts} avisos activos. Borrá uno o esperá a que venza.`;
  if (m.includes("too_many_lines")) return `El aviso puede tener hasta ${CREW_LIMITS.postLines} renglones.`;
  if (m.includes("bad_body")) return `El aviso va de 1 a ${CREW_LIMITS.post} caracteres.`;
  if (m.includes("bad_links") || m.includes("bad_link")) return "Ese link no es válido. Usá uno que empiece con https://.";
  if (m.includes("tag_taken")) return "Ese tag ya lo usa otro crew.";
  if (m.includes("bad_tag")) return "El tag va de 2 a 4 letras o números.";
  if (m.includes("bad_code")) return "Este link de invitación ya no sirve. Pedile uno nuevo a quien te invitó.";
  if (m.includes("slug_taken")) return "Ya hay un crew con ese nombre.";
  if (m.includes("bad_slug")) return "Usá al menos 3 letras o números.";
  if (m.includes("bad_discord")) return "Ese link de Discord no es válido. Usá uno de invitación (discord.gg/...).";
  if (m.includes("bad_asset")) return "Ese archivo no se pudo usar. Subilo de nuevo.";
  if (m.includes("not_found")) return "Ese crew no existe.";
  if (m.includes("not_member")) return "Esa persona ya no está en el crew.";
  if (m.includes("owner")) return "Sos el fundador: no podés irte. Podés borrar el crew.";
  if (m.includes("forbidden")) return "Solo el fundador o un admin puede hacer eso.";
  if (m.includes("auth")) return "Tenés que entrar a tu cuenta.";
  if (/fetch|network/i.test(m)) return "No pudimos conectarnos. Revisá tu internet y probá de nuevo.";
  return "Algo salió mal. Probá de nuevo.";
}

/** A pasted invite link (or its path) → the crew and its code; null if it isn't one. */
export function parseInvite(raw: string): { slug: string; code: string } | null {
  const m = /\/c\/([a-z0-9_-]{3,24})\/unirme\?(?:.*&)?k=([A-Za-z0-9%_-]{1,80})/.exec(raw.trim());
  return m ? { slug: m[1], code: decodeURIComponent(m[2]) } : null;
}
