import { createClient } from "@/lib/supabase/client";
import type { ChatParticipant } from "@/types/chat";

export async function getChatParticipants(chatId: string): Promise<ChatParticipant[]> {
  const sb = createClient();

  const { data, error } = await sb
    .from("chat_participants")
    .select("id, chat_id, user_id, joined_at")
    .eq("chat_id", chatId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[getChatParticipants]", error);
    return [];
  }

  return data ?? [];
}
