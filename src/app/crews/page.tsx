import { redirect } from "next/navigation";

// Crews live in the editor's rail (Crews v2, 2026-10-30); old /crews links
// open that panel.
export default async function CrewsPage({ searchParams }: { searchParams: Promise<{ crew?: string }> }) {
  const { crew } = await searchParams;
  redirect(crew && /^[0-9a-f-]{36}$/.test(crew) ? `/dashboard?crews=${crew}` : "/dashboard?crews");
}
