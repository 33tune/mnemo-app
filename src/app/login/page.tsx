import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserFast } from "@/lib/supabase/currentUser";
import { headers } from "next/headers";
import { AuthClient } from "@/components/site/SiteClients";
import DesktopOnly from "@/components/site/DesktopOnly";
import { isMobileUserAgent } from "@/lib/deviceGate";

// Entrar / Crear cuenta (Claude Design "Auth v4"): email + password, Google,
// "¿Te la olvidaste?". ?mode=login|register, ?handle=<claimed name>.
export const metadata: Metadata = { title: "myLand — Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Phones only view profiles: no account work there (deviceGate.ts).
  if (isMobileUserAgent((await headers()).get("user-agent"))) return <DesktopOnly />;
  if (await currentUserFast()) redirect("/dashboard");
  const { error } = await searchParams;
  return <AuthClient initialError={error ? "No pudimos iniciar tu sesión. Probá de nuevo." : undefined} />;
}
