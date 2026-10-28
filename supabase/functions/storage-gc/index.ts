// Daily storage cleanup for every user (2026-10-28). Called by pg_cron
// (migration 20261028000000) with the secret from Vault; the database decides
// which files are unused (storage_gc_candidates, which also checks the
// secret) and this deletes them through the Storage API.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const secret = req.headers.get("x-gc-secret") ?? "";
  if (req.method !== "POST" || secret.length < 32) return new Response("forbidden", { status: 403 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("storage_gc_candidates", { p_secret: secret, p_limit: 500 });
  if (error) return new Response("forbidden", { status: 403 });

  const names = (data ?? []) as string[];
  let deleted = 0;
  for (let i = 0; i < names.length; i += 100) {
    const batch = names.slice(i, i + 100);
    const { data: gone, error: rmErr } = await sb.storage.from("canvas-assets").remove(batch);
    if (!rmErr) deleted += gone?.length ?? 0;
  }
  return Response.json({ candidates: names.length, deleted });
});
