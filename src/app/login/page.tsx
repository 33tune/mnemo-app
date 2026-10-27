import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserFast } from "@/lib/supabase/currentUser";
import { AuthClient } from "@/components/site/SiteClients";

// Entrar / Crear cuenta (Claude Design "Auth v4"): email + password, Google,
// "¿Te la olvidaste?". ?mode=login|register, ?handle=<claimed name>.
export const metadata: Metadata = { title: "myLand — Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Phones too (2026-10-27): they claim their name here; /dashboard then says
  // to build the card on a computer.
  if (await currentUserFast()) redirect("/dashboard");
  const { error } = await searchParams;
  return <AuthClient initialError={error ? "No pudimos iniciar tu sesión. Probá de nuevo." : undefined} />;
}
