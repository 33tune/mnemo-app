import { createClient } from "@/lib/supabase/client";

/**
 * Return the chat_id for an existing 1-to-1 chat between the two users,
 * or create one (with both participant rows) and return its id.
 *
 * Duplicate prevention: we look for any chat where BOTH users are participants
 * and the total participant count is exactly 2 (strict 1-to-1).
 */
export async function openOrCreateChat(
  currentUserId: string,
  targetUserId: string,
): Promise<string> {
  if (currentUserId === targetUserId) {
    throw new Error("Cannot open a chat with yourself.");
  }

  const sb = createClient();

  // ── 1. Find shared chats ───────────────────────────────────────────────────
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    sb.from("chat_participants").select("chat_id").eq("user_id", currentUserId),
    sb.from("chat_participants").select("chat_id").eq("user_id", targetUserId),
  ]);

  const myIds    = new Set((mine  ?? []).map(r => r.chat_id));
  const sharedIds = (theirs ?? []).filter(r => myIds.has(r.chat_id)).map(r => r.chat_id);

  // ── 2. From shared chats, pick one that has exactly 2 participants (1-to-1) ─
  if (sharedIds.length > 0) {
    const { data: counts } = await sb
      .from("chat_participants")
      .select("chat_id")
      .in("chat_id", sharedIds);

    // Group by chat_id and keep the one with exactly 2 rows
    const tally = new Map<string, number>();
    for (const row of counts ?? []) {
      tally.set(row.chat_id, (tally.get(row.chat_id) ?? 0) + 1);
    }

    for (const [chatId, count] of tally.entries()) {
      if (count === 2) return chatId;
    }
  }

  // ── 3. No existing 1-to-1 chat — create one ───────────────────────────────
  const { data: chat, error: chatErr } = await sb
    .from("chats")
    .insert({})
    .select("id")
    .single();

  if (chatErr || !chat) {
    throw new Error(`Failed to create chat: ${chatErr?.message ?? "unknown"}`);
  }

  const { error: partErr } = await sb.from("chat_participants").insert([
    { chat_id: chat.id, user_id: currentUserId },
    { chat_id: chat.id, user_id: targetUserId },
  ]);

  if (partErr) {
    throw new Error(`Failed to add participants: ${partErr.message}`);
  }

  return chat.id;
}
