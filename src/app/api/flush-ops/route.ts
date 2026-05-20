import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  let body: { canvas_type: string; op: unknown }[] | null = null;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!body?.length) return new Response(null, { status: 204 });

  const { error } = await supabase.from("canvas_ops").insert(
    body.map(({ canvas_type, op }) => ({
      user_id: user.id,
      canvas_type,
      op,
    }))
  );

  if (error) console.error("[FLUSH-OPS ERROR]", error);

  return new Response(null, { status: 204 });
}
