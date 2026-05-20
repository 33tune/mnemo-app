"use client";
import { useState, useCallback } from "react";
import type { ChatInfo } from "@/hooks/useChats";

export function useUnreadCounts(
  chats: ChatInfo[],
  currentUserId: string | undefined,
) {
  // lastSeenAt[chatId] = ISO timestamp when user last viewed that chat
  // Resets to {} on page load — intentional for V1 (shows unread since last session)
  const [lastSeenAt, setLastSeenAt] = useState<Record<string, string>>({});

  const markRead = useCallback((chatId: string) => {
    setLastSeenAt(prev => ({ ...prev, [chatId]: new Date().toISOString() }));
  }, []);

  const unreadCounts: Record<string, number> = {};
  let totalUnread = 0;

  for (const chat of chats) {
    const msg = chat.last_message;
    let count = 0;
    if (msg && msg.sender_id !== currentUserId) {
      const seen = lastSeenAt[chat.chat_id];
      if (!seen || msg.created_at > seen) count = 1;
    }
    unreadCounts[chat.chat_id] = count;
    totalUnread += count;
  }

  return { unreadCounts, totalUnread, markRead };
}
