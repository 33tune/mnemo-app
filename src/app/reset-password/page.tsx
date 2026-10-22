import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserFast } from "@/lib/supabase/currentUser";
import ResetPasswordForm from "@/components/site/ResetPasswordForm";

// The "¿Te la olvidaste?" email's link signs in (via /auth/callback) and lands here.
export const metadata: Metadata = { title: "myLand — Nueva contraseña" };

export default async function ResetPasswordPage() {
  const user = await currentUserFast(4000);
  if (!user) redirect("/login?mode=login");
  return <ResetPasswordForm email={user.email ?? ""} />;
}
