import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "home";

  const { data } = await supabase
    .from("canvases")
    .select("id, data, name, is_public")
    .eq("user_id", user.id)
    .eq("type", type)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ canvas: data });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const queryType = url.searchParams.get("type") ?? "home";

  const body = await request.json();
  const { canvasId, state, name, type: bodyType } = body;
  const canvasType = bodyType ?? queryType;

  if (canvasId) {
    await supabase
      .from("canvases")
      .update({ data: state, name: name ?? "mi espacio", updated_at: new Date().toISOString() })
      .eq("id", canvasId)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  // Buscar canvas existente del mismo tipo
  const { data: existing } = await supabase
    .from("canvases")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", canvasType)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("canvases")
      .update({ data: state, name: name ?? "mi espacio", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return NextResponse.json({ canvasId: existing.id });
  }

  const { data } = await supabase
    .from("canvases")
    .insert({ user_id: user.id, data: state, name: name ?? "mi espacio", is_public: canvasType === "space", type: canvasType })
    .select("id")
    .single();

  return NextResponse.json({ canvasId: data?.id });
}

// POST — usado por navigator.sendBeacon (beforeunload)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const url = new URL(request.url);
  const canvasType = url.searchParams.get("type") ?? "home";

  let state: unknown;
  try {
    const body = await request.json();
    state = body.state;
  } catch {
    return new Response(null, { status: 400 });
  }

  // Buscar canvas existente
  const { data: existing } = await supabase
    .from("canvases")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", canvasType)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("canvases")
      .update({ data: state, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("canvases")
      .insert({ user_id: user.id, data: state, name: "mi espacio", is_public: canvasType === "space", type: canvasType });
  }

  return new Response(null, { status: 204 });
}
