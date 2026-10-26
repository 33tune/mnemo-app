import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runUserStorageCleanup } from "@/server/storage/runStorageCleanup";

// The signed-in user's daily storage cleanup (runStorageCleanup.ts): only
// their own files, only files nothing of theirs uses, only older than a day.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runUserStorageCleanup(supabase, user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[storage-gc]", e);
    return NextResponse.json({ deleted: 0, aborted: "error" });
  }
}
