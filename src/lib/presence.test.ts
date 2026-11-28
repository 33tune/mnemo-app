import { test } from "node:test";
import assert from "node:assert/strict";
import { presenceLabel, isLive } from "./presence";

test("presence labels", () => {
  const now = Date.parse("2026-11-28T12:00:00Z");
  assert.equal(presenceLabel(null, now), null);
  assert.equal(presenceLabel(now - 30_000, now), "En vivo");
  assert.equal(isLive(now - 30_000, now), true);
  assert.equal(presenceLabel(now - 5 * 60_000, now), "Activo hace 5 min");
  assert.equal(presenceLabel(now - 3 * 3600_000, now), "Activo hace 3 h");
  assert.equal(presenceLabel(now - 30 * 3600_000, now), "Activo hace 1 día");
  assert.equal(presenceLabel(now - 3 * 86400_000, now), "Activo hace 3 días");
  assert.equal(presenceLabel(now - 9 * 86400_000, now), "Activo hace más de una semana");
});
