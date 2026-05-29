"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GuestbookMessage } from "@/types";

export function useGuestbook(profileId: string | undefined) {
  const [messages,  setMessages]  = useState<GuestbookMessage[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Track IDs of messages we inserted optimistically — skip when realtime fires
  const pendingInserts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    const sb = createClient();

    sb.from("guestbook_messages")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setMessages((data as GuestbookMessage[]) ?? []);
        setLoading(false);
      });

    const channel = sb
      .channel(`guestbook:${profileId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guestbook_messages", filter: `profile_id=eq.${profileId}` },
        payload => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as GuestbookMessage;
            // Skip if we already added this optimistically
            if (pendingInserts.current.has(newMsg.id)) {
              pendingInserts.current.delete(newMsg.id);
              return;
            }
            setMessages(prev => [newMsg, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setMessages(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [profileId]);

  async function addMessage(
    profileId:    string,
    message:      string,
    authorId:     string | null,
    authorName:   string,
    authorAvatar: string,
    anonymous:    boolean,
  ) {
    const sb = createClient();

    // Optimistic insert — show message immediately
    const tempId  = crypto.randomUUID();
    const tempMsg: GuestbookMessage = {
      id:            tempId,
      profile_id:    profileId,
      author_id:     authorId,
      author_name:   authorName,
      author_avatar: authorAvatar,
      message,
      anonymous,
      created_at:    new Date().toISOString(),
    };
    setMessages(prev => [tempMsg, ...prev]);

    const { data, error } = await sb
      .from("guestbook_messages")
      .insert({ profile_id: profileId, author_id: authorId, author_name: authorName, author_avatar: authorAvatar, message, anonymous })
      .select()
      .single();

    if (error) {
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return error;
    }

    // Swap temp ID for real DB ID; mark real ID as handled so realtime skips it
    if (data) {
      pendingInserts.current.add(data.id);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, created_at: data.created_at } : m));
    }

    return null;
  }

  async function deleteMessage(id: string) {
    const sb = createClient();
    setMessages(prev => prev.filter(m => m.id !== id));
    await sb.from("guestbook_messages").delete().eq("id", id);
  }

  return { messages, loading, addMessage, deleteMessage };
}
