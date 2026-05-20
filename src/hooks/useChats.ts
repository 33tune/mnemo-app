"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/chat";

export type ParticipantProfile = {
  user_id:      string;
  handle:       string;
  display_name: string | null;
  avatar_url:   string | null;
};

export type ChatInfo = {
  chat_id:      string;
  created_at:   string;
  participants: ParticipantProfile[];
  last_message: Message | null;
  unread_count: 0;
};

export function useChats(currentUserId?: string) {
  const [chats,   setChats]   = useState<ChatInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchChats = useCallback(async () => {
    if (!currentUserId) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sb = createClient();

      // ── 1. Chat ids the current user belongs to ──────────────────────────
      const { data: participations, error: partErr } = await sb
        .from("chat_participants")
        .select("chat_id, chats(id, created_at)")
        .eq("user_id", currentUserId);

      if (partErr) throw partErr;
      if (!participations?.length) { setChats([]); return; }

      const chatIds = participations.map(p => p.chat_id);

      // ── 2. All participants across those chats ────────────────────────────
      const { data: allParticipants } = await sb
        .from("chat_participants")
        .select("chat_id, user_id")
        .in("chat_id", chatIds);

      // ── 3. Profile info for all participant user_ids ──────────────────────
      const allUserIds = [...new Set((allParticipants ?? []).map(p => p.user_id))];

      const { data: profilesData } = await sb
        .from("profiles")
        .select("user_id, handle, display_name, avatar_url")
        .in("user_id", allUserIds);

      const profileMap = new Map<string, ParticipantProfile>(
        (profilesData ?? []).map(p => [
          p.user_id,
          { user_id: p.user_id, handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url },
        ])
      );

      // Group participants by chat_id
      const participantsByChatId = new Map<string, ParticipantProfile[]>();
      for (const row of allParticipants ?? []) {
        const prof = profileMap.get(row.user_id);
        if (!prof) continue;
        const list = participantsByChatId.get(row.chat_id) ?? [];
        list.push(prof);
        participantsByChatId.set(row.chat_id, list);
      }

      // ── 4. Most recent message per chat (single query, grouped client-side) ─
      const { data: recentMessages } = await sb
        .from("messages")
        .select("id, chat_id, sender_id, content, image_url, created_at")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false });

      const lastMessageByChatId = new Map<string, Message>();
      for (const msg of recentMessages ?? []) {
        if (!lastMessageByChatId.has(msg.chat_id)) {
          lastMessageByChatId.set(msg.chat_id, msg as Message);
        }
      }

      // ── 5. Assemble result ────────────────────────────────────────────────
      const result: ChatInfo[] = participations.map(p => {
        const chatMeta = p.chats as unknown as { id: string; created_at: string } | null;
        return {
          chat_id:      p.chat_id,
          created_at:   chatMeta?.created_at ?? "",
          participants: participantsByChatId.get(p.chat_id) ?? [],
          last_message: lastMessageByChatId.get(p.chat_id) ?? null,
          unread_count: 0 as const,
        };
      });

      // Sort: most recent activity first
      result.sort((a, b) => {
        const aTime = a.last_message?.created_at ?? a.created_at;
        const bTime = b.last_message?.created_at ?? b.created_at;
        return bTime.localeCompare(aTime);
      });

      if (!cancelledRef.current) setChats(result);
    } catch (e: unknown) {
      if (cancelledRef.current) return;
      const msg = e instanceof Error ? e.message : "Error fetching chats";
      console.error("[useChats]", e);
      setError(msg);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchChats();
    return () => { cancelledRef.current = true; };
  }, [fetchChats]);

  return { chats, loading, error, refreshChats: fetchChats };
}
