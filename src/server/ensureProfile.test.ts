import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureProfile } from "./ensureProfile";

type Row = { user_id: string; handle: string; display_name: string | null; onboarding_completed: boolean };

/** Just the profiles calls ensureProfile makes, over an in-memory table with
 * unique handle and user_id (23505 like Postgres). */
function fakeSupabase(rows: Row[]) {
  const pick = (r: Row) => ({ handle: r.handle, display_name: r.display_name, onboarding_completed: r.onboarding_completed });
  return {
    from: () => ({
      select: () => ({ eq: (_c: string, uid: string) => ({ maybeSingle: async () => {
        const r = rows.find(x => x.user_id === uid);
        return { data: r ? pick(r) : null, error: null };
      } }) }),
      insert: (row: Row) => ({ select: () => ({ single: async () => {
        if (rows.some(x => x.handle === row.handle || x.user_id === row.user_id)) return { data: null, error: { code: "23505" } };
        rows.push(row);
        return { data: pick(row), error: null };
      } }) }),
    }),
  } as unknown as SupabaseClient;
}

const user = (meta: Record<string, unknown> = {}) =>
  ({ id: "474c37c9-74f6-410c-b1bb-65e8e7de6e29", user_metadata: meta }) as unknown as User;

test("an existing profile is returned untouched", async () => {
  const rows: Row[] = [{ user_id: user().id, handle: "ram", display_name: "ram", onboarding_completed: true }];
  const p = await ensureProfile(fakeSupabase(rows), user({ handle: "otro" }));
  assert.equal(p?.handle, "ram");
  assert.equal(rows.length, 1);
});

test("missing row + name claimed at sign-up → finished profile with it", async () => {
  const rows: Row[] = [];
  const p = await ensureProfile(fakeSupabase(rows), user({ handle: "Sorceror" }));
  assert.deepEqual(p, { handle: "sorceror", display_name: "sorceror", onboarding_completed: true });
});

test("claimed name taken meanwhile → temp_ profile for /setup", async () => {
  const rows: Row[] = [{ user_id: "someone-else", handle: "sorceror", display_name: null, onboarding_completed: true }];
  const p = await ensureProfile(fakeSupabase(rows), user({ handle: "sorceror" }));
  assert.equal(p?.onboarding_completed, false);
  assert.equal(p?.handle, "temp_474c37c974f6410");
});

test("no claimed name (Google) → temp_ profile with the Google name", async () => {
  const p = await ensureProfile(fakeSupabase([]), user({ full_name: "Mev Jimenez" }));
  assert.equal(p?.onboarding_completed, false);
  assert.equal(p?.display_name, "Mev Jimenez");
});
