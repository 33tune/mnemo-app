import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserFast } from "@/lib/supabase/currentUser";
import { CrearClient } from "@/components/site/SiteClients";

// The page the TikTok link opens (2026-11-20): one promise and the name claim.
export const metadata: Metadata = {
  title: "myLand — tu perfil, 100 % a tu gusto",
  description: "Las redes te dan el mismo perfil que a todos. En myLand armás tu card y tu sala como quieras. Gratis, en beta abierta.",
};

export default async function Crear() {
  if (await currentUserFast()) redirect("/dashboard");
  return <CrearClient />;
}
