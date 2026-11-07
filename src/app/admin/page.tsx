import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AdminPanel from "@/components/admin/AdminPanel";

export const metadata: Metadata = { title: "Admin · myLand", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The owner's panel (2026-11-07). Anyone else — signed out or not an admin —
// gets the plain 404: the page doesn't admit it exists. Every action is
// checked again in the database (admin_guard), not only here.
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();
  return <AdminPanel />;
}
