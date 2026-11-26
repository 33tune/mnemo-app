import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wallAuthors } from "@/server/wallAuthors";

// Muro (2026-11-25): who I am, as my published card shows me (the mini card at
// the bottom-left and the avatar when I write).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ me: null });
  const who = await wallAuthors(supabase, [user.id]);
  return NextResponse.json({ me: who.get(user.id) ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
