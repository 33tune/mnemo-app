/**
 * Presencia (2026-11-28, pedido del usuario) — PURE: how a room says when its
 * owner was last on myLand. "En vivo" while connected (last ping < 3 min), then
 * "Activo hace 5 min / 3 h / 2 días", and after a week "hace más de una semana".
 * Data: user_presence via last_seen_of() (null when the owner hid it).
 */
export const LIVE_MS = 3 * 60_000;

export function isLive(lastSeen: number | null | undefined, now = Date.now()): boolean {
  return !!lastSeen && now - lastSeen < LIVE_MS;
}

export function presenceLabel(lastSeen: number | null | undefined, now = Date.now()): string | null {
  if (!lastSeen || !Number.isFinite(lastSeen)) return null;
  const ms = Math.max(0, now - lastSeen);
  if (ms < LIVE_MS) return "En vivo";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `Activo hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Activo hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "Activo hace 1 día" : `Activo hace ${d} días`;
  return "Activo hace más de una semana";
}
