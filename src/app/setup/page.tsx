import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupFlow from "./SetupFlow";

const MONO = "'Space Mono', monospace";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated → login
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  // Already onboarded → dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((profile as any)?.onboarding_completed === true) redirect("/dashboard");

  // Pre-fill suggested display name from Google OAuth metadata or stored value
  const suggested: string =
    (profile?.display_name as string | null) ??
    ((user.user_metadata?.full_name) as string | undefined) ??
    "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: MONO } as React.CSSProperties}>
      {/* Grain */}
      <div className="grain" style={{ position: "fixed", inset: 0, pointerEvents: "none" }} />

      {/* Grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(232,224,212,0.55)" }} />
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 4, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>MNEMO</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>
          SETUP
        </span>
      </div>

      {/* Card */}
      <div style={{
        position:            "relative",
        zIndex:              1,
        width:               "min(400px, calc(100vw - 40px))",
        padding:             "28px 28px 24px",
        background:          "rgba(255,255,255,0.028)",
        border:              "1px solid rgba(255,255,255,0.09)",
        borderRadius:        8,
        backdropFilter:      "blur(28px)",
        WebkitBackdropFilter:"blur(28px)",
        boxShadow:           "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        <SetupFlow userId={user.id} suggestedDisplayName={suggested} />
      </div>
    </div>
  );
}
