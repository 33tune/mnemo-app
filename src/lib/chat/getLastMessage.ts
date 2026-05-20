import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/chat";

export async function getLastMessage(chatId: string): Promise<Message | null> {
  const sb = createClient();

  const { data, error } = await sb
    .from("messages")
    .select("id, chat_id, sender_id, content, image_url, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLastMessage]", error);
    return null;
  }

  return data ?? null;
}
