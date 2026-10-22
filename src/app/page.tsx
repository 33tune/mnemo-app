import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserFast } from "@/lib/supabase/currentUser";
import { LandingClient } from "@/components/site/SiteClients";

// myland.lol: the landing (Claude Design "Landing v9"). Signed in = your sala.
export const metadata: Metadata = {
  title: "myLand — tu tarjeta, tus links, tu mundo",
  description: "myLand: plataforma de tarjetas y perfiles link in bio personalizables y modernas.",
};

export default async function Home() {
  if (await currentUserFast()) redirect("/dashboard");
  return <LandingClient />;
}
